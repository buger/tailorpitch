import { assertSyncOpen } from "./services/intakeControls";
import { leadIdentity } from "./services/publicEvidence";
import {
  analyzeCompanyWebsite,
  applyCompanyAnalysis,
  analysisHistory,
  analyzeLeadLink,
  applyLeadAnalysis,
} from "./services/analysis";
import { intakeControlsSchema } from "../shared/analysis";
import {
  getIntakeControls,
  saveIntakeControls,
} from "./services/intakeControls";
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, eq, desc, sql, inArray, or } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  db,
  requireCompany,
  requireOwner,
  scopedRow,
  recordActivity,
} from "./services/tenant";
import * as t from "../drizzle/schema";
import {
  brandSchema,
  icpSchema,
  leadInputSchema,
  pageContentSchema,
  channelSchema,
  safeUrl,
} from "../shared/domain";
import {
  publicWebsite,
  apifyRequest,
  startRun,
  syncRun,
  connectApify,
} from "./services/apify";
import { generatePage, generateDraft } from "./services/generation";
import {
  getMailboxStatus,
  connectImap,
  disconnectIntegration,
  startGmail,
  bindGmailStateCookie,
  syncInbox,
  sendMailbox,
} from "./services/mailbox";
import { storagePut } from "./storage";
import { saveIntegration } from "./services/credentials";

import { pipelineConfigSchema } from "../shared/pipeline";
import {
  getPipeline,
  savePipeline,
  togglePipeline,
  tickPipeline,
  selectPipelineLead,
  registerPipelineSchedule,
  retryPipelineJob,
  reconcilePipelineJob,
} from "./services/pipeline";
import {
  startGojiberry,
  bindGojiberryStateCookie,
  statusGojiberry,
  listGojiberryTools,
  testGojiberry,
  disconnectGojiberry,
} from "./services/gojiberry";
import {
  connectManus,
  statusManus,
  disconnectManus,
} from "./services/manusAgent";
import { parse as parseCookie } from "cookie";
const companyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const tenant = await requireCompany(ctx.user);
  return next({ ctx: { ...ctx, ...tenant } });
});
const ownerProcedure = companyProcedure.use(({ ctx, next }) => {
  requireOwner(ctx.role);
  return next({ ctx });
});
const idInput = z.object({ id: z.number().int().positive() });
const tokenInput = z.string().regex(/^[a-f0-9]{48}$/);
const opaque = () => randomBytes(24).toString("hex");
async function assertNotSuppressed(
  companyId: number,
  lead: typeof t.leads.$inferSelect
) {
  if (lead.status === "suppressed")
    throw new Error("This lead has opted out. Outreach is blocked.");
  if (lead.email) {
    const [row] = await (
      await db()
    )
      .select()
      .from(t.suppressions)
      .where(
        and(
          eq(t.suppressions.companyId, companyId),
          eq(t.suppressions.email, lead.email.toLowerCase()),
          eq(t.suppressions.active, 1)
        )
      )
      .limit(1);
    if (row)
      throw new Error("This contact has opted out. Outreach is blocked.");
  }
}
async function reconcileInterruptedSends(companyId: number) {
  await (
    await db()
  )
    .update(t.outreach)
    .set({
      status: "unknown",
      error:
        "Sending was interrupted. Check your Sent folder/provider before creating another message; no automatic retry.",
    })
    .where(
      and(
        eq(t.outreach.companyId, companyId),
        eq(t.outreach.status, "sending"),
        sql`${t.outreach.updatedAt} < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
      )
    );
}

const consentText =
  "I agree to receive occasional TailorPitch updates. You can unsubscribe anytime.";
const publicSubmission = z.object({
  email: z.string().email().max(320),
  consent: z.literal(true),
  website: z.string().max(200).default(""),
});
const originSchema = z.union([
  z.literal(""),
  safeUrl.refine(s => {
    const u = new URL(s);
    return u.pathname === "/" && !u.search && !u.hash;
  }, "Use an HTTPS origin, without a path"),
]);
const throttles = new Map<string, { count: number; until: number }>();
function throttle(key: string, max = 12) {
  const now = Date.now();
  let item = throttles.get(key);
  if (!item || item.until < now) {
    item = { count: 0, until: now + 60000 };
    throttles.set(key, item);
  }
  if (++item.count > max)
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Please wait a minute before trying again.",
    });
  if (throttles.size > 5000)
    for (const [k, v] of throttles) if (v.until < now) throttles.delete(k);
}
function ipKey(req: any) {
  return `${req.ip ?? "visitor"}`;
}
async function publicPage(token: string) {
  const d = await db();
  const [row] = await d
    .select({
      page: t.pages,
      company: { name: t.companies.name, website: t.companies.website },
      lead: { companyName: t.leads.companyName },
    })
    .from(t.pages)
    .innerJoin(t.companies, eq(t.companies.id, t.pages.companyId))
    .innerJoin(
      t.leads,
      and(
        eq(t.leads.id, t.pages.leadId),
        eq(t.leads.companyId, t.pages.companyId)
      )
    )
    .where(and(eq(t.pages.shareToken, token), eq(t.pages.status, "published")))
    .limit(1);
  if (!row)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "This page is not available.",
    });
  return row;
}

export const appRouter = router({
  pipeline: router({
    get: companyProcedure.query(({ ctx }) => getPipeline(ctx.company.id)),
    save: ownerProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          config: pipelineConfigSchema,
        })
      )
      .mutation(({ ctx, input }) =>
        savePipeline(ctx.company.id, input.name, input.config)
      ),
    toggle: ownerProcedure
      .input(z.object({ enabled: z.boolean() }))
      .mutation(({ ctx, input }) =>
        togglePipeline(
          ctx.company.id,
          input.enabled,
          parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? ""
        )
      ),
    tick: ownerProcedure.mutation(({ ctx }) => tickPipeline(ctx.company.id)),
    select: ownerProcedure
      .input(
        z.object({ leadId: z.number().int().positive(), selected: z.boolean() })
      )
      .mutation(({ ctx, input }) =>
        selectPipelineLead(ctx.company.id, input.leadId, input.selected)
      ),
    retry: ownerProcedure
      .input(z.object({ jobId: z.number().int().positive() }))
      .mutation(({ ctx, input }) =>
        retryPipelineJob(ctx.company.id, input.jobId)
      ),
    reconcile: ownerProcedure
      .input(
        z.object({
          jobId: z.number().int().positive(),
          sourceRunId: z.number().int().positive().optional(),
          manusTaskId: z.string().min(1).max(100).optional(),
        })
      )
      .mutation(({ ctx, input }) =>
        reconcilePipelineJob(
          ctx.company.id,
          input.jobId,
          input.sourceRunId,
          input.manusTaskId
        )
      ),
    registerSchedule: ownerProcedure.mutation(({ ctx }) =>
      registerPipelineSchedule(
        ctx.company.id,
        parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? ""
      )
    ),
  }),
  gojiberry: router({
    status: companyProcedure.query(({ ctx }) =>
      statusGojiberry(ctx.company.id)
    ),
    connect: ownerProcedure
      .input(z.object({ origin: z.string().url() }))
      .mutation(async ({ ctx, input }) => {
        const r = await startGojiberry(
          ctx.company.id,
          ctx.user.id,
          input.origin
        );
        bindGojiberryStateCookie(ctx.res, r.state, input.origin);
        return { url: r.url };
      }),
    listTools: ownerProcedure.query(({ ctx }) =>
      listGojiberryTools(ctx.company.id)
    ),
    test: ownerProcedure
      .input(
        z.object({
          name: z.string().min(1).max(200),
          args: z.record(z.string(), z.unknown()),
        })
      )
      .mutation(({ ctx, input }) => testGojiberry(ctx.company.id, input)),
    disconnect: ownerProcedure.mutation(async ({ ctx }) => {
      await disconnectGojiberry(ctx.company.id);
      return { success: true };
    }),
  }),
  manus: router({
    status: companyProcedure.query(({ ctx }) => statusManus(ctx.company.id)),
    connect: ownerProcedure
      .input(z.object({ apiKey: z.string().min(10).max(1000) }))
      .mutation(({ ctx, input }) => connectManus(ctx.company.id, input.apiKey)),
    test: ownerProcedure.mutation(async ({ ctx }) => {
      const saved = await import("./services/credentials").then(m =>
        m.getIntegration<{ apiKey: string }>(ctx.company.id, "manus")
      );
      if (!saved) throw new Error("Connect your Manus account first.");
      return connectManus(ctx.company.id, saved.config.apiKey);
    }),
    disconnect: ownerProcedure.mutation(({ ctx }) =>
      disconnectManus(ctx.company.id)
    ),
  }),
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: -1,
      });
      return { success: true };
    }),
  }),
  intake: router({
    get: companyProcedure.query(({ ctx }) => getIntakeControls(ctx.company.id)),
    save: ownerProcedure
      .input(intakeControlsSchema)
      .mutation(({ ctx, input }) => saveIntakeControls(ctx.company.id, input)),
  }),
  analysis: router({
    history: companyProcedure.query(({ ctx }) =>
      analysisHistory(ctx.company.id)
    ),
    company: ownerProcedure
      .input(z.object({ url: safeUrl }))
      .mutation(({ ctx, input }) => {
        throttle(`analysis:${ctx.user.id}`, 3);
        return analyzeCompanyWebsite(ctx.company, input.url);
      }),
    applyCompany: ownerProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          companyName: z.string().min(2).max(200),
          website: safeUrl,
          brand: brandSchema,
          icps: z.array(icpSchema).max(3),
        })
      )
      .mutation(({ ctx, input }) =>
        applyCompanyAnalysis(ctx.company.id, input)
      ),
    lead: companyProcedure
      .input(
        z.object({
          url: safeUrl,
          icpId: z.number().int().positive().nullable(),
        })
      )
      .mutation(({ ctx, input }) => {
        throttle(`analysis:${ctx.user.id}`, 3);
        return analyzeLeadLink(ctx.company, input.url, input.icpId);
      }),
    applyLead: companyProcedure
      .input(
        z.object({ id: z.number().int().positive(), lead: leadInputSchema })
      )
      .mutation(({ ctx, input }) => applyLeadAnalysis(ctx.company.id, input)),
  }),
  workspace: router({
    get: companyProcedure.query(async ({ ctx }) => {
      const d = await db(),
        companyId = ctx.company.id;
      const [[l], [p], [o], [s], assets, recent] = await Promise.all([
        d
          .select({
            total: sql<number>`count(*)`,
            qualified: sql<number>`sum(${t.leads.status} = 'qualified')`,
          })
          .from(t.leads)
          .where(eq(t.leads.companyId, companyId)),
        d
          .select({ total: sql<number>`count(*)` })
          .from(t.pages)
          .where(eq(t.pages.companyId, companyId)),
        d
          .select({ total: sql<number>`count(*)` })
          .from(t.outreach)
          .where(eq(t.outreach.companyId, companyId)),
        d
          .select({ total: sql<number>`count(*)` })
          .from(t.submissions)
          .where(eq(t.submissions.companyId, companyId)),
        d
          .select()
          .from(t.brandAssets)
          .where(eq(t.brandAssets.companyId, companyId))
          .orderBy(desc(t.brandAssets.id)),
        d
          .select()
          .from(t.activity)
          .where(eq(t.activity.companyId, companyId))
          .orderBy(desc(t.activity.id))
          .limit(8),
      ]);
      return {
        company: ctx.company,
        role: ctx.role,
        assets,
        recent,
        stats: {
          leads: Number(l.total),
          qualified: Number(l.qualified ?? 0),
          pages: Number(p.total),
          outreach: Number(o.total),
          submissions: Number(s.total),
        },
      };
    }),
    saveBrand: ownerProcedure
      .input(z.object({ brand: brandSchema, publicOrigin: originSchema }))
      .mutation(async ({ ctx, input }) => {
        if (input.publicOrigin) publicWebsite(input.publicOrigin);
        if (
          input.brand.logoUrl &&
          !input.brand.logoUrl.startsWith("/manus-storage/")
        )
          safeUrl.parse(input.brand.logoUrl);
        await (
          await db()
        )
          .update(t.companies)
          .set({
            brand: input.brand,
            publicOrigin: input.publicOrigin
              ? new URL(input.publicOrigin).origin
              : null,
          })
          .where(eq(t.companies.id, ctx.company.id));
        await recordActivity(
          ctx.company.id,
          "Company brand, voice and generation instructions updated.",
          "brand"
        );
        return { success: true };
      }),
    uploadAsset: ownerProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          mime: z.enum(["image/png", "image/jpeg", "image/webp"]),
          base64: z.string().max(7 * 1024 * 1024),
          note: z.string().max(2000).default(""),
        })
      )
      .mutation(async ({ ctx, input }) => {
        throttle(`upload:${ctx.user.id}`, 6);
        const data = Buffer.from(input.base64, "base64");
        if (!data.length || data.length > 5 * 1024 * 1024)
          throw new Error("Choose an image smaller than 5 MB.");
        const isPng = data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const isJpeg = data[0] === 255 && data[1] === 216 && data[2] === 255;
        const isWebp =
          data.subarray(0, 4).toString() === "RIFF" &&
          data.subarray(8, 12).toString() === "WEBP";
        if (
          !(
            (input.mime === "image/png" && isPng) ||
            (input.mime === "image/jpeg" && isJpeg) ||
            (input.mime === "image/webp" && isWebp)
          )
        )
          throw new Error("The file content does not match its image type.");
        const count = await (
          await db()
        )
          .select({ n: sql<number>`count(*)` })
          .from(t.brandAssets)
          .where(eq(t.brandAssets.companyId, ctx.company.id));
        if (Number(count[0].n) >= 12)
          throw new Error(
            "Keep up to 12 brand assets. Hide an existing asset first."
          );
        const saved = await storagePut(
          `company-${ctx.company.id}/brand/${opaque()}.${input.mime.split("/")[1]}`,
          data,
          input.mime
        );
        const d = await db();
        const [result] = await d.insert(t.brandAssets).values({
          companyId: ctx.company.id,
          name: input.name,
          key: saved.key,
          url: saved.url,
          mime: input.mime,
          note: input.note,
        });
        return scopedRow<typeof t.brandAssets.$inferSelect>(
          t.brandAssets,
          result.insertId,
          ctx.company.id
        );
      }),
    removeAsset: ownerProcedure
      .input(idInput)
      .mutation(async ({ ctx, input }) => {
        await scopedRow(t.brandAssets, input.id, ctx.company.id);
        await (await db())
          .delete(t.brandAssets)
          .where(
            and(
              eq(t.brandAssets.id, input.id),
              eq(t.brandAssets.companyId, ctx.company.id)
            )
          );
        return { success: true };
      }),
  }),
  icps: router({
    list: companyProcedure.query(async ({ ctx }) =>
      (await db())
        .select()
        .from(t.icps)
        .where(eq(t.icps.companyId, ctx.company.id))
        .orderBy(desc(t.icps.id))
    ),
    save: companyProcedure
      .input(
        z.object({
          id: z.number().int().positive().optional(),
          criteria: icpSchema,
        })
      )
      .mutation(async ({ ctx, input }) => {
        const d = await db();
        if (input.id) {
          await scopedRow(t.icps, input.id, ctx.company.id);
          await d
            .update(t.icps)
            .set({ criteria: input.criteria })
            .where(
              and(eq(t.icps.id, input.id), eq(t.icps.companyId, ctx.company.id))
            );
          return { id: input.id };
        }
        const [r] = await d
          .insert(t.icps)
          .values({ companyId: ctx.company.id, criteria: input.criteria });
        await recordActivity(
          ctx.company.id,
          `ICP created: ${input.criteria.name}`,
          "icp"
        );
        return { id: r.insertId };
      }),
  }),
  leads: router({
    list: companyProcedure.query(async ({ ctx }) => {
      const d = await db();
      const [leadRows, profiles, pageRows] = await Promise.all([
        d
          .select()
          .from(t.leads)
          .where(eq(t.leads.companyId, ctx.company.id))
          .orderBy(desc(t.leads.id)),
        d.select().from(t.icps).where(eq(t.icps.companyId, ctx.company.id)),
        d
          .select({ leadId: t.pages.leadId })
          .from(t.pages)
          .where(eq(t.pages.companyId, ctx.company.id)),
      ]);
      return leadRows.map(lead => ({
        ...lead,
        icpName: profiles.find(p => p.id === lead.icpId)?.criteria.name,
        pageCount: pageRows.filter(p => p.leadId === lead.id).length,
      }));
    }),
    get: companyProcedure.input(idInput).query(async ({ ctx, input }) => {
      const d = await db(),
        lead = await scopedRow<typeof t.leads.$inferSelect>(
          t.leads,
          input.id,
          ctx.company.id
        );
      const [icp, pages, drafts, activity, runs] = await Promise.all([
        lead.icpId
          ? scopedRow<typeof t.icps.$inferSelect>(
              t.icps,
              lead.icpId,
              ctx.company.id
            )
          : null,
        d
          .select()
          .from(t.pages)
          .where(
            and(
              eq(t.pages.companyId, ctx.company.id),
              eq(t.pages.leadId, input.id)
            )
          )
          .orderBy(desc(t.pages.id)),
        d
          .select()
          .from(t.outreach)
          .where(
            and(
              eq(t.outreach.companyId, ctx.company.id),
              eq(t.outreach.leadId, input.id)
            )
          )
          .orderBy(desc(t.outreach.id)),
        d
          .select()
          .from(t.activity)
          .where(
            and(
              eq(t.activity.companyId, ctx.company.id),
              eq(t.activity.leadId, input.id)
            )
          )
          .orderBy(desc(t.activity.id)),
        d
          .select()
          .from(t.sourcingRuns)
          .where(
            and(
              eq(t.sourcingRuns.companyId, ctx.company.id),
              eq(t.sourcingRuns.leadId, input.id)
            )
          )
          .orderBy(desc(t.sourcingRuns.id)),
      ]);
      return { lead, icp, pages, drafts, activity, runs };
    }),
    add: companyProcedure
      .input(leadInputSchema)
      .mutation(async ({ ctx, input }) => {
        const u = publicWebsite(input.website);
        if (input.icpId) await scopedRow(t.icps, input.icpId, ctx.company.id);
        const d = await db(),
          domain = leadIdentity(input.website);
        const [old] = await d
          .select()
          .from(t.leads)
          .where(
            and(
              eq(t.leads.companyId, ctx.company.id),
              eq(t.leads.domain, domain)
            )
          )
          .limit(1);
        if (old)
          throw new TRPCError({
            code: "CONFLICT",
            message: "A lead for this company website already exists.",
          });
        const [r] = await d.insert(t.leads).values({
          ...input,
          email: input.email.toLowerCase(),
          companyId: ctx.company.id,
          domain,
          sourceUrl: input.website,
        });
        await recordActivity(
          ctx.company.id,
          `Lead added: ${input.companyName}`,
          "lead",
          r.insertId
        );
        return { id: r.insertId };
      }),
    update: companyProcedure
      .input(leadInputSchema.extend({ id: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const lead = await scopedRow<typeof t.leads.$inferSelect>(
          t.leads,
          input.id,
          ctx.company.id
        );
        const u = publicWebsite(input.website);
        if (input.icpId) await scopedRow(t.icps, input.icpId, ctx.company.id);
        const { id, ...fields } = input;
        await (
          await db()
        )
          .update(t.leads)
          .set({
            ...fields,
            email: fields.email.toLowerCase(),
            domain: leadIdentity(input.website),
            ...(lead.website !== input.website || lead.icpId !== input.icpId
              ? {
                  research: null,
                  pipelineSelectedAt: null,
                  score: null,
                  status: (lead.status === "suppressed"
                    ? "suppressed"
                    : "new") as typeof lead.status,
                  researchedAt: null,
                }
              : {}),
          })
          .where(
            and(eq(t.leads.id, id), eq(t.leads.companyId, ctx.company.id))
          );
        return { success: true };
      }),
    research: companyProcedure
      .input(idInput)
      .mutation(async ({ ctx, input }) => {
        throttle(`research:${ctx.user.id}`, 4);
        const r = await startRun(ctx.company.id, { leadId: input.id });
        return { runId: r.id };
      }),
    suppress: companyProcedure
      .input(idInput)
      .mutation(async ({ ctx, input }) => {
        const lead = await scopedRow<typeof t.leads.$inferSelect>(
          t.leads,
          input.id,
          ctx.company.id
        );
        await (
          await db()
        )
          .update(t.leads)
          .set({ status: "suppressed" })
          .where(
            and(eq(t.leads.id, input.id), eq(t.leads.companyId, ctx.company.id))
          );
        if (lead.email)
          await (
            await db()
          )
            .insert(t.suppressions)
            .values({
              companyId: ctx.company.id,
              email: lead.email.toLowerCase(),
              token: opaque(),
              active: 1,
            })
            .onDuplicateKeyUpdate({ set: { active: 1 } });
        await recordActivity(
          ctx.company.id,
          `Outreach suppressed for ${lead.companyName}`,
          "suppressed",
          lead.id
        );
        return { success: true };
      }),
  }),
  runs: router({
    reconcile: ownerProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          externalId: z
            .string()
            .regex(/^[A-Za-z0-9]+$/)
            .max(100)
            .optional(),
          confirmedNoRun: z.boolean().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await assertSyncOpen(ctx.company.id);
        const run = await scopedRow<typeof t.sourcingRuns.$inferSelect>(
          t.sourcingRuns,
          input.id,
          ctx.company.id
        );
        if (!["UNKNOWN", "STARTING"].includes(run.status) || run.externalId)
          throw new Error(
            "Only an interrupted run without an external ID can be reconciled."
          );
        if (input.externalId) {
          const { data } = await apifyRequest(
            ctx.company.id,
            `actor-runs/${input.externalId}`
          );
          const { data: actor } = await apifyRequest(
            ctx.company.id,
            `actors/${run.type === "research" ? "apify~website-content-crawler" : "apify~google-search-scraper"}`
          );
          if (data.actId !== actor.id)
            throw new Error("This Apify run belongs to a different actor.");
          await (
            await db()
          )
            .update(t.sourcingRuns)
            .set({
              externalId: data.id,
              datasetId: data.defaultDatasetId,
              status: data.status,
              error: null,
            })
            .where(
              and(
                eq(t.sourcingRuns.id, run.id),
                eq(t.sourcingRuns.companyId, ctx.company.id)
              )
            );
        } else if (input.confirmedNoRun) {
          await (
            await db()
          )
            .update(t.sourcingRuns)
            .set({
              status: "FAILED",
              error:
                "Owner checked Apify history and confirmed no external run exists.",
              completedAt: new Date(),
            })
            .where(
              and(
                eq(t.sourcingRuns.id, run.id),
                eq(t.sourcingRuns.companyId, ctx.company.id)
              )
            );
        } else
          throw new Error(
            "Enter the matching Apify run ID or confirm no run exists."
          );
        return { success: true };
      }),
    list: companyProcedure.query(async ({ ctx }) =>
      (await db())
        .select()
        .from(t.sourcingRuns)
        .where(eq(t.sourcingRuns.companyId, ctx.company.id))
        .orderBy(desc(t.sourcingRuns.id))
        .limit(50)
    ),
    start: companyProcedure
      .input(
        z.object({
          icpId: z.number().int().positive(),
          query: z.string().min(3).max(1500),
          limit: z.number().int().min(1).max(30),
        })
      )
      .mutation(async ({ ctx, input }) => {
        throttle(`run:${ctx.user.id}`, 3);
        return startRun(ctx.company.id, input);
      }),
    sync: companyProcedure.input(idInput).mutation(async ({ ctx, input }) => {
      throttle(`sync:${ctx.company.id}:${input.id}`, 8);
      return syncRun(ctx.company.id, input.id);
    }),
  }),
  pages: router({
    list: companyProcedure.query(async ({ ctx }) => {
      const rows = await (
        await db()
      )
        .select({ page: t.pages, companyName: t.leads.companyName })
        .from(t.pages)
        .innerJoin(
          t.leads,
          and(
            eq(t.leads.id, t.pages.leadId),
            eq(t.leads.companyId, t.pages.companyId)
          )
        )
        .where(eq(t.pages.companyId, ctx.company.id))
        .orderBy(desc(t.pages.id));
      return rows.map(r => ({ ...r.page, companyName: r.companyName }));
    }),
    get: companyProcedure.input(idInput).query(async ({ ctx, input }) => {
      const page = await scopedRow<typeof t.pages.$inferSelect>(
        t.pages,
        input.id,
        ctx.company.id
      );
      const lead = await scopedRow<typeof t.leads.$inferSelect>(
        t.leads,
        page.leadId,
        ctx.company.id
      );
      return { page, lead, company: ctx.company };
    }),
    generate: companyProcedure
      .input(z.object({ leadId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        throttle(`page:${ctx.user.id}`, 3);
        const lead = await scopedRow<typeof t.leads.$inferSelect>(
          t.leads,
          input.leadId,
          ctx.company.id
        );
        await assertNotSuppressed(ctx.company.id, lead);
        const content = await generatePage(lead, ctx.company);
        const d = await db();
        const id = await d.transaction(async tx => {
          const [current] = await tx
            .select()
            .from(t.leads)
            .where(
              and(
                eq(t.leads.id, lead.id),
                eq(t.leads.companyId, ctx.company.id)
              )
            )
            .for("update");
          await assertNotSuppressed(ctx.company.id, current);
          if (
            !current.research ||
            current.updatedAt.getTime() !== lead.updatedAt.getTime()
          )
            throw new Error(
              "Lead research changed during generation. No stale page draft was saved."
            );
          const [r] = await tx
            .insert(t.pages)
            .values({
              companyId: ctx.company.id,
              leadId: lead.id,
              shareToken: opaque(),
              title: `${ctx.company.name} for ${lead.companyName}`.slice(
                0,
                200
              ),
              content,
              brandSnapshot: ctx.company.brand,
            });
          await tx
            .update(t.leads)
            .set({ status: "page_ready" })
            .where(
              and(
                eq(t.leads.id, lead.id),
                eq(t.leads.companyId, ctx.company.id),
                sql`${t.leads.status} <> 'suppressed'`
              )
            );
          return r.insertId;
        });
        await recordActivity(
          ctx.company.id,
          `Personalized page draft created for ${lead.companyName}`,
          "page",
          lead.id
        );
        return { id };
      }),
    save: companyProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          content: pageContentSchema,
          title: z.string().min(2).max(200),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const page = await scopedRow<typeof t.pages.$inferSelect>(
          t.pages,
          input.id,
          ctx.company.id
        );
        if (page.status === "published")
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Unpublish this page before editing the public content.",
          });
        await (
          await db()
        )
          .update(t.pages)
          .set({ content: input.content, title: input.title })
          .where(
            and(eq(t.pages.id, input.id), eq(t.pages.companyId, ctx.company.id))
          );
        return { success: true };
      }),
    setPublished: companyProcedure
      .input(
        z.object({ id: z.number().int().positive(), published: z.boolean() })
      )
      .mutation(async ({ ctx, input }) => {
        const page = await scopedRow<typeof t.pages.$inferSelect>(
          t.pages,
          input.id,
          ctx.company.id
        );
        await (
          await db()
        )
          .update(t.pages)
          .set({ status: input.published ? "published" : "draft" })
          .where(
            and(eq(t.pages.id, input.id), eq(t.pages.companyId, ctx.company.id))
          );
        await recordActivity(
          ctx.company.id,
          `${input.published ? "Published" : "Unpublished"} ${page.title}`,
          "page",
          page.leadId
        );
        return { success: true };
      }),
  }),
  outreach: router({
    list: companyProcedure.query(async ({ ctx }) => {
      await reconcileInterruptedSends(ctx.company.id);
      const rows = await (
        await db()
      )
        .select({ draft: t.outreach, companyName: t.leads.companyName })
        .from(t.outreach)
        .innerJoin(
          t.leads,
          and(
            eq(t.leads.id, t.outreach.leadId),
            eq(t.leads.companyId, t.outreach.companyId)
          )
        )
        .where(eq(t.outreach.companyId, ctx.company.id))
        .orderBy(desc(t.outreach.id));
      return rows.map(r => ({ ...r.draft, companyName: r.companyName }));
    }),
    generate: companyProcedure
      .input(
        z.object({
          leadId: z.number().int().positive(),
          channel: channelSchema,
          pageId: z.number().int().positive().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        throttle(`draft:${ctx.user.id}`, 5);
        const lead = await scopedRow<typeof t.leads.$inferSelect>(
          t.leads,
          input.leadId,
          ctx.company.id
        );
        if (lead.status === "suppressed")
          throw new Error("This lead is suppressed. Do not create outreach.");
        const page = input.pageId
          ? await scopedRow<typeof t.pages.$inferSelect>(
              t.pages,
              input.pageId,
              ctx.company.id
            )
          : null;
        if (page && (page.leadId !== lead.id || page.status !== "published"))
          throw new Error("Choose a published page for this lead.");
        if (page && !ctx.company.publicOrigin)
          throw new Error(
            "Set your public sharing origin in Domain settings before including a page in outreach."
          );
        const draft = await generateDraft(
          lead,
          ctx.company,
          input.channel,
          page
        );
        if (page && draft.body.split("[PERSONALIZED_PAGE_URL]").length !== 2)
          throw new Error(
            "AI draft did not include exactly one personalized page link. Please regenerate."
          );
        if (!page && !draft.body.includes(ctx.company.brand.bookingUrl))
          throw new Error(
            "AI draft omitted your approved next-step URL. Please regenerate."
          );
        await assertNotSuppressed(ctx.company.id, lead);
        const body = page
          ? draft.body.replaceAll(
              "[PERSONALIZED_PAGE_URL]",
              `${ctx.company.publicOrigin}/p/${page.shareToken}`
            )
          : draft.body;
        const recipient =
          input.channel === "email"
            ? lead.email
            : input.channel === "linkedin"
              ? lead.linkedinUrl
              : lead.xUrl;
        const [r] = await (await db()).insert(t.outreach).values({
          companyId: ctx.company.id,
          leadId: lead.id,
          pageId: page?.id,
          channel: input.channel,
          recipient,
          subject: draft.subject,
          body,
          rationale: draft.rationale,
        });
        await recordActivity(
          ctx.company.id,
          `${input.channel} draft created for ${lead.companyName}`,
          "draft",
          lead.id
        );
        return { id: r.insertId };
      }),
    save: companyProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          recipient: z.string().max(2000),
          subject: z.string().max(240),
          body: z.string().min(5).max(8000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const draft = await scopedRow<typeof t.outreach.$inferSelect>(
          t.outreach,
          input.id,
          ctx.company.id
        );
        if (!["draft", "failed"].includes(draft.status))
          throw new Error("Only an unsent draft can be edited.");
        if (draft.channel === "email" && input.recipient)
          z.string().email().parse(input.recipient);
        if (draft.channel !== "email" && input.recipient)
          safeUrl.parse(input.recipient);
        if (/[\r\n]/.test(input.subject))
          throw new Error("Use a single-line subject.");
        await (
          await db()
        )
          .update(t.outreach)
          .set({
            recipient: input.recipient,
            subject: input.subject,
            body: input.body,
            status: "draft",
            error: null,
          })
          .where(
            and(
              eq(t.outreach.id, input.id),
              eq(t.outreach.companyId, ctx.company.id)
            )
          );
        return { success: true };
      }),
    prepareSend: companyProcedure
      .input(idInput)
      .query(async ({ ctx, input }) => {
        const d = await db();
        const draft = await scopedRow<typeof t.outreach.$inferSelect>(
          t.outreach,
          input.id,
          ctx.company.id
        );
        if (draft.channel !== "email" || draft.status !== "draft")
          throw new Error("Save an unsent email draft before reviewing it.");
        if (!ctx.company.publicOrigin)
          throw new Error(
            "Set an HTTPS public origin in Domain settings first."
          );
        const mailbox = await getMailboxStatus(ctx.company.id);
        if (!mailbox.mailbox.connected)
          throw new Error("Connect Gmail or IMAP/SMTP in settings first.");
        z.string().email().parse(draft.recipient);
        const lead = await scopedRow<typeof t.leads.$inferSelect>(
          t.leads,
          draft.leadId,
          ctx.company.id
        );
        if (lead.status === "suppressed")
          throw new Error("This lead is suppressed.");
        await d
          .insert(t.suppressions)
          .values({
            companyId: ctx.company.id,
            email: draft.recipient.toLowerCase(),
            token: opaque(),
          })
          .onDuplicateKeyUpdate({
            set: { email: draft.recipient.toLowerCase() },
          });
        const [optout] = await d
          .select()
          .from(t.suppressions)
          .where(
            and(
              eq(t.suppressions.companyId, ctx.company.id),
              eq(t.suppressions.email, draft.recipient.toLowerCase())
            )
          )
          .limit(1);
        if (optout.active) throw new Error("This recipient has opted out.");
        const unsubscribeUrl = `${ctx.company.publicOrigin}/unsubscribe/${optout.token}`;
        return {
          from: mailbox.mailbox.displayName ?? "",
          to: draft.recipient,
          subject: draft.subject,
          body: `${draft.body}\n\nOpt out: ${unsubscribeUrl}`,
          unsubscribeUrl,
          fingerprint: createHash("sha256")
            .update(
              JSON.stringify({
                from: mailbox.mailbox.displayName ?? "",
                to: draft.recipient,
                subject: draft.subject,
                body: `${draft.body}\n\nOpt out: ${unsubscribeUrl}`,
              })
            )
            .digest("hex"),
        };
      }),
    send: companyProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          confirmed: z.literal(true),
          fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
        })
      )
      .mutation(async ({ ctx, input }) => {
        throttle(`send:${ctx.company.id}`, 5);
        const d = await db(),
          draft = await scopedRow<typeof t.outreach.$inferSelect>(
            t.outreach,
            input.id,
            ctx.company.id
          );
        if (draft.channel !== "email")
          throw new Error("This channel uses manual outreach in the pilot.");
        if (draft.status !== "draft")
          throw new Error(
            "This draft is not available to send. Check its current status."
          );
        z.string().email().parse(draft.recipient);
        if (!draft.subject || /[\r\n]/.test(draft.subject))
          throw new Error("Add a valid single-line subject.");
        const lead = await scopedRow<typeof t.leads.$inferSelect>(
          t.leads,
          draft.leadId,
          ctx.company.id
        );
        if (lead.status === "suppressed")
          throw new Error("This lead has opted out. Sending is blocked.");
        const email = draft.recipient.toLowerCase();
        const [suppressed] = await d
          .select()
          .from(t.suppressions)
          .where(
            and(
              eq(t.suppressions.companyId, ctx.company.id),
              eq(t.suppressions.email, email),
              eq(t.suppressions.active, 1)
            )
          )
          .limit(1);
        if (suppressed)
          throw new Error("This recipient has opted out. Sending is blocked.");
        const mailbox = await getMailboxStatus(ctx.company.id);
        if (!mailbox.mailbox.connected)
          throw new Error("Connect Gmail or IMAP/SMTP in settings first.");
        if (!ctx.company.publicOrigin)
          throw new Error(
            "Set an HTTPS public origin in Domain settings so the email has a working opt-out link."
          );
        if (draft.pageId) {
          const page = await scopedRow<typeof t.pages.$inferSelect>(
            t.pages,
            draft.pageId,
            ctx.company.id
          );
          if (page.status !== "published")
            throw new Error(
              "The linked landing page is no longer published. Edit the draft before sending."
            );
        }
        await d
          .insert(t.suppressions)
          .values({ companyId: ctx.company.id, email, token: opaque() })
          .onDuplicateKeyUpdate({ set: { email } });
        const [optout] = await d
          .select()
          .from(t.suppressions)
          .where(
            and(
              eq(t.suppressions.companyId, ctx.company.id),
              eq(t.suppressions.email, email)
            )
          )
          .limit(1);
        const unsubscribeUrl = `${ctx.company.publicOrigin}/unsubscribe/${optout.token}`;
        const fingerprint = createHash("sha256")
          .update(
            JSON.stringify({
              from: mailbox.mailbox.displayName ?? "",
              to: draft.recipient,
              subject: draft.subject,
              body: `${draft.body}\n\nOpt out: ${unsubscribeUrl}`,
            })
          )
          .digest("hex");
        if (input.fingerprint !== fingerprint)
          throw new Error(
            "This email changed after review. Refresh the exact payload before sending."
          );
        const [lock] = await d
          .update(t.outreach)
          .set({ status: "sending" })
          .where(
            and(
              eq(t.outreach.id, draft.id),
              eq(t.outreach.companyId, ctx.company.id),
              eq(t.outreach.status, "draft"),
              eq(t.outreach.recipient, draft.recipient),
              eq(t.outreach.subject, draft.subject),
              eq(t.outreach.body, draft.body)
            )
          );
        if (!lock.affectedRows)
          throw new Error("This draft is already being sent.");
        try {
          const result = await sendMailbox(ctx.company.id, {
            to: draft.recipient,
            subject: draft.subject,
            body: `${draft.body}\n\nOpt out: ${unsubscribeUrl}`,
            unsubscribeUrl,
            messageKey: `leadloom-${ctx.company.id}-${draft.id}`,
          });
          await d
            .update(t.outreach)
            .set({
              status: "accepted",
              providerId: result.providerId,
              sentAt: new Date(),
              error: null,
            })
            .where(
              and(
                eq(t.outreach.id, draft.id),
                eq(t.outreach.companyId, ctx.company.id)
              )
            );
          await d
            .update(t.leads)
            .set({ status: "contacted" })
            .where(
              and(
                eq(t.leads.id, lead.id),
                eq(t.leads.companyId, ctx.company.id),
                sql`${t.leads.status} <> 'suppressed'`
              )
            );
          await recordActivity(
            ctx.company.id,
            `Email to ${draft.recipient} accepted by ${result.provider}. Delivery is not yet confirmed.`,
            "email",
            lead.id
          );
          return { success: true };
        } catch {
          await d
            .update(t.outreach)
            .set({
              status: "unknown",
              error:
                "Provider result could not be confirmed. Check your Sent folder before retrying; automatic retry is disabled.",
            })
            .where(
              and(
                eq(t.outreach.id, draft.id),
                eq(t.outreach.companyId, ctx.company.id)
              )
            );
          throw new Error(
            "Sending result is uncertain. Check your Sent folder before trying another message."
          );
        }
      }),
    manual: companyProcedure.input(idInput).mutation(async ({ ctx, input }) => {
      const draft = await scopedRow<typeof t.outreach.$inferSelect>(
        t.outreach,
        input.id,
        ctx.company.id
      );
      if (draft.channel === "email" || draft.status !== "draft")
        throw new Error(
          "Only an unsent social draft can be marked manually sent."
        );
      const lead = await scopedRow<typeof t.leads.$inferSelect>(
        t.leads,
        draft.leadId,
        ctx.company.id
      );
      if (lead.status === "suppressed")
        throw new Error("This lead is suppressed.");
      await assertNotSuppressed(ctx.company.id, lead);
      if (!draft.recipient)
        throw new Error(
          "Save the recipient profile URL before marking outreach manually sent."
        );
      const hostname = new URL(safeUrl.parse(draft.recipient)).hostname.replace(
        /^www\./,
        ""
      );
      if (draft.channel === "linkedin" && hostname !== "linkedin.com")
        throw new Error("Use a LinkedIn profile URL.");
      if (draft.channel === "x" && !["x.com", "twitter.com"].includes(hostname))
        throw new Error("Use an X profile URL.");
      await (
        await db()
      )
        .update(t.outreach)
        .set({ status: "manual", sentAt: new Date() })
        .where(
          and(
            eq(t.outreach.id, draft.id),
            eq(t.outreach.companyId, ctx.company.id)
          )
        );
      await recordActivity(
        ctx.company.id,
        `${draft.channel} outreach marked manually sent by a team member.`,
        "manual",
        lead.id
      );
      return { success: true };
    }),
  }),
  mailbox: router({
    status: companyProcedure.query(({ ctx }) =>
      getMailboxStatus(ctx.company.id)
    ),
    configureGmail: ownerProcedure
      .input(
        z.object({
          clientId: z.string().min(10).max(1000),
          clientSecret: z.string().min(5).max(1000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await saveIntegration(
          ctx.company.id,
          "google-client",
          input,
          "Google OAuth client"
        );
        return { success: true };
      }),
    connectApify: ownerProcedure
      .input(z.object({ token: z.string().min(10).max(2000) }))
      .mutation(({ ctx, input }) => connectApify(ctx.company.id, input.token)),
    connectImap: ownerProcedure
      .input(
        z.object({
          email: z.string().email(),
          username: z.string().min(1).max(320),
          password: z.string().min(1).max(1000),
          imapHost: z.string().min(3).max(255),
          imapPort: z.number().int(),
          imapSecure: z.boolean(),
          smtpHost: z.string().min(3).max(255),
          smtpPort: z.number().int(),
          smtpSecure: z.boolean(),
        })
      )
      .mutation(({ ctx, input }) => connectImap(ctx.company.id, input)),
    startGmail: ownerProcedure
      .input(z.object({ origin: safeUrl }))
      .mutation(async ({ ctx, input }) => {
        const result = await startGmail(
          ctx.user.id,
          ctx.company.id,
          input.origin
        );
        bindGmailStateCookie(ctx.res, result.url);
        return result;
      }),
    syncInbox: companyProcedure.mutation(({ ctx }) =>
      syncInbox(ctx.company.id)
    ),
    disconnect: ownerProcedure
      .input(z.object({ provider: z.enum(["apify", "gmail", "imap"]) }))
      .mutation(({ ctx, input }) =>
        disconnectIntegration(ctx.company.id, input.provider)
      ),
  }),
  inbox: router({
    list: companyProcedure.query(async ({ ctx }) =>
      (await db())
        .select()
        .from(t.inboxMessages)
        .where(eq(t.inboxMessages.companyId, ctx.company.id))
        .orderBy(desc(t.inboxMessages.receivedAt))
        .limit(50)
    ),
  }),
  submissions: router({
    list: ownerProcedure.query(async ({ ctx }) =>
      (await db())
        .select()
        .from(t.submissions)
        .where(
          ctx.company.slug === "proof"
            ? or(
                eq(t.submissions.companyId, ctx.company.id),
                sql`${t.submissions.companyId} is null`
              )
            : eq(t.submissions.companyId, ctx.company.id)
        )
        .orderBy(desc(t.submissions.id))
        .limit(500)
    ),
  }),
  public: router({
    signup: publicProcedure
      .input(publicSubmission)
      .mutation(async ({ ctx, input }) => {
        throttle(`signup:${ipKey(ctx.req)}`, 8);
        if (input.website) return { success: true };
        await (
          await db()
        )
          .insert(t.submissions)
          .values({
            email: input.email.toLowerCase().trim(),
            source: "leadloom-waitlist",
            consentText,
          })
          .onDuplicateKeyUpdate({ set: { consent: 1 } });
        return { success: true };
      }),
    page: publicProcedure
      .input(z.object({ token: tokenInput }))
      .query(async ({ input }) => {
        const row = await publicPage(input.token);
        return {
          page: {
            id: row.page.id,
            content: row.page.content,
            brandSnapshot: row.page.brandSnapshot,
            title: row.page.title,
            shareToken: row.page.shareToken,
          },
          company: row.company,
          lead: row.lead,
        };
      }),
    subscribe: publicProcedure
      .input(publicSubmission.extend({ token: tokenInput }))
      .mutation(async ({ ctx, input }) => {
        throttle(`subscribe:${ipKey(ctx.req)}`, 8);
        const { page } = await publicPage(input.token);
        if (input.website) return { success: true };
        await (
          await db()
        )
          .insert(t.submissions)
          .values({
            companyId: page.companyId,
            pageId: page.id,
            email: input.email.toLowerCase().trim(),
            source: `page-${page.id}`,
            consentText:
              "I agree to be contacted about this proposal. This is an explicit request for a conversation.",
          })
          .onDuplicateKeyUpdate({ set: { consent: 1 } });
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
