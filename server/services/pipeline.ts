import { collectEvidence, leadIdentity, githubRepo } from "./publicEvidence";
import { clearUnobservedContacts } from "./contactEvidence";
import { analyzeLead } from "./generation";
import {
  getIntakeControls,
  assertSourcingOpen,
  assertSyncOpen,
} from "./intakeControls";
import { and, eq, desc, inArray, sql, isNull } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { jwtVerify } from "jose";
import { parse } from "cookie";
import type { Express, Request } from "express";
import * as t from "../../drizzle/schema";
import { db, scopedRow, recordActivity } from "./tenant";
import {
  pipelineConfigSchema,
  pacingWindow,
  nextDiscoveryAt,
  discoveryResultSchema,
  type PipelineConfig,
} from "../../shared/pipeline";
import { researchSchema } from "../../shared/domain";
import { startRun, syncRun, publicWebsite } from "./apify";
import {
  generatePage,
  generateDraft,
  normalizeGojiberryDiscovery,
} from "./generation";
import { getIntegration } from "./credentials";
import { startManusAgent, inspectManusAgent } from "./manusAgent";
import { callGojiberryReadOnly, listGojiberryTools } from "./gojiberry";
import {
  createHeartbeatJob,
  updateHeartbeatJob,
  listHeartbeatJobs,
} from "../_core/heartbeat";

type Pipeline = typeof t.pipelines.$inferSelect;
type Job = typeof t.pipelineJobs.$inferSelect;
const active = ["queued", "starting", "running", "waiting", "unknown"];
const runTerminal = ["IMPORTED", "FAILED", "ABORTED", "TIMED-OUT"];
async function scopedPipeline(companyId: number) {
  const [row] = await (await db())
    .select()
    .from(t.pipelines)
    .where(eq(t.pipelines.companyId, companyId))
    .limit(1);
  if (!row) throw new Error("Save your agent configuration first.");
  return row;
}
export async function getPipeline(companyId: number) {
  const d = await db();
  const [pipeline] = await d
    .select()
    .from(t.pipelines)
    .where(eq(t.pipelines.companyId, companyId))
    .limit(1);
  const [jobs, leads, icps, integrations] = await Promise.all([
    pipeline
      ? d
          .select()
          .from(t.pipelineJobs)
          .where(
            and(
              eq(t.pipelineJobs.companyId, companyId),
              eq(t.pipelineJobs.pipelineId, pipeline.id)
            )
          )
          .orderBy(desc(t.pipelineJobs.id))
          .limit(100)
      : [],
    d
      .select()
      .from(t.leads)
      .where(eq(t.leads.companyId, companyId))
      .orderBy(desc(t.leads.id))
      .limit(100),
    d.select().from(t.icps).where(eq(t.icps.companyId, companyId)),
    d
      .select({
        provider: t.integrations.provider,
        status: t.integrations.status,
      })
      .from(t.integrations)
      .where(eq(t.integrations.companyId, companyId)),
  ]);
  const ready = (provider: string) =>
    integrations.some(i => i.provider === provider && i.status === "connected");
  return {
    pipeline: pipeline ?? null,
    jobs,
    leads,
    icps,
    integrations: {
      apify: ready("apify"),
      manus: ready("manus"),
      gojiberry: ready("gojiberry"),
    },
    schedule: pipeline?.scheduleStatus ?? "not_registered",
  };
}
export async function savePipeline(
  companyId: number,
  name: string,
  config: PipelineConfig
) {
  const parsed = pipelineConfigSchema.parse(config);
  await scopedRow(t.icps, parsed.icpId, companyId);
  if (parsed.source === "gojiberry" && parsed.discover) {
    if (!parsed.gojiberryTool || !parsed.gojiberryLimitField)
      throw new Error(
        "Choose a discovered read-only Gojiberry tool with a numeric result-limit field."
      );
    const tools = await listGojiberryTools(companyId);
    const tool = tools.find(v => v.name === parsed.gojiberryTool);
    const field = (
      tool?.inputSchema?.properties as
        | Record<string, { type?: string }>
        | undefined
    )?.[parsed.gojiberryLimitField];
    if (!tool || !field || !["integer", "number"].includes(field.type ?? ""))
      throw new Error(
        "The selected result-limit field is not present in the real tool schema."
      );
    parsed.gojiberryArgs = {
      ...parsed.gojiberryArgs,
      [parsed.gojiberryLimitField]: 1,
    };
  }
  const d = await db();
  await d
    .insert(t.pipelines)
    .values({ companyId, name, config: parsed })
    .onDuplicateKeyUpdate({ set: { name, config: parsed } });
  await recordActivity(
    companyId,
    `Agent configuration saved. Pace: up to ${parsed.dailyLimit} candidates per local day, at least ${parsed.intervalMinutes} minutes between discoveries.`,
    "agent"
  );
  return { success: true };
}
async function ensureReady(p: Pipeline) {
  const providers = new Set<string>();
  if (p.config.discover) providers.add(p.config.source);
  if (p.config.qualify) providers.add(p.config.researchProvider);
  for (const provider of providers)
    if (!(await getIntegration(p.companyId, provider)))
      throw new Error(`Connect ${provider} before enabling this pipeline.`);
}
export async function togglePipeline(
  companyId: number,
  enabled: boolean,
  userSession = ""
) {
  const p = await scopedPipeline(companyId);
  if (enabled) await ensureReady(p);
  if (p.scheduleTaskUid)
    await updateHeartbeatJob(
      p.scheduleTaskUid,
      { enable: enabled },
      userSession
    );
  await (
    await db()
  )
    .update(t.pipelines)
    .set({
      enabled: enabled ? 1 : 0,
      scheduleStatus: p.scheduleTaskUid
        ? enabled
          ? "registered"
          : "paused"
        : "not_registered",
      lastError: null,
    })
    .where(eq(t.pipelines.id, p.id));
  await recordActivity(
    companyId,
    enabled
      ? "Agent enabled. Recurring execution requires a registered schedule and published app."
      : "Agent paused. New provider work is stopped; existing paid runs are not cancelled.",
    "agent"
  );
  return { success: true };
}
export async function registerPipelineSchedule(
  companyId: number,
  userSession = ""
) {
  const d = await db();
  const initial = await scopedPipeline(companyId);
  if (!process.env.MANUS_PROJECT_ID)
    throw new Error("Project schedule identity is not available.");
  const taskUid = await d.transaction(async tx => {
    const [p] = await tx
      .select()
      .from(t.pipelines)
      .where(
        and(
          eq(t.pipelines.id, initial.id),
          eq(t.pipelines.companyId, companyId)
        )
      )
      .for("update");
    if (p.scheduleTaskUid) return p.scheduleTaskUid;
    const name = `tailorpitch-pipeline-${p.id}`;
    let existing: string | undefined;
    let exhausted = false;
    for (let page = 1; page <= 20; page++) {
      const listed = await listHeartbeatJobs(userSession, {
        page,
        pageSize: 200,
      });
      const found = listed.jobs?.find(j => j.name === name);
      if (found) {
        existing = found.taskUid;
        break;
      }
      if (!listed.jobs?.length || page * 200 >= Number(listed.total ?? 0)) {
        exhausted = true;
        break;
      }
    }
    if (!existing && !exhausted)
      throw new Error(
        "Schedule catalog is too large to safely establish uniqueness. No duplicate schedule was created."
      );
    if (!existing) {
      const created = await createHeartbeatJob(
        {
          name,
          cron: "0 */5 * * * *",
          path: "/api/scheduled/pipeline",
          payload: {},
          description:
            "Resume one bounded TailorPitch pipeline step. App-enforced daily and cadence limits; never automatic send or publication.",
        },
        userSession
      );
      existing = created.taskUid;
    }
    if (!existing) throw new Error("Scheduler did not return an identity.");
    await tx
      .update(t.pipelines)
      .set({
        scheduleTaskUid: existing,
        scheduleId: existing,
        scheduleStatus: "registered_requires_publication",
      })
      .where(eq(t.pipelines.id, p.id));
    return existing;
  });
  const current = await scopedPipeline(companyId);
  await updateHeartbeatJob(
    taskUid,
    { enable: Boolean(current.enabled) },
    userSession
  );
  await d
    .update(t.pipelines)
    .set({
      scheduleStatus: current.enabled
        ? "registered_requires_publication"
        : "paused_requires_publication",
    })
    .where(eq(t.pipelines.id, initial.id));
  return {
    success: true,
    taskUid,
    message:
      "Schedule registered. It can execute successfully only after this app is published. Pipeline pause and pacing remain enforced.",
  };
}
export async function selectPipelineLead(
  companyId: number,
  leadId: number,
  selected: boolean
) {
  const lead = await scopedRow<typeof t.leads.$inferSelect>(
    t.leads,
    leadId,
    companyId
  );
  if (lead.status === "suppressed")
    throw new Error(
      "Suppressed contacts cannot enter page or outreach stages."
    );
  if (selected && !lead.research)
    throw new Error(
      "Research the lead before selecting it for a personalized page."
    );
  const p = await scopedPipeline(companyId);
  await (
    await db()
  )
    .update(t.leads)
    .set({ pipelineSelectedAt: selected ? new Date() : null, pipelineId: p.id })
    .where(and(eq(t.leads.id, leadId), eq(t.leads.companyId, companyId)));
  return { success: true };
}
async function insertJob(
  p: Pipeline,
  stage: Job["stage"],
  provider: string,
  leadId?: number
) {
  const d = await db();
  if (leadId) {
    const [existing] = await d
      .select()
      .from(t.pipelineJobs)
      .where(
        and(
          eq(t.pipelineJobs.pipelineId, p.id),
          eq(t.pipelineJobs.companyId, p.companyId),
          eq(t.pipelineJobs.leadId, leadId),
          eq(t.pipelineJobs.stage, stage)
        )
      )
      .limit(1);
    if (existing) return null;
  }
  const [r] = await d.insert(t.pipelineJobs).values({
    companyId: p.companyId,
    pipelineId: p.id,
    leadId,
    stage,
    provider,
    configSnapshot: p.config,
  });
  return scopedRow<Job>(t.pipelineJobs, r.insertId, p.companyId);
}
async function updateJob(
  job: Job,
  data: Partial<typeof t.pipelineJobs.$inferInsert>
) {
  await (
    await db()
  )
    .update(t.pipelineJobs)
    .set(data)
    .where(
      and(
        eq(t.pipelineJobs.id, job.id),
        eq(t.pipelineJobs.companyId, job.companyId)
      )
    );
}
async function assertLeadOpen(
  companyId: number,
  lead: typeof t.leads.$inferSelect
) {
  if (lead.status === "suppressed")
    throw new Error("This contact is suppressed.");
  if (lead.email) {
    const [s] = await (
      await db()
    )
      .select({ id: t.suppressions.id })
      .from(t.suppressions)
      .where(
        and(
          eq(t.suppressions.companyId, companyId),
          eq(t.suppressions.email, lead.email.toLowerCase()),
          eq(t.suppressions.active, 1)
        )
      )
      .limit(1);
    if (s) throw new Error("This contact has opted out.");
  }
}
async function importCandidate(job: Job, raw: unknown) {
  const result = discoveryResultSchema.parse(raw);
  const d = await db();
  const candidate = result.candidates[0];
  let count = 0;
  if (candidate) {
    const website = publicWebsite(candidate.website);
    publicWebsite(candidate.sourceUrl);
    if (job.provider === "manus") {
      const evidence = await collectEvidence(candidate.sourceUrl);
      clearUnobservedContacts(candidate, JSON.stringify(evidence));
    }
    const [suppression] = candidate.email
      ? await d
          .select()
          .from(t.suppressions)
          .where(
            and(
              eq(t.suppressions.companyId, job.companyId),
              eq(t.suppressions.email, candidate.email.toLowerCase()),
              eq(t.suppressions.active, 1)
            )
          )
      : [];
    const domain = leadIdentity(website.href);
    const [company] = await d
      .select({ website: t.companies.website })
      .from(t.companies)
      .where(eq(t.companies.id, job.companyId));
    if (domain !== new URL(company.website).hostname.replace(/^www\./, "")) {
      const [insert] = await d
        .insert(t.leads)
        .values({
          companyId: job.companyId,
          icpId: job.configSnapshot.icpId,
          pipelineId: job.pipelineId,
          domain,
          website: githubRepo(website.href)?.url ?? website.href,
          companyName: candidate.companyName,
          contactName: candidate.contactName,
          email: candidate.email.toLowerCase(),
          title: candidate.title,
          linkedinUrl: candidate.linkedinUrl,
          xUrl: candidate.xUrl,
          status: suppression ? "suppressed" : "new",
          source: `${job.provider}-agent`,
          sourceUrl: candidate.sourceUrl,
          notes: `Observed source signal (requires qualification): ${candidate.signal}`,
        })
        .onDuplicateKeyUpdate({ set: { domain } });
      count = insert.insertId > 0 ? 1 : 0;
    }
  }
  await updateJob(job, {
    status: "completed",
    result: { ...result, imported: count },
    completedAt: new Date(),
  });
  await recordActivity(
    job.companyId,
    `${job.provider} agent completed a bounded discovery turn: ${count} new candidate.`,
    "agent"
  );
}
async function saveResearch(job: Job, raw: unknown) {
  researchSchema.parse(raw); // Agent structured output is a hypothesis until independently grounded.

  const lead = await scopedRow<typeof t.leads.$inferSelect>(
    t.leads,
    job.leadId!,
    job.companyId
  );
  await assertLeadOpen(job.companyId, lead);
  const icp = await scopedRow<typeof t.icps.$inferSelect>(
    t.icps,
    job.configSnapshot.icpId,
    job.companyId
  );
  const [company] = await (await db())
    .select()
    .from(t.companies)
    .where(eq(t.companies.id, job.companyId));
  const evidence = await collectEvidence(lead.website);
  const research = await analyzeLead(lead, icp, company, evidence.sources);
  const currentLead = await scopedRow<typeof t.leads.$inferSelect>(
    t.leads,
    lead.id,
    job.companyId
  );
  await assertLeadOpen(job.companyId, currentLead);
  if (currentLead.website !== lead.website || currentLead.icpId !== lead.icpId)
    throw new Error(
      "Lead changed during provider research. No stale result was saved."
    );
  const keys = (
    [
      "industries",
      "geography",
      "companySize",
      "roles",
      "keywords",
      "signals",
      "exclusions",
    ] as const
  ).filter(k => icp.criteria[k].trim());
  const qualified =
    research.score >= icp.criteria.minScore &&
    keys.every(key =>
      research.criteria.some(c => c.key === key && c.status === "matched")
    ) &&
    research.criteria.every(c => c.status === "matched");
  for (const fact of research.facts) publicWebsite(fact.sourceUrl);
  await (
    await db()
  )
    .update(t.leads)
    .set({
      research,
      score: research.score,
      researchedAt: new Date(),
      status: qualified ? "qualified" : "researched",
    })
    .where(
      and(
        eq(t.leads.id, lead.id),
        eq(t.leads.companyId, job.companyId),
        sql`${t.leads.status} <> 'suppressed'`
      )
    );
  await updateJob(job, {
    status: "completed",
    result: { qualified, score: research.score },
    completedAt: new Date(),
  });
  await recordActivity(
    job.companyId,
    `Research agent saved ${lead.companyName}: ${qualified ? "qualified against saved filters" : "review remaining criteria"}.`,
    "agent",
    lead.id
  );
}
async function syncJob(job: Job) {
  await assertSyncOpen(job.companyId);
  if (job.sourceRunId) {
    const result = await syncRun(job.companyId, job.sourceRunId);
    const run = await scopedRow<typeof t.sourcingRuns.$inferSelect>(
      t.sourcingRuns,
      job.sourceRunId,
      job.companyId
    );
    if (result.status === "IMPORTED") {
      if (job.stage === "discover")
        await (
          await db()
        )
          .update(t.leads)
          .set({ pipelineId: job.pipelineId })
          .where(
            and(
              eq(t.leads.companyId, job.companyId),
              eq(t.leads.sourceRunId, run.id)
            )
          );
      await updateJob(job, {
        status: "completed",
        result: { imported: run.imported },
        completedAt: new Date(),
      });
    } else if (runTerminal.includes(result.status))
      await updateJob(job, {
        status: "failed",
        error: run.error ?? `Apify ${result.status}`,
        completedAt: new Date(),
      });
    else if (result.status === "UNKNOWN")
      await updateJob(job, { status: "unknown", error: run.error });
    return;
  }
  if (job.manusTaskId) {
    const result = await inspectManusAgent(job.companyId, {
      taskId: job.manusTaskId,
      eventCursor: job.eventCursor ?? undefined,
      stage: job.stage === "discover" ? "discover" : "qualify",
    });
    const common = {
      eventCursor: result.eventCursor ?? job.eventCursor,
      result: { events: result.events, waiting: result.waiting ?? null },
    };
    if (result.state === "completed" && result.result) {
      if (job.stage === "discover") await importCandidate(job, result.result);
      else await saveResearch(job, result.result);
    } else if (result.state === "error")
      await updateJob(job, {
        ...common,
        status: "failed",
        error: result.error ?? "Agent failed.",
        completedAt: new Date(),
      });
    else if (result.state === "unknown")
      await updateJob(job, {
        ...common,
        status: "unknown",
        error:
          result.error ??
          "Provider completion cannot yet be verified. No replacement task was created.",
      });
    else if (result.state === "waiting")
      await updateJob(job, {
        ...common,
        status: "waiting",
        error:
          "Agent needs attention. Open the original Manus task; TailorPitch does not auto-approve actions.",
      });
    else if (job.startedAt && Date.now() - job.startedAt.getTime() > 60 * 60000)
      await updateJob(job, {
        ...common,
        status: "unknown",
        error:
          "Agent completion deadline reached. Check the linked task; no replacement task is launched.",
      });
    else await updateJob(job, { ...common, status: "running" });
  }
}
async function processJob(p: Pipeline, job: Job) {
  await assertSyncOpen(p.companyId);
  if (job.stage === "discover" && job.status === "queued")
    await assertSourcingOpen(p.companyId);
  if (job.status === "running" || job.status === "waiting") {
    await syncJob(job);
    return;
  }
  if (job.status === "unknown") {
    if (job.sourceRunId || job.manusTaskId) await syncJob(job);
    return;
  }
  if (job.status === "starting") {
    if (job.startedAt && Date.now() - job.startedAt.getTime() > 5 * 60000)
      await updateJob(job, {
        status: "unknown",
        error:
          "Provider creation was interrupted. Reconcile its history before retrying; no automatic duplicate operation.",
      });
    return;
  }
  if (job.status !== "queued") return;
  const stageEnabled =
    job.stage === "discover"
      ? p.config.discover
      : job.stage === "qualify"
        ? p.config.qualify
        : job.stage === "page"
          ? p.config.pages
          : p.config.outreach;
  if (!stageEnabled) {
    await updateJob(job, {
      status: "cancelled",
      error: "This stage was disabled before it started.",
      completedAt: new Date(),
    });
    return;
  }
  const [claimed] = await (
    await db()
  )
    .update(t.pipelineJobs)
    .set({ status: "starting", startedAt: new Date() })
    .where(
      and(
        eq(t.pipelineJobs.id, job.id),
        eq(t.pipelineJobs.companyId, p.companyId),
        eq(t.pipelineJobs.status, "queued")
      )
    );
  if (!claimed.affectedRows) return;
  try {
    const [company] = await (await db())
      .select()
      .from(t.companies)
      .where(eq(t.companies.id, p.companyId));
    if (!company) throw new Error("Company is unavailable.");
    const icp = await scopedRow<typeof t.icps.$inferSelect>(
      t.icps,
      job.configSnapshot.icpId,
      p.companyId
    );
    const lead = job.leadId
      ? await scopedRow<typeof t.leads.$inferSelect>(
          t.leads,
          job.leadId,
          p.companyId
        )
      : undefined;
    if (lead) await assertLeadOpen(p.companyId, lead);
    if (job.provider === "apify") {
      const created = await startRun(
        p.companyId,
        job.stage === "discover"
          ? {
              icpId: icp.id,
              limit: 1,
              query: [
                icp.criteria.industries,
                icp.criteria.keywords,
                icp.criteria.geography,
              ]
                .filter(Boolean)
                .join(" ")
                .slice(0, 1500),
            }
          : { leadId: lead!.id }
      );
      const providerRun = await scopedRow<typeof t.sourcingRuns.$inferSelect>(
        t.sourcingRuns,
        created.id,
        p.companyId
      );
      if (job.stage === "discover" && providerRun.requestedLimit !== 1)
        throw new Error(
          "A larger manual Apify run already exists for this ICP. Sync it in Leads before starting the paced single-candidate agent."
        );
      await updateJob(job, { status: "running", sourceRunId: created.id });
      return;
    }
    if (job.provider === "manus") {
      const known = await (await db())
        .select({ domain: t.leads.domain })
        .from(t.leads)
        .where(eq(t.leads.companyId, p.companyId))
        .limit(100);
      const previous =
        job.stage === "discover"
          ? (
              await (
                await db()
              )
                .select()
                .from(t.pipelineJobs)
                .where(
                  and(
                    eq(t.pipelineJobs.companyId, p.companyId),
                    eq(t.pipelineJobs.pipelineId, p.id),
                    eq(t.pipelineJobs.provider, "manus"),
                    eq(t.pipelineJobs.stage, "discover"),
                    eq(t.pipelineJobs.status, "completed")
                  )
                )
                .orderBy(desc(t.pipelineJobs.id))
                .limit(1)
            )[0]
          : undefined;
      const created = await startManusAgent(p.companyId, {
        stage: job.stage === "discover" ? "discover" : "qualify",
        config: job.configSnapshot,
        company,
        icp,
        lead,
        knownDomains: known.map(v => v.domain),
        previousTaskId: previous?.manusTaskId ?? undefined,
      });
      await updateJob(job, {
        status: "running",
        manusTaskId: created.taskId,
        taskUrl: created.taskUrl,
        eventCursor: created.eventCursor ?? null,
      });
      return;
    }
    if (job.provider === "gojiberry") {
      const config = job.configSnapshot;
      const tool = (await listGojiberryTools(p.companyId)).find(
        v => v.name === config.gojiberryTool
      );
      const property = (
        tool?.inputSchema?.properties as
          | Record<string, { type?: string }>
          | undefined
      )?.[config.gojiberryLimitField];
      if (!property || !["integer", "number"].includes(property.type ?? ""))
        throw new Error(
          "A verified numeric provider result limit is required."
        );
      const response = await callGojiberryReadOnly(p.companyId, {
        name: config.gojiberryTool,
        args: { ...config.gojiberryArgs, [config.gojiberryLimitField]: 1 },
      });
      const known = await (await db())
        .select({ domain: t.leads.domain })
        .from(t.leads)
        .where(eq(t.leads.companyId, p.companyId))
        .limit(1000);
      const normalized = await normalizeGojiberryDiscovery(
        response,
        known.map(v => v.domain),
        icp.criteria
      );
      await importCandidate(job, normalized);
      return;
    }
    if (job.stage === "page") {
      if (!lead?.pipelineSelectedAt || !lead.research)
        throw new Error(
          "Page stage requires the owner to select this researched lead."
        );
      const content = await generatePage(lead, company);
      const currentLead = await scopedRow<typeof t.leads.$inferSelect>(
        t.leads,
        lead.id,
        p.companyId
      );
      await assertLeadOpen(p.companyId, currentLead);
      if (
        !currentLead.research ||
        !currentLead.pipelineSelectedAt ||
        currentLead.updatedAt.getTime() !== lead.updatedAt.getTime()
      )
        throw new Error(
          "Lead research or selection changed during generation. No stale draft was saved."
        );
      const [insert] = await (await db()).insert(t.pages).values({
        companyId: p.companyId,
        leadId: lead.id,
        shareToken: randomBytes(24).toString("hex"),
        content,
        brandSnapshot: company.brand,
        title: `${lead.companyName} — ${company.name}`.slice(0, 200),
      });
      await updateJob(job, {
        status: "completed",
        result: { pageId: insert.insertId },
        completedAt: new Date(),
      });
      await recordActivity(
        p.companyId,
        `Page agent created a private draft for ${lead.companyName}.`,
        "agent",
        lead.id
      );
      return;
    }
    if (job.stage === "outreach") {
      if (!lead?.pipelineSelectedAt || !lead.research)
        throw new Error("Outreach draft requires a selected researched lead.");
      const [page] = await (
        await db()
      )
        .select()
        .from(t.pages)
        .where(
          and(
            eq(t.pages.companyId, p.companyId),
            eq(t.pages.leadId, lead.id),
            eq(t.pages.status, "published")
          )
        )
        .orderBy(desc(t.pages.id))
        .limit(1);
      if (page && !company.publicOrigin)
        throw new Error(
          "Configure a verified public origin before adding personalized page links."
        );
      const draft = await generateDraft(
        lead,
        company,
        job.configSnapshot.channel,
        page ?? null
      );
      if (page && draft.body.split("[PERSONALIZED_PAGE_URL]").length !== 2)
        throw new Error(
          "Draft omitted the exact personalized-page placeholder."
        );
      if (!page && !draft.body.includes(company.brand.bookingUrl))
        throw new Error("Draft omitted your approved next-step URL.");
      const body = page
        ? draft.body.replace(
            "[PERSONALIZED_PAGE_URL]",
            `${company.publicOrigin}/p/${page.shareToken}`
          )
        : draft.body;
      const currentLead = await scopedRow<typeof t.leads.$inferSelect>(
        t.leads,
        lead.id,
        p.companyId
      );
      await assertLeadOpen(p.companyId, currentLead);
      if (
        !currentLead.research ||
        !currentLead.pipelineSelectedAt ||
        currentLead.updatedAt.getTime() !== lead.updatedAt.getTime()
      )
        throw new Error(
          "Lead research or selection changed during generation. No stale draft was saved."
        );
      const recipient =
        job.configSnapshot.channel === "email"
          ? lead.email
          : job.configSnapshot.channel === "linkedin"
            ? lead.linkedinUrl
            : lead.xUrl;
      const [insert] = await (await db()).insert(t.outreach).values({
        companyId: p.companyId,
        leadId: lead.id,
        pageId: page?.id,
        channel: job.configSnapshot.channel,
        recipient,
        subject: draft.subject,
        body,
        rationale: draft.rationale,
      });
      await updateJob(job, {
        status: "completed",
        result: { outreachId: insert.insertId },
        completedAt: new Date(),
      });
      await recordActivity(
        p.companyId,
        `Outreach agent saved a ${job.configSnapshot.channel} draft for ${lead.companyName}. Nothing was sent.`,
        "agent",
        lead.id
      );
    }
  } catch (error) {
    const latest = await scopedRow<Job>(t.pipelineJobs, job.id, p.companyId);
    if (latest.sourceRunId || latest.manusTaskId) return;
    const uncertain =
      job.provider === "manus" ||
      job.provider === "gojiberry" ||
      error instanceof TypeError ||
      (error instanceof Error &&
        ["AbortError", "TimeoutError"].includes(error.name));
    await updateJob(job, {
      status: uncertain ? "unknown" : "failed",
      error: error instanceof Error ? error.message : "Pipeline stage failed.",
      completedAt: uncertain ? null : new Date(),
    });
  }
}
export async function tickPipeline(companyId: number) {
  const d = await db();
  let p = await scopedPipeline(companyId);
  const intake = await getIntakeControls(companyId);
  if (intake.syncPaused) return { status: "sync_paused" };
  if (!p.enabled) return { status: "paused" };
  const now = new Date();
  const leaseToken = randomBytes(24).toString("hex");
  const [claim] = await d
    .update(t.pipelines)
    .set({
      leaseUntil: new Date(now.getTime() + 20 * 60000),
      leaseToken,
      lastTickAt: now,
    })
    .where(
      and(
        eq(t.pipelines.id, p.id),
        eq(t.pipelines.companyId, companyId),
        sql`(${t.pipelines.leaseUntil} IS NULL OR ${t.pipelines.leaseUntil} < NOW())`
      )
    );
  if (!claim.affectedRows) return { status: "busy" };
  try {
    p = await scopedPipeline(companyId);
    if (!p.enabled) return { status: "paused" };
    const [existing] = await d
      .select()
      .from(t.pipelineJobs)
      .where(
        and(
          eq(t.pipelineJobs.pipelineId, p.id),
          eq(t.pipelineJobs.companyId, companyId),
          inArray(t.pipelineJobs.status, active)
        )
      )
      .orderBy(t.pipelineJobs.id)
      .limit(1);
    if (existing) {
      await processJob(p, existing);
      return { status: existing.status, jobId: existing.id };
    }
    // Work already accepted into the pipeline is staged gradually; no new discovery is needed to qualify it.
    const candidates = await d
      .select()
      .from(t.leads)
      .where(
        and(
          eq(t.leads.companyId, companyId),
          eq(t.leads.pipelineId, p.id),
          sql`${t.leads.status} <> 'suppressed'`
        )
      )
      .orderBy(t.leads.id)
      .limit(100);
    for (const lead of candidates) {
      let stage: Job["stage"] | undefined;
      let provider = "generation";
      if (p.config.qualify && !lead.research) {
        stage = "qualify";
        provider = p.config.researchProvider;
      } else if (lead.research && lead.pipelineSelectedAt && p.config.pages)
        stage = "page";
      if (stage) {
        const job = await insertJob(p, stage, provider, lead.id);
        if (job) {
          await processJob(p, job);
          return { status: "step_accepted", jobId: job.id };
        }
      }
      if (lead.research && lead.pipelineSelectedAt && p.config.outreach) {
        const pageJobs = await d
          .select({ status: t.pipelineJobs.status })
          .from(t.pipelineJobs)
          .where(
            and(
              eq(t.pipelineJobs.pipelineId, p.id),
              eq(t.pipelineJobs.leadId, lead.id),
              eq(t.pipelineJobs.stage, "page")
            )
          );
        if (p.config.pages && !pageJobs.some(j => j.status === "completed"))
          continue;
        const job = await insertJob(p, "outreach", "generation", lead.id);
        if (job) {
          await processJob(p, job);
          return { status: "step_accepted", jobId: job.id };
        }
      }
    }
    if ((await getIntakeControls(companyId)).sourcingPaused)
      return { status: "sourcing_paused" };
    const window = pacingWindow(p.config, now);
    if (!p.config.discover || !window.allowed)
      return { status: "outside_discovery_window" };
    if (p.nextDiscoveryAt && p.nextDiscoveryAt > now)
      return { status: "waiting_for_next_cycle", nextAt: p.nextDiscoveryAt };
    const already = p.dayKey === window.day ? p.discoveriesToday : 0;
    if (already >= p.config.dailyLimit)
      return { status: "daily_limit_reached" };
    await ensureReady(p);
    const job = await d.transaction(async tx => {
      const [locked] = await tx
        .select()
        .from(t.pipelines)
        .where(eq(t.pipelines.id, p.id))
        .for("update");
      if (!locked.enabled) return null;
      const used = locked.dayKey === window.day ? locked.discoveriesToday : 0;
      if (
        used >= locked.config.dailyLimit ||
        (locked.nextDiscoveryAt && locked.nextDiscoveryAt > now)
      )
        return null;
      await tx
        .update(t.pipelines)
        .set({
          dayKey: window.day,
          discoveriesToday: used + 1,
          nextDiscoveryAt: nextDiscoveryAt(locked.config, now),
        })
        .where(eq(t.pipelines.id, p.id));
      const [insert] = await tx.insert(t.pipelineJobs).values({
        companyId,
        pipelineId: p.id,
        stage: "discover",
        provider: locked.config.source,
        configSnapshot: locked.config,
      });
      return insert.insertId;
    });
    if (!job) return { status: "pace_reserved" };
    await processJob(p, await scopedRow(t.pipelineJobs, job, companyId));
    return { status: "discovery_accepted", jobId: job };
  } catch (error) {
    await d
      .update(t.pipelines)
      .set({
        lastError:
          error instanceof Error ? error.message : "Pipeline tick failed.",
      })
      .where(eq(t.pipelines.id, p.id));
    throw error;
  } finally {
    await d
      .update(t.pipelines)
      .set({ leaseUntil: null, leaseToken: null })
      .where(
        and(eq(t.pipelines.id, p.id), eq(t.pipelines.leaseToken, leaseToken))
      );
  }
}
export async function retryPipelineJob(companyId: number, jobId: number) {
  const job = await scopedRow<Job>(t.pipelineJobs, jobId, companyId);
  if (!["failed", "cancelled"].includes(job.status))
    throw new Error(
      "Only a definitively failed or cancelled job can be retried. Reconcile uncertain provider work first."
    );
  if (job.sourceRunId) {
    const run = await scopedRow<typeof t.sourcingRuns.$inferSelect>(
      t.sourcingRuns,
      job.sourceRunId,
      companyId
    );
    if (!["FAILED", "ABORTED", "TIMED-OUT"].includes(run.status))
      throw new Error(
        "Existing Apify run is not confirmed terminal. Sync or reconcile it in Leads first."
      );
  }
  if (job.manusTaskId)
    throw new Error(
      "Manus failures require checking the original task. Resume it there and refresh rather than creating duplicate agent work."
    );
  await updateJob(job, {
    status: "queued",
    sourceRunId: null,
    error: null,
    startedAt: null,
    completedAt: null,
  });
  return { success: true };
}
export async function reconcilePipelineJob(
  companyId: number,
  jobId: number,
  sourceRunId?: number,
  manusTaskId?: string
) {
  await assertSyncOpen(companyId);
  const job = await scopedRow<Job>(t.pipelineJobs, jobId, companyId);
  if (!["unknown", "starting"].includes(job.status))
    throw new Error("Only an interrupted job can be reconciled.");
  if (job.provider === "apify") {
    if (!sourceRunId)
      throw new Error("Use the existing internal Apify run ID from Leads.");
    const run = await scopedRow<typeof t.sourcingRuns.$inferSelect>(
      t.sourcingRuns,
      sourceRunId,
      companyId
    );
    if (
      (job.stage === "discover" &&
        (run.type !== "discovery" ||
          run.icpId !== job.configSnapshot.icpId ||
          run.requestedLimit !== 1)) ||
      (job.stage === "qualify" &&
        (run.type !== "research" || run.leadId !== job.leadId))
    )
      throw new Error("The existing run does not match this bounded stage.");
    await updateJob(job, { sourceRunId, status: "running", error: null });
  } else if (job.provider === "manus") {
    if (!manusTaskId)
      throw new Error(
        "Use the exact existing Manus task ID after inspecting its context."
      );
    await inspectManusAgent(companyId, {
      taskId: manusTaskId,
      stage: job.stage === "discover" ? "discover" : "qualify",
    });
    await updateJob(job, {
      manusTaskId,
      taskUrl: `https://manus.im/app/${encodeURIComponent(manusTaskId)}`,
      status: "running",
      error: null,
    });
  } else if (job.provider === "gojiberry") {
    // Only an explicitly read-only query was allowed; do not replay it or invent a result.
    await updateJob(job, {
      status: "failed",
      error:
        "Owner acknowledged the interrupted read-only query. No result was imported and it was not automatically repeated.",
      completedAt: new Date(),
    });
  } else
    throw new Error("Inspect generated drafts before reconciling this stage.");
  return { success: true };
}
export function registerPipelineRoutes(app: Express) {
  app.post("/api/scheduled/pipeline", async (req, res) => {
    try {
      const cookie = parse(req.headers.cookie ?? "").app_session_id;
      if (!cookie) throw new Error("Missing schedule credential.");
      const { payload } = await jwtVerify(
        cookie,
        new TextEncoder().encode(process.env.MANUS_JWT_SECRET),
        { algorithms: ["HS256"] }
      );
      if (
        payload.appId !== process.env.MANUS_PROJECT_ID ||
        typeof payload.openId !== "string" ||
        !payload.openId.startsWith("cron_")
      )
        throw new Error("Invalid schedule identity.");
      const response = await fetch(
        `${process.env.MANUS_OAUTH_API_URL}/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jwt_token: cookie,
            project_id: process.env.MANUS_PROJECT_ID,
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!response.ok)
        throw new Error("Schedule identity could not be verified.");
      const identity = await response.json();
      if (
        !identity.taskUid ||
        identity.projectId !== process.env.MANUS_PROJECT_ID
      )
        throw new Error("Invalid schedule attribution.");
      const [p] = await (await db())
        .select()
        .from(t.pipelines)
        .where(eq(t.pipelines.scheduleTaskUid, identity.taskUid))
        .limit(1);
      if (!p) throw new Error("Schedule is not mapped to a pipeline.");
      const result = await tickPipeline(p.companyId);
      res.json(result);
    } catch {
      res.status(401).json({
        error:
          "Scheduled execution could not be authenticated or completed. Inspect the pipeline in the owner workspace.",
      });
    }
  });
}
