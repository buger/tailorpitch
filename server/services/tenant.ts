import { and, eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  companies,
  memberships,
  icps,
  activity,
  type User,
} from "../../drizzle/schema";
import type { Brand, IcpCriteria } from "../../shared/domain";

export const PILOT_OWNER_EMAIL = "hello@reqproof.com";
export const proofBrand: Brand = {
  offer:
    "Proof is AI-native software assurance for existing codebases. Its Software Intent Graph connects approved requirements, code, dependencies, hazards, checks and change history. It reduces the work between a software change and the evidence required to trust it. Start with one change in the existing repository and coding-agent workflow; scope and fee are agreed before work begins.",
  voice:
    "Clear, precise, evidence-led and technically literate. Short sentences. Speak directly to engineering leaders. Acknowledge limits, avoid hype, guarantees and manufactured urgency. Write Proof in prose, never ReqProof except in the domain.",
  websiteInstructions:
    "Respect Proof branding: paper, ink, sage accents, serif headings. Explain the prospect context using sourced facts. Present a specific proposed first change or component-level pilot, not a claim of an existing relationship. The prospect name identifies the intended audience, not an endorsement. Keep uncertainty explicit.",
  outreachInstructions:
    "Open with a relevant, sourced observation. Explain why Proof may be relevant, then make a modest ask about one change. Keep emails concise (roughly 100–150 words), LinkedIn messages under 80 words, and X messages under 60 words. Never invent compliments, relationships, budgets or timing. No unsolicited attachments. Include a simple opt-out in email.",
  approvedClaims:
    "Proof connects requirements, engineering work and verification evidence. Software Intent Graph links intent, dependencies, code, risks and checks. Requirement recovery, hazard analysis, MC/DC and selected formal verification are scoped practices. NASA-grade describes engineering ambition, not NASA endorsement, DO-178C certification, or a replacement for an assurance process. Public ledger at https://reqproof.com/findings supports only its specific dated findings; those projects are not necessarily customers.",
  bookingUrl: "https://reqproof.com/demo",
  logoUrl: "https://reqproof.com/assets/brand/proof-mark.svg",
  primaryColor: "#24302a",
  backgroundColor: "#f3f0e9",
  accentColor: "#7fa34e",
  inspiration: [
    {
      url: "https://reqproof.com/brand",
      note: "Official Proof brand: paper and ink, serif headings, precise source-linked claims; sage accents only.",
    },
  ],
};
const starterProfiles: IcpCriteria[] = [
  {
    name: "Engineering teams adopting coding agents",
    industries: "B2B SaaS, developer tools, software infrastructure",
    geography: "North America and Europe",
    companySize: "20–500 employees",
    roles: "CTO, VP Engineering, Head of Engineering, Engineering Manager",
    keywords: "AI coding agents, agentic engineering, existing codebase",
    signals:
      "Public discussion of AI-assisted development, review workload or regression risk",
    exclusions:
      "Solo hobby projects; no production codebase; agencies with no retained product",
    minScore: 70,
  },
  {
    name: "Reliability-sensitive developer infrastructure",
    industries:
      "API platforms, databases, observability, developer infrastructure",
    geography: "Global English-speaking teams",
    companySize: "10–1000 employees",
    roles: "CTO, Head of Platform, Staff Engineer, Reliability lead",
    keywords: "API infrastructure, reliability, regression testing",
    signals:
      "Complex dependencies, critical compatibility promises, recurring regressions",
    exclusions: "Consumer content businesses; no active engineering team",
    minScore: 75,
  },
];
export async function db() {
  const value = await getDb();
  if (!value)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database is unavailable. Please try again.",
    });
  return value;
}
let seeding: Promise<void> | undefined;
export async function ensurePilot() {
  if (!seeding)
    seeding = seedPilot().catch(e => {
      seeding = undefined;
      throw e;
    });
  await seeding;
}
async function seedPilot() {
  const d = await db();
  await d
    .insert(companies)
    .values({
      slug: "proof",
      name: "Proof",
      website: "https://reqproof.com/",
      brand: proofBrand,
    })
    .onDuplicateKeyUpdate({ set: { slug: "proof" } });
  await d.transaction(async tx => {
    const [company] = await tx
      .select()
      .from(companies)
      .where(eq(companies.slug, "proof"))
      .for("update");
    if (company.seedVersion < 1) {
      await tx
        .insert(icps)
        .values(
          starterProfiles.map(criteria => ({ companyId: company.id, criteria }))
        );
      await tx
        .update(companies)
        .set({ seedVersion: 1 })
        .where(eq(companies.id, company.id));
    }
  });
}
export function isPilotOwner(user: Pick<User, "email">) {
  return user.email?.trim().toLowerCase() === PILOT_OWNER_EMAIL;
}
export async function requireCompany(user: User) {
  await ensurePilot();
  const d = await db();
  if (isPilotOwner(user)) {
    const [pilot] = await d
      .select()
      .from(companies)
      .where(eq(companies.slug, "proof"))
      .limit(1);
    await d
      .insert(memberships)
      .values({ companyId: pilot.id, userId: user.id, role: "owner" })
      .onDuplicateKeyUpdate({ set: { role: "owner" } });
  }
  const [result] = await d
    .select({ company: companies, role: memberships.role })
    .from(memberships)
    .innerJoin(companies, eq(companies.id, memberships.companyId))
    .where(eq(memberships.userId, user.id))
    .orderBy(memberships.id)
    .limit(1);
  if (!result)
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "This pilot is private. Access is approved for hello@reqproof.com. Company registration will be available later.",
    });
  return result;
}
export function requireOwner(role: string) {
  if (role !== "owner")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the company owner can change this setting.",
    });
}
export async function recordActivity(
  companyId: number,
  message: string,
  type: string,
  leadId?: number
) {
  await (await db())
    .insert(activity)
    .values({ companyId, leadId, message, type });
}
export async function scopedRow<T>(
  table: any,
  id: number,
  companyId: number
): Promise<T> {
  const [row] = await (
    await db()
  )
    .select()
    .from(table)
    .where(and(eq(table.id, id), eq(table.companyId, companyId)))
    .limit(1);
  if (!row)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Record not found in your company.",
    });
  return row as T;
}
