import { z } from "zod";

export const safeUrl = z
  .string()
  .url()
  .refine(s => {
    try {
      const u = new URL(s);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an HTTPS URL without credentials");
export const brandSchema = z.object({
  offer: z.string().min(10).max(10000),
  voice: z.string().max(5000),
  websiteInstructions: z.string().max(8000),
  outreachInstructions: z.string().max(8000),
  approvedClaims: z.string().max(8000),
  bookingUrl: safeUrl,
  logoUrl: z.string().max(2000),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  inspiration: z
    .array(z.object({ url: safeUrl, note: z.string().max(2000) }))
    .max(12),
});
export type Brand = z.infer<typeof brandSchema>;
export const icpSchema = z.object({
  name: z.string().min(2).max(120),
  industries: z.string().max(2000),
  geography: z.string().max(1000),
  companySize: z.string().max(500),
  roles: z.string().max(1000),
  keywords: z.string().min(2).max(2000),
  signals: z.string().max(2000),
  exclusions: z.string().max(2000),
  minScore: z.number().int().min(0).max(100),
});
export type IcpCriteria = z.infer<typeof icpSchema>;
export const leadInputSchema = z.object({
  companyName: z.string().min(2).max(200),
  website: safeUrl,
  contactName: z.string().max(200).default(""),
  email: z.union([z.literal(""), z.string().email()]).default(""),
  title: z.string().max(200).default(""),
  linkedinUrl: z.union([z.literal(""), safeUrl]).default(""),
  xUrl: z.union([z.literal(""), safeUrl]).default(""),
  icpId: z.number().int().positive().nullable(),
  notes: z.string().max(5000).default(""),
});
export const researchSchema = z.object({
  summary: z.string().min(10).max(4000),
  facts: z.array(z.object({ claim: z.string(), sourceUrl: safeUrl })).max(15),
  hypotheses: z.array(z.string()).max(10),
  pains: z.array(z.string()).max(10),
  relevance: z.string().max(3000),
  score: z.number().int().min(0).max(100),
  fitReason: z.string().max(3000),
  criteria: z
    .array(
      z.object({
        key: z.enum([
          "industries",
          "geography",
          "companySize",
          "roles",
          "keywords",
          "signals",
          "exclusions",
        ]),
        criterion: z.string(),
        status: z.enum(["matched", "not_matched", "unknown"]),
        evidence: z.string(),
      })
    )
    .max(15),
  unknowns: z.array(z.string()).max(10),
  personalization: z.array(z.string()).max(10),
});
export type Research = z.infer<typeof researchSchema>;
export const pageTextContentSchema = z.object({
  eyebrow: z.string().max(160),
  headline: z.string().min(10).max(180),
  subheadline: z.string().max(1000),
  contextTitle: z.string().max(180),
  contextBody: z.string().max(2500),
  benefits: z
    .array(z.object({ title: z.string().max(160), body: z.string().max(1000) }))
    .min(2)
    .max(4),
  pilotTitle: z.string().max(180),
  pilotBody: z.string().max(2000),
  steps: z
    .array(z.object({ title: z.string().max(120), body: z.string().max(800) }))
    .min(2)
    .max(4),
  ctaText: z.string().max(80),
  closing: z.string().max(500),
  designNotes: z.string().max(1000),
  layout: z.enum(["editorial", "minimal", "bold"]),
  workflow: z
    .object({
      integrationTitle: z.string().min(5).max(180),
      currentWork: z.string().max(800),
      proposedFlow: z
        .array(
          z.object({ title: z.string().max(120), body: z.string().max(500) })
        )
        .min(2)
        .max(4),
      workRemoved: z
        .array(
          z.object({ title: z.string().max(140), body: z.string().max(600) })
        )
        .min(2)
        .max(3),
    })
    .optional(),
});
export const pageContentSchema = pageTextContentSchema.extend({
  heroImageUrl: z
    .union([
      safeUrl,
      z.string().regex(/^\/visuals\/[a-zA-Z0-9._-]+$/),
      z.string().regex(/^\/manus-storage\/[a-zA-Z0-9/._-]+$/),
    ])
    .optional(),
  heroImageAlt: z.string().max(500).optional(),
  heroImageProvider: z.literal("fal.ai").optional(),
  prospectBrand: z
    .object({
      name: z.string().min(1).max(200),
      website: safeUrl,
      logoUrl: z.union([
        z.literal(""),
        safeUrl,
        z.string().regex(/^\/visuals\/[a-zA-Z0-9._-]+$/),
      ]),
      logoSourceUrl: z.union([z.literal(""), safeUrl]),
    })
    .optional(),
});
export type PageContent = z.infer<typeof pageContentSchema>;
export const draftContentSchema = z.object({
  subject: z.string().max(240),
  body: z.string().min(10).max(8000),
  rationale: z.string().max(2000),
});
export const channelSchema = z.enum(["email", "linkedin", "x"]);
export type Channel = z.infer<typeof channelSchema>;
