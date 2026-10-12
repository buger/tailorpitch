import { z } from "zod";
import {
  brandSchema,
  icpSchema,
  leadInputSchema,
  researchSchema,
  safeUrl,
} from "./domain";
export const sourceSchema = z.object({
  url: safeUrl,
  text: z.string().max(24000),
});
export const copyExampleSchema = z.object({
  text: z.string().max(2000),
  sourceUrl: safeUrl,
  kind: z.enum(["heading", "body", "cta"]),
});
export const logoCandidateSchema = z.object({
  url: safeUrl,
  sourceUrl: safeUrl,
  label: z.string().max(200),
});
export const companyAnalysisSchema = z.object({
  companyName: z.string().min(2).max(200),
  website: safeUrl,
  brand: brandSchema,
  icps: z.array(icpSchema).max(3),
  summary: z.string().max(4000),
  styleNotes: z.string().max(4000),
  unknowns: z.array(z.string()).max(12),
});
export const leadAnalysisSchema = z.object({
  lead: leadInputSchema,
  research: researchSchema,
  unknowns: z.array(z.string()).max(12),
});
export type CompanyAnalysis = z.infer<typeof companyAnalysisSchema>;
export type LeadAnalysis = z.infer<typeof leadAnalysisSchema>;
export type AnalysisEvidence = {
  icpSignature?: string;

  sources: z.infer<typeof sourceSchema>[];
  copyExamples: z.infer<typeof copyExampleSchema>[];
  logos: z.infer<typeof logoCandidateSchema>[];
  styleClues: string[];
  links: string[];
};
export const intakeControlsSchema = z.object({
  sourcingPaused: z.boolean(),
  syncPaused: z.boolean(),
});
export type IntakeControls = z.infer<typeof intakeControlsSchema>;
