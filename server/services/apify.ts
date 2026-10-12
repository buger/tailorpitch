import { and, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db, scopedRow, recordActivity } from "./tenant";
import { sourcingRuns, leads, icps, companies } from "../../drizzle/schema";
import { getIntegration } from "./credentials";
import { analyzeLead } from "./generation";
import { safeUrl } from "../../shared/domain";

export function publicWebsite(value: string) {
  safeUrl.parse(value);
  const u = new URL(value);
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^(?:\d{1,3}\.){3}\d{1,3}$/.test(host) ||
    host.includes(":") ||
    !host.includes(".")
  )
    throw new Error("Use a public business website, not an internal address.");
  return u;
}
export async function apifyRequest(
  companyId: number,
  path: string,
  init: RequestInit = {}
) {
  const credential = await getIntegration<{ token: string }>(
    companyId,
    "apify"
  );
  if (!credential)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Connect Apify in company settings before sourcing or research.",
    });
  const response = await fetch(`https://api.apify.com/v2/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${credential.config.token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 401 || response.status === 403
        ? "Apify authorization failed. Reconnect your token in settings."
        : `Apify request failed (${response.status}). Check the run and retry.`
    );
  const body = await response.json();
  if (body.error)
    throw new Error(
      "Apify returned an error. Check your actor access and account settings."
    );
  return body;
}
export async function connectApify(companyId: number, token: string) {
  const response = await fetch("https://api.apify.com/v2/users/me", {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "Apify token could not be verified. Check its permissions."
    );
  const data = await response.json();
  if (!data.data?.id)
    throw new Error("Apify did not return an account identity.");
  const { saveIntegration } = await import("./credentials");
  await saveIntegration(
    companyId,
    "apify",
    { token },
    data.data.username ?? "Apify account"
  );
  return { success: true };
}
export async function startRun(
  companyId: number,
  args: { icpId?: number; leadId?: number; query?: string; limit?: number }
) {
  const d = await db();
  let icp: typeof icps.$inferSelect | null = null;
  let lead: typeof leads.$inferSelect | null = null;
  if (args.icpId) icp = await scopedRow(icps, args.icpId, companyId);
  if (args.leadId) lead = await scopedRow(leads, args.leadId, companyId);
  if (lead?.status === "suppressed")
    throw new Error(
      "This lead is suppressed. Research cannot reopen outreach."
    );
  const type = lead ? "research" : "discovery";
  if (!(await getIntegration(companyId, "apify")))
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Connect Apify in company settings first.",
    });
  const input = lead
    ? {
        startUrls: [{ url: publicWebsite(lead.website).href }],
        maxCrawlPages: 4,
        maxCrawlDepth: 1,
        crawlerType: "playwright:adaptive",
        respectRobotsTxtFile: true,
        saveMarkdown: true,
        maxConcurrency: 2,
        requestTimeoutSecs: 30,
      }
    : {
        queries: args.query?.replace(/[\r\n]+/g, " "),
        maxPagesPerQuery: Math.ceil((args.limit ?? 10) / 10),
        maximumLeadsEnrichmentRecords: 0,
        languageCode: "en",
      };
  const reservation = await d.transaction(async tx => {
    await tx
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .for("update");
    const [existing] = await tx
      .select()
      .from(sourcingRuns)
      .where(
        and(
          eq(sourcingRuns.companyId, companyId),
          lead
            ? eq(sourcingRuns.leadId, lead.id)
            : eq(sourcingRuns.icpId, icp!.id),
          eq(sourcingRuns.type, type),
          inArray(sourcingRuns.status, [
            "STARTING",
            "READY",
            "RUNNING",
            "TIMING-OUT",
            "PROCESSING",
            "UNKNOWN",
          ])
        )
      )
      .limit(1);
    if (existing) return { id: existing.id, existing: true };
    const [insert] = await tx.insert(sourcingRuns).values({
      companyId,
      icpId: icp?.id ?? lead?.icpId,
      leadId: lead?.id,
      type,
      requestedLimit: args.limit ?? 4,
      query: args.query?.replace(/[\r\n]+/g, " ") ?? lead?.website,
    });
    return { id: insert.insertId, existing: false };
  });
  if (reservation.existing) {
    const previous = await scopedRow<typeof sourcingRuns.$inferSelect>(
      sourcingRuns,
      reservation.id,
      companyId
    );
    if (
      previous.status === "STARTING" &&
      !previous.externalId &&
      Date.now() - previous.createdAt.getTime() > 60000
    ) {
      await d
        .update(sourcingRuns)
        .set({
          status: "UNKNOWN",
          error:
            "Start was interrupted. Check Apify run history and reconcile this run before another start.",
        })
        .where(
          and(
            eq(sourcingRuns.id, previous.id),
            eq(sourcingRuns.companyId, companyId),
            eq(sourcingRuns.status, "STARTING")
          )
        );
    }
    return { id: reservation.id };
  }
  const id = reservation.id;
  try {
    const { data } = await apifyRequest(
      companyId,
      `actors/${lead ? "apify~website-content-crawler" : "apify~google-search-scraper"}/runs?timeout=600&restartOnError=false`,
      { method: "POST", body: JSON.stringify(input) }
    );
    if (!data?.id) throw new Error("Apify did not return a run ID.");
    await d
      .update(sourcingRuns)
      .set({
        externalId: data.id,
        datasetId: data.defaultDatasetId,
        status: data.status ?? "RUNNING",
      })
      .where(
        and(eq(sourcingRuns.id, id), eq(sourcingRuns.companyId, companyId))
      );
    if (lead)
      await d
        .update(leads)
        .set({ status: "researching" })
        .where(
          and(
            eq(leads.id, lead.id),
            eq(leads.companyId, companyId),
            sql`${leads.status} <> 'suppressed'`
          )
        );
    await recordActivity(
      companyId,
      lead
        ? `Research started for ${lead.companyName}`
        : `Lead search started for ${icp?.criteria.name}`,
      type,
      lead?.id
    );
    return { id };
  } catch (e) {
    const current = await scopedRow<typeof sourcingRuns.$inferSelect>(
      sourcingRuns,
      id,
      companyId
    );
    if (current.externalId) return { id };
    const uncertain =
      e instanceof TypeError ||
      (e instanceof Error && ["TimeoutError", "AbortError"].includes(e.name));
    await d
      .update(sourcingRuns)
      .set({
        status: uncertain ? "UNKNOWN" : "FAILED",
        error: uncertain
          ? "The Apify start result is unknown. Check your Apify run history before starting again; duplicate starts are blocked."
          : e instanceof Error
            ? e.message
            : "Run failed",
        completedAt: new Date(),
      })
      .where(
        and(eq(sourcingRuns.id, id), eq(sourcingRuns.companyId, companyId))
      );
    throw new Error(
      uncertain
        ? "Apify start result is uncertain. Check your Apify run history; do not start a duplicate."
        : e instanceof Error
          ? e.message
          : "Run failed"
    );
  }
}
export async function syncRun(companyId: number, id: number) {
  const d = await db();
  let run = await scopedRow<typeof sourcingRuns.$inferSelect>(
    sourcingRuns,
    id,
    companyId
  );
  if (
    run.status === "STARTING" &&
    !run.externalId &&
    Date.now() - run.createdAt.getTime() > 60000
  ) {
    await d
      .update(sourcingRuns)
      .set({
        status: "UNKNOWN",
        error:
          "The start was interrupted. Check Apify run history and reconcile before starting again.",
      })
      .where(
        and(eq(sourcingRuns.id, id), eq(sourcingRuns.companyId, companyId))
      );
    return { status: "UNKNOWN", imported: run.imported };
  }
  if (
    ["IMPORTED", "FAILED", "ABORTED", "TIMED-OUT", "UNKNOWN"].includes(
      run.status
    )
  )
    return { status: run.status, imported: run.imported };
  if (run.status === "PROCESSING") {
    if (
      !run.processingAt ||
      Date.now() - run.processingAt.getTime() < 5 * 60 * 1000
    )
      return { status: run.status, imported: run.imported };
    await d
      .update(sourcingRuns)
      .set({ status: "SUCCEEDED", processingAt: null })
      .where(
        and(
          eq(sourcingRuns.id, id),
          eq(sourcingRuns.companyId, companyId),
          eq(sourcingRuns.status, "PROCESSING"),
          eq(sourcingRuns.processingAt, run.processingAt)
        )
      );
    run = await scopedRow<typeof sourcingRuns.$inferSelect>(
      sourcingRuns,
      id,
      companyId
    );
  }
  if (!run.externalId)
    throw new Error("This run did not start successfully. Start a new run.");
  const { data } = await apifyRequest(
    companyId,
    `actor-runs/${encodeURIComponent(run.externalId)}`
  );
  if (data.status !== "SUCCEEDED") {
    const terminal = ["FAILED", "ABORTED", "TIMED-OUT"].includes(data.status);
    await d
      .update(sourcingRuns)
      .set({
        status: data.status,
        error: terminal ? "Apify run did not complete successfully." : null,
        completedAt: terminal ? new Date() : null,
      })
      .where(
        and(eq(sourcingRuns.id, id), eq(sourcingRuns.companyId, companyId))
      );
    if (terminal && run.leadId)
      await d
        .update(leads)
        .set({ status: "new" })
        .where(
          and(
            eq(leads.id, run.leadId),
            eq(leads.companyId, companyId),
            sql`${leads.status} <> 'suppressed'`
          )
        );
    return { status: data.status, imported: run.imported };
  }
  const [lock] = await d
    .update(sourcingRuns)
    .set({
      status: "PROCESSING",
      datasetId: data.defaultDatasetId,
      processingAt: new Date(),
    })
    .where(
      and(
        eq(sourcingRuns.id, id),
        eq(sourcingRuns.companyId, companyId),
        inArray(sourcingRuns.status, [
          "STARTING",
          "READY",
          "RUNNING",
          "SUCCEEDED",
          "TIMING-OUT",
        ])
      )
    );
  if (!lock.affectedRows)
    return { status: "PROCESSING", imported: run.imported };
  try {
    const items = await apifyRequest(
      companyId,
      `datasets/${encodeURIComponent(data.defaultDatasetId)}/items?clean=true&limit=${run.type === "research" ? 4 : 100}`
    );
    if (!Array.isArray(items))
      throw new Error("Apify dataset is not in the expected format.");
    const [already] = await d
      .select({ n: sql<number>`count(*)` })
      .from(leads)
      .where(and(eq(leads.companyId, companyId), eq(leads.sourceRunId, id)));
    let imported = run.type === "discovery" ? Number(already.n) : 0;
    if (run.type === "research") {
      const lead = await scopedRow<typeof leads.$inferSelect>(
        leads,
        run.leadId!,
        companyId
      );
      const icp = lead.icpId
        ? await scopedRow<typeof icps.$inferSelect>(icps, lead.icpId, companyId)
        : null;
      const [company] = await d
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
      const sources = items
        .map(item => ({
          url: item.url,
          text: String(item.markdown ?? item.text ?? "").slice(0, 18000),
        }))
        .filter(
          s =>
            typeof s.url === "string" &&
            s.text.length > 30 &&
            safeUrl.safeParse(s.url).success
        );
      if (!sources.length)
        throw new Error(
          "No readable public research was returned. Try a different website or run."
        );
      const result = await analyzeLead(lead, icp, company, sources);
      const requiredKeys = icp
        ? (
            [
              "industries",
              "geography",
              "companySize",
              "roles",
              "keywords",
              "signals",
              "exclusions",
            ] as const
          ).filter(key => icp.criteria[key].trim())
        : [];
      const qualified = Boolean(
        icp &&
          result.score >= icp.criteria.minScore &&
          requiredKeys.every(key =>
            result.criteria.some(c => c.key === key && c.status === "matched")
          ) &&
          result.criteria.every(c => c.status === "matched")
      );
      const currentLead = await scopedRow<typeof leads.$inferSelect>(
        leads,
        lead.id,
        companyId
      );
      await d
        .update(leads)
        .set({
          research: result,
          score: result.score,
          status:
            currentLead.status === "suppressed"
              ? "suppressed"
              : qualified
                ? "qualified"
                : "researched",
          researchedAt: new Date(),
        })
        .where(
          and(
            eq(leads.id, lead.id),
            eq(leads.companyId, companyId),
            sql`${leads.status} <> 'suppressed'`
          )
        );
      await recordActivity(
        companyId,
        `Research saved for ${lead.companyName}; ${result.score}/100 fit, ${qualified ? "criteria verified" : "review remaining criteria"}`,
        "researched",
        lead.id
      );
      imported = 1;
    } else {
      const candidates = items.flatMap(item =>
        Array.isArray(item.organicResults) ? item.organicResults : []
      );
      const excludedDomains = [
        "google.com",
        "linkedin.com",
        "facebook.com",
        "instagram.com",
        "youtube.com",
        "x.com",
        "twitter.com",
        "wikipedia.org",
        "reddit.com",
        "reqproof.com",
      ];
      for (const item of candidates) {
        if (imported >= run.requestedLimit) break;
        try {
          const u = publicWebsite(item.url);
          const domain = u.hostname.replace(/^www\./, "");
          if (
            excludedDomains.some(e => domain === e || domain.endsWith("." + e))
          )
            continue;
          const [insert] = await d
            .insert(leads)
            .values({
              companyId,
              icpId: run.icpId,
              companyName: String(item.title ?? domain).slice(0, 200),
              website: u.origin,
              domain,
              source: "apify-search",
              sourceRunId: id,
              sourceUrl: u.href,
              notes: `Source discovery snippet (not verified fit): ${String(item.description ?? "").slice(0, 3000)}`,
            })
            .onDuplicateKeyUpdate({ set: { domain } });
          if (insert.insertId > 0) imported++;
        } catch {
          /* malformed/publicly unsupported candidate skipped, not marked qualified */
        }
      }
      const [total] = await d
        .select({ n: sql<number>`count(*)` })
        .from(leads)
        .where(and(eq(leads.companyId, companyId), eq(leads.sourceRunId, id)));
      imported = Number(total.n);
      await recordActivity(
        companyId,
        `${imported} new discovery candidates imported. Research is required to verify ICP fit.`,
        "discovery"
      );
    }
    await d
      .update(sourcingRuns)
      .set({
        status: "IMPORTED",
        imported,
        completedAt: new Date(),
        error: null,
      })
      .where(
        and(eq(sourcingRuns.id, id), eq(sourcingRuns.companyId, companyId))
      );
    return { status: "IMPORTED", imported };
  } catch (e) {
    await d
      .update(sourcingRuns)
      .set({
        status: "FAILED",
        error: e instanceof Error ? e.message : "Result processing failed",
        completedAt: new Date(),
      })
      .where(
        and(eq(sourcingRuns.id, id), eq(sourcingRuns.companyId, companyId))
      );
    if (run.leadId)
      await d
        .update(leads)
        .set({ status: "new" })
        .where(
          and(
            eq(leads.id, run.leadId),
            eq(leads.companyId, companyId),
            sql`${leads.status} <> 'suppressed'`
          )
        );
    throw e;
  }
}
