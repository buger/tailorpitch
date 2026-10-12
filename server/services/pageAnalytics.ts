import { and, desc, eq, sql } from "drizzle-orm";
import { db, scopedRow } from "./tenant";
import { pages, pageVisits, submissions } from "../../drizzle/schema";
export function shouldCountPageOpen(
  _user: unknown,
  _userAgent: string
): boolean {
  // Every actual visible page load counts, including owner/admin and automation.
  // Do not confuse views with people; same-event request retries remain idempotent.
  return true;
}
export async function recordPageOpen(
  token: string,
  visitKey: string,
  database: typeof db = db
) {
  const d = await database();
  return d.transaction(async tx => {
    // Lock prevents unpublishing during event insertion, and serializes increments.
    const [page] = await tx
      .select()
      .from(pages)
      .where(and(eq(pages.shareToken, token), eq(pages.status, "published")))
      .for("update");
    if (!page) return { recorded: false };
    const [result] = await tx
      .insert(pageVisits)
      .ignore()
      .values({ companyId: page.companyId, pageId: page.id, visitKey });
    if (result.affectedRows === 1)
      await tx
        .update(pages)
        .set({ views: sql`${pages.views} + 1` })
        .where(and(eq(pages.id, page.id), eq(pages.companyId, page.companyId)));
    return { recorded: result.affectedRows === 1 };
  });
}
export async function getPageAnalytics(companyId: number, pageId: number) {
  const page = await scopedRow<typeof pages.$inferSelect>(
    pages,
    pageId,
    companyId
  );
  const d = await db();
  const scope = and(
    eq(pageVisits.companyId, companyId),
    eq(pageVisits.pageId, pageId)
  );
  const [counts] = await d
    .select({
      today: sql<number>`COUNT(CASE WHEN ${pageVisits.createdAt} >= UTC_DATE() THEN 1 END)`,
    })
    .from(pageVisits)
    .where(scope);
  const [last] = await d
    .select({ openedAt: pageVisits.createdAt })
    .from(pageVisits)
    .where(scope)
    .orderBy(desc(pageVisits.createdAt))
    .limit(1);
  const [forms] = await d
    .select({ total: sql<number>`COUNT(*)` })
    .from(submissions)
    .where(
      and(eq(submissions.companyId, companyId), eq(submissions.pageId, pageId))
    );
  const days = await d
    .select({
      day: sql<string>`DATE_FORMAT(${pageVisits.createdAt}, '%Y-%m-%d')`,
      opens: sql<number>`COUNT(*)`,
    })
    .from(pageVisits)
    .where(
      and(
        scope,
        sql`${pageVisits.createdAt} >= DATE_SUB(UTC_DATE(), INTERVAL 13 DAY)`
      )
    )
    // Select/group column qualification can differ in Drizzle; use the exact
    // selected expression position for ONLY_FULL_GROUP_BY compatibility.
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return {
    totalOpens: page.views,
    opensToday: Number(counts.today),
    lastOpened: last?.openedAt ?? null,
    submissions: Number(forms.total),
    days: days.map(d => ({ day: d.day, opens: Number(d.opens) })),
    measurement:
      "Every visible published-page load or revisit, including refreshes and signed-in/admin previews. Same-event retries are deduplicated. Not unique people; automated rendered views may also count.",
  };
}
