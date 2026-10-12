import { z } from "zod";
import { safeUrl } from "./domain";
export const pipelineConfigSchema = z
  .object({
    icpId: z.number().int().positive(),
    source: z.enum(["apify", "gojiberry", "manus"]).default("apify"),
    researchProvider: z.enum(["apify", "manus"]).default("apify"),
    dailyLimit: z.number().int().min(1).max(30).default(3),
    intervalMinutes: z.number().int().min(240).max(10080).default(240),
    timezone: z
      .string()
      .max(100)
      .refine(v => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, "Use an IANA timezone.")
      .default("UTC"),
    weekdaysOnly: z.boolean().default(true),
    startHour: z.number().int().min(0).max(23).default(9),
    endHour: z.number().int().min(1).max(24).default(17),
    discover: z.boolean().default(true),
    qualify: z.boolean().default(true),
    pages: z.boolean().default(true),
    outreach: z.boolean().default(false),
    channel: z.enum(["email", "linkedin", "x"]).default("email"),
    instructions: z
      .string()
      .max(5000)
      .default(
        "Research first. Prioritize fresh, relevant buying signals. Never invent contact details."
      ),
    gojiberryTool: z.string().max(200).default(""),
    gojiberryArgs: z.record(z.string(), z.unknown()).default({}),
    gojiberryLimitField: z.string().max(100).default(""),
    manusProjectId: z.string().max(100).default(""),
    manusConnectorIds: z.array(z.string().max(200)).max(10).default([]),
  })
  .refine(v => v.endHour > v.startHour, "End hour must be after start hour.");
export type PipelineConfig = z.infer<typeof pipelineConfigSchema>;
export const candidateSchema = z.object({
  companyName: z.string().min(1).max(200),
  website: safeUrl,
  contactName: z.string().max(200),
  email: z.union([z.literal(""), z.string().email().max(320)]),
  title: z.string().max(200),
  linkedinUrl: z.union([z.literal(""), safeUrl]),
  xUrl: z.union([z.literal(""), safeUrl]),
  sourceUrl: safeUrl,
  signal: z.string().max(3000),
});
export const discoveryResultSchema = z.object({
  candidates: z.array(candidateSchema).max(1),
  summary: z.string().max(6000),
});
export type DiscoveryResult = z.infer<typeof discoveryResultSchema>;
export const discoveryJsonSchema = {
  type: "object",
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          companyName: { type: "string" },
          website: { type: "string" },
          contactName: { type: "string" },
          email: { type: "string" },
          title: { type: "string" },
          linkedinUrl: { type: "string" },
          xUrl: { type: "string" },
          sourceUrl: { type: "string" },
          signal: { type: "string" },
        },
        required: [
          "companyName",
          "website",
          "contactName",
          "email",
          "title",
          "linkedinUrl",
          "xUrl",
          "sourceUrl",
          "signal",
        ],
        additionalProperties: false,
      },
    },
    summary: { type: "string" },
  },
  required: ["candidates", "summary"],
  additionalProperties: false,
};
export function pacingWindow(config: PipelineConfig, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: config.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (key: string) => parts.find(p => p.type === key)?.value ?? "";
  return {
    day: `${get("year")}-${get("month")}-${get("day")}`,
    allowed:
      (!config.weekdaysOnly || !["Sat", "Sun"].includes(get("weekday"))) &&
      Number(get("hour")) >= config.startHour &&
      Number(get("hour")) < config.endHour,
  };
}
export function nextDiscoveryAt(config: PipelineConfig, now = new Date()) {
  return new Date(now.getTime() + config.intervalMinutes * 60000);
}
