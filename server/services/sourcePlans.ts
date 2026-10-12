import { pricingSummary } from "../../shared/sourcePreview";
import { createHash } from "node:crypto";
import { and, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db, scopedRow } from "./tenant";
import { companies, icps, sourcePlans } from "../../drizzle/schema";
import { apifyRequest } from "./apifyAccess";
import { generate } from "./generation";
import {
  sourceActors,
  sourceAnswersSchema,
  sourceRecommendationSchema,
  sourceSelectionSchema,
  type SourceActor,
  type SourceAnswers,
  type SourceSelection,
} from "../../shared/sourcePlans";

export function sourceContextHash(company: unknown, criteria: unknown) {
  return createHash("sha256")
    .update(JSON.stringify({ company, criteria }))
    .digest("hex");
}
async function context(companyId: number, icpId: number) {
  const icp = await scopedRow<typeof icps.$inferSelect>(icps, icpId, companyId);
  const [company] = await (await db())
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);
  if (!company) throw new Error("Company is not available.");
  const profile = {
    name: company.name,
    website: company.website,
    offer: company.brand.offer,
    claims: company.brand.approvedClaims,
  };
  return { company, icp, hash: sourceContextHash(profile, icp.criteria) };
}
let cachedCatalog:
  | { companyId: number; expires: number; items: SourceActor[] }
  | undefined;
export async function discoverSourceCatalog(
  companyId: number,
  request: typeof apifyRequest = apifyRequest
): Promise<SourceActor[]> {
  if (
    cachedCatalog?.companyId === companyId &&
    cachedCatalog.expires > Date.now()
  )
    return cachedCatalog.items;
  const items: SourceActor[] = [];
  // Three metadata requests at a time, never an actor run. Default schemas and pricing are live evidence.
  for (let start = 0; start < sourceActors.length; start += 3) {
    const group = await Promise.all(
      sourceActors.slice(start, start + 3).map(async actor => {
        try {
          const path = actor.id.replace("/", "~");
          const [metadata, build] = await Promise.all([
            request(companyId, `actors/${path}`),
            request(companyId, `actors/${path}/builds/default`),
          ]);
          const schema =
            typeof build.data?.inputSchema === "string"
              ? JSON.parse(build.data.inputSchema)
              : build.data?.inputSchema;
          if (!metadata.data?.id || !schema || typeof schema !== "object")
            throw new Error("No verified default input schema.");
          const pricingInfos = metadata.data.pricingInfos;
          const pricing = Array.isArray(pricingInfos)
            ? (pricingInfos.at(-1) ?? null)
            : null;
          return {
            ...actor,
            available: !metadata.data.isDeprecated,
            modifiedAt: metadata.data.modifiedAt ?? null,
            checkedAt: new Date().toISOString(),
            schema,
            pricing,
            stats: metadata.data.stats ?? null,
            caveat: actor.adapter
              ? "Validated input adapter is available; account usage still applies."
              : "Verified catalog source; execution and result-normalization adapter is not activated yet. No automatic fallback.",
          } as SourceActor;
        } catch {
          return {
            ...actor,
            available: false,
            modifiedAt: null,
            checkedAt: new Date().toISOString(),
            schema: null,
            pricing: null,
            stats: null,
            caveat:
              "Metadata or default input schema could not be verified. Do not run this source yet.",
          } as SourceActor;
        }
      })
    );
    items.push(...group);
  }
  cachedCatalog = { companyId, expires: Date.now() + 10 * 60000, items };
  return items;
}
export async function listSourcePlans(companyId: number, icpId: number) {
  const ctx = await context(companyId, icpId);
  const rows = await (
    await db()
  )
    .select()
    .from(sourcePlans)
    .where(
      and(eq(sourcePlans.companyId, companyId), eq(sourcePlans.icpId, icpId))
    )
    .orderBy(desc(sourcePlans.id))
    .limit(5);
  return {
    plans: rows.map(row => ({ ...row, stale: row.contextHash !== ctx.hash })),
    criteria: ctx.icp.criteria,
  };
}
export async function generateSourceRecommendation(
  company: Pick<typeof companies.$inferSelect, "name" | "website" | "brand">,
  criteria: (typeof icps.$inferSelect)["criteria"],
  input: SourceAnswers,
  catalog: SourceActor[]
) {
  const answers = sourceAnswersSchema.parse(input);
  if (!catalog.some(actor => actor.available && actor.role === "discovery"))
    throw new Error(
      "Apify source discovery could not verify an available actor. Check provider access and retry."
    );
  const recommendation = await generate(
    sourceRecommendationSchema,
    "Propose an evidence-led, signal-first B2B source strategy for exactly this ICP. Select only IDs from the verified available catalog and their supplied role. Choose 2-6 relevant sources, not every tool. Distinguish discovery of an active initiative, evidence crawl, and optional contact enrichment after qualification. Explain the best sources for the stated outcome even when an execution adapter is not yet activated; mention that activation limitation. Use exact statement/original date requirements; newly indexed jobs are not necessarily newly posted. Company headcount is not engineering headcount, adoption is not pain, backlog alone is not qualification. Name exactly the selected ICP as the cohort in a short natural label (maximum 100 characters); do not concatenate unrelated cohorts into its title or criteria. Different ICPs must remain separate: choose only the evidence and sources that fit this one. For public GitHub use official API evidence, for government awards prefer official USAspending; SAM opportunity is not award recipient or budget. Exclude staffing-only firms where appropriate. Never invent source pricing or internal prospect needs. Provide 1-5 focused natural-language search phrases for this ICP; no invented company.com domains, invalid wildcard site operators, careers pseudo-domains, fixed hardcoded dates, or unsupported posted operators. Recency is a separate validated actor input, not a date frozen in the query. Treat verified adapter status and supplied defaults as known app capabilities, not open questions to the user. Do not imply full HTML snapshots when the bounded crawler only saves text/markdown. Provide qualification rules, true unknowns and relevant official alternatives. Recommendations do not start scraping or enrich people.",
    {
      company: {
        name: company.name,
        website: company.website,
        brand: company.brand,
      },
      icp: criteria,
      answers,
      catalog: catalog.map(actor => ({
        id: actor.id,
        name: actor.name,
        role: actor.role,
        use: actor.use,
        available: actor.available,
        adapter: actor.adapter,
        caveat: actor.caveat,
        pricing: pricingSummary(actor.pricing),
        fields: Object.fromEntries(
          Object.entries(
            (actor.schema?.properties ?? {}) as Record<string, any>
          )
            .filter(([key]) =>
              /quer|search|limit|max|date|posted|role|company|startUrl|url|mode|timeRange/i.test(
                key
              )
            )
            .map(([key, value]) => [
              key,
              {
                type: value.type,
                minimum: value.minimum,
                maximum: value.maximum,
                enum: value.enum,
                description: String(value.description ?? "").slice(0, 350),
              },
            ])
        ),
      })),
    }
  );
  for (const source of recommendation.sources) {
    const actor = catalog.find(
      item => item.id === source.actorId && item.available
    );
    if (!actor || actor.role !== source.role)
      throw new Error(
        "AI proposed an unverified source. Your prior strategy is unchanged."
      );
  }
  if (
    new Set(recommendation.sources.map(source => source.actorId)).size !==
    recommendation.sources.length
  )
    throw new Error("AI repeated a source. Review the strategy again.");
  if (
    !recommendation.sources.some(source => source.role === "discovery") ||
    !recommendation.sources.some(source => source.role === "evidence")
  )
    throw new Error(
      "A source strategy needs both discovery and primary evidence."
    );
  return recommendation;
}
export async function recommendSources(
  companyId: number,
  icpId: number,
  input: SourceAnswers
) {
  const answers = sourceAnswersSchema.parse(input);
  const ctx = await context(companyId, icpId);
  const catalog = await discoverSourceCatalog(companyId);
  const recommendation = await generateSourceRecommendation(
    ctx.company,
    ctx.icp.criteria,
    answers,
    catalog
  );
  const current = await context(companyId, icpId);
  if (current.hash !== ctx.hash)
    throw new Error(
      "Company or ICP changed during planning. Review the new context and recommend again."
    );
  const [insert] = await (await db()).insert(sourcePlans).values({
    companyId,
    icpId,
    answers,
    recommendation,
    catalog,
    contextHash: ctx.hash,
  });
  return { id: insert.insertId };
}
export async function approveSources(
  companyId: number,
  userId: number,
  id: number,
  input: SourceSelection
) {
  const selection = sourceSelectionSchema.parse(input);
  const row = await scopedRow<typeof sourcePlans.$inferSelect>(
    sourcePlans,
    id,
    companyId
  );
  const ctx = await context(companyId, row.icpId);
  if (ctx.hash !== row.contextHash)
    throw new Error(
      "Company or ICP changed. Generate a current source plan before approval."
    );
  const [latest] = await (
    await db()
  )
    .select({ id: sourcePlans.id })
    .from(sourcePlans)
    .where(
      and(
        eq(sourcePlans.companyId, companyId),
        eq(sourcePlans.icpId, row.icpId)
      )
    )
    .orderBy(desc(sourcePlans.id))
    .limit(1);
  if (latest?.id !== id)
    throw new Error(
      "A newer strategy exists. Review the latest strategy before approval."
    );
  const catalog = await discoverSourceCatalog(companyId);
  const actor = catalog.find(
    item =>
      item.id === selection.actorId &&
      item.available &&
      item.role === "discovery"
  );
  if (!actor) throw new Error("Choose an available verified discovery source.");
  for (const id of selection.optionalActorIds)
    if (
      !catalog.some(
        item => item.id === id && item.available && item.role !== "discovery"
      )
    )
      throw new Error("An optional source is not verified.");
  await (
    await db()
  )
    .update(sourcePlans)
    .set({ selection, approvedAt: new Date(), approvedBy: userId })
    .where(and(eq(sourcePlans.id, id), eq(sourcePlans.companyId, companyId)));
  return { success: true, executable: actor.adapter };
}
export async function requireSourcePlan(companyId: number, icpId: number) {
  const ctx = await context(companyId, icpId);
  const [plan] = await (
    await db()
  )
    .select()
    .from(sourcePlans)
    .where(
      and(eq(sourcePlans.companyId, companyId), eq(sourcePlans.icpId, icpId))
    )
    .orderBy(desc(sourcePlans.id))
    .limit(1);
  if (!plan?.approvedAt || !plan.selection)
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Review and approve a source strategy for this ICP in Sources before starting discovery.",
    });
  if (plan.contextHash !== ctx.hash)
    throw new Error(
      "This source strategy is stale because the company or ICP changed. Review it again in Sources."
    );
  const actor = sourceActors.find(item => item.id === plan.selection!.actorId);
  if (!actor?.adapter || actor.role !== "discovery")
    throw new Error(
      "Your selected source is proposed but its execution adapter is not activated. Review Sources; TailorPitch will not silently replace it with Google Search."
    );
  return plan;
}
