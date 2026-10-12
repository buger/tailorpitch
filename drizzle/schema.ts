import type {
  SourceAnswers,
  SourceRecommendation,
  SourceActor,
  SourceSelection,
} from "../shared/sourcePlans";
import {
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import type {
  Brand,
  IcpCriteria,
  Research,
  PageContent,
  Channel,
} from "../shared/domain";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  website: varchar("website", { length: 2000 }).notNull(),
  brand: json("brand").$type<Brand>().notNull(),
  seedVersion: int("seedVersion").default(0).notNull(),
  onboardingCompletedAt: timestamp("onboardingCompletedAt"),
  publicOrigin: varchar("publicOrigin", { length: 2000 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const memberships = mysqlTable(
  "memberships",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["owner", "admin", "member"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [uniqueIndex("membership_company_user").on(t.companyId, t.userId)]
);
export const invitations = mysqlTable("invitations", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  role: mysqlEnum("role", ["admin", "member"]).notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
});
export const icps = mysqlTable("icps", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  criteria: json("criteria").$type<IcpCriteria>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const leads = mysqlTable(
  "leads",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    icpId: int("icpId"),
    companyName: varchar("companyName", { length: 200 }).notNull(),
    website: varchar("website", { length: 2000 }).notNull(),
    domain: varchar("domain", { length: 255 }).notNull(),
    contactName: varchar("contactName", { length: 200 }).default("").notNull(),
    email: varchar("email", { length: 320 }).default("").notNull(),
    title: varchar("title", { length: 200 }).default("").notNull(),
    linkedinUrl: varchar("linkedinUrl", { length: 2000 }).default("").notNull(),
    xUrl: varchar("xUrl", { length: 2000 }).default("").notNull(),
    notes: text("notes"),
    source: varchar("source", { length: 80 }).default("manual").notNull(),
    sourceUrl: varchar("sourceUrl", { length: 2000 }),
    sourceRunId: int("sourceRunId"),
    pipelineId: int("pipelineId"),
    pipelineSelectedAt: timestamp("pipelineSelectedAt"),
    status: mysqlEnum("status", [
      "new",
      "researching",
      "researched",
      "qualified",
      "page_ready",
      "contacted",
      "suppressed",
    ])
      .default("new")
      .notNull(),
    score: int("score"),
    research: json("research").$type<Research>(),
    researchedAt: timestamp("researchedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [uniqueIndex("lead_company_domain").on(t.companyId, t.domain)]
);
export const sourcingRuns = mysqlTable("sourcingRuns", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  icpId: int("icpId"),
  leadId: int("leadId"),
  type: mysqlEnum("type", ["discovery", "research"]).notNull(),
  externalId: varchar("externalId", { length: 100 }),
  datasetId: varchar("datasetId", { length: 100 }),
  actorId: varchar("actorId", { length: 200 }),
  sourcePlanId: int("sourcePlanId"),
  status: varchar("status", { length: 40 }).default("STARTING").notNull(),
  imported: int("imported").default(0).notNull(),
  requestedLimit: int("requestedLimit").default(10).notNull(),
  query: text("query"),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  processingAt: timestamp("processingAt"),
});
export const pages = mysqlTable("pages", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  leadId: int("leadId").notNull(),
  shareToken: varchar("shareToken", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["draft", "published"])
    .default("draft")
    .notNull(),
  content: json("content").$type<PageContent>().notNull(),
  brandSnapshot: json("brandSnapshot").$type<Brand>().notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  views: int("views").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const outreach = mysqlTable("outreach", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  leadId: int("leadId").notNull(),
  pageId: int("pageId"),
  channel: mysqlEnum("channel", ["email", "linkedin", "x"])
    .$type<Channel>()
    .notNull(),
  recipient: varchar("recipient", { length: 2000 }).default("").notNull(),
  subject: varchar("subject", { length: 240 }).default("").notNull(),
  body: text("body").notNull(),
  rationale: text("rationale"),
  status: mysqlEnum("status", [
    "draft",
    "sending",
    "accepted",
    "manual",
    "failed",
    "unknown",
  ])
    .default("draft")
    .notNull(),
  providerId: varchar("providerId", { length: 255 }),
  error: text("error"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const activity = mysqlTable("activity", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  leadId: int("leadId"),
  type: varchar("type", { length: 80 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const submissions = mysqlTable(
  "submissions",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId"),
    pageId: int("pageId"),
    email: varchar("email", { length: 320 }).notNull(),
    source: varchar("source", { length: 100 }).notNull(),
    consent: int("consent").default(1).notNull(),
    consentText: text("consentText").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [uniqueIndex("submission_email_source").on(t.email, t.source)]
);
export const brandAssets = mysqlTable("brandAssets", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  key: varchar("key", { length: 1000 }).notNull(),
  url: varchar("url", { length: 2000 }).notNull(),
  mime: varchar("mime", { length: 100 }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const integrations = mysqlTable(
  "integrations",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    encryptedConfig: text("encryptedConfig").notNull(),
    displayName: varchar("displayName", { length: 320 }).notNull(),
    status: varchar("status", { length: 40 }).default("connected").notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  t => [uniqueIndex("integration_company_provider").on(t.companyId, t.provider)]
);
export const oauthStates = mysqlTable("oauthStates", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  userId: int("userId").notNull(),
  stateHash: varchar("stateHash", { length: 64 }).notNull().unique(),
  redirectUri: varchar("redirectUri", { length: 2000 }).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
});
export const inboxMessages = mysqlTable(
  "inboxMessages",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    externalId: varchar("externalId", { length: 255 }).notNull(),
    from: varchar("from", { length: 500 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    snippet: text("snippet").notNull(),
    receivedAt: timestamp("receivedAt").notNull(),
  },
  t => [uniqueIndex("inbox_external").on(t.companyId, t.provider, t.externalId)]
);
export const suppressions = mysqlTable(
  "suppressions",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    active: int("active").default(0).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  t => [uniqueIndex("suppression_company_email").on(t.companyId, t.email)]
);

export const mcpOAuthSessions = mysqlTable("mcpOAuthSessions", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  userId: int("userId").notNull(),
  stateHash: varchar("stateHash", { length: 64 }).notNull().unique(),
  encryptedPayload: text("encryptedPayload").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  consumedAt: timestamp("consumedAt"),
});
export const pipelines = mysqlTable("pipelines", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull().unique(),
  name: varchar("name", { length: 200 })
    .notNull()
    .default("Your prospecting agent"),
  config: json("config")
    .$type<import("../shared/pipeline").PipelineConfig>()
    .notNull(),
  enabled: int("enabled").notNull().default(0),
  scheduleTaskUid: varchar("scheduleTaskUid", { length: 100 }).unique(),
  scheduleId: varchar("scheduleId", { length: 100 }),
  scheduleStatus: varchar("scheduleStatus", { length: 50 })
    .notNull()
    .default("not_registered"),
  dayKey: varchar("dayKey", { length: 10 }),
  discoveriesToday: int("discoveriesToday").notNull().default(0),
  nextDiscoveryAt: timestamp("nextDiscoveryAt"),
  leaseUntil: timestamp("leaseUntil"),
  leaseToken: varchar("leaseToken", { length: 64 }),
  lastTickAt: timestamp("lastTickAt"),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
});
export const pipelineJobs = mysqlTable(
  "pipelineJobs",
  {
    id: int("id").autoincrement().primaryKey(),
    companyId: int("companyId").notNull(),
    pipelineId: int("pipelineId").notNull(),
    leadId: int("leadId"),
    stage: mysqlEnum("stage", [
      "discover",
      "qualify",
      "page",
      "outreach",
    ]).notNull(),
    provider: varchar("provider", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull().default("queued"),
    sourceRunId: int("sourceRunId"),
    manusTaskId: varchar("manusTaskId", { length: 100 }),
    taskUrl: varchar("taskUrl", { length: 2000 }),
    eventCursor: varchar("eventCursor", { length: 500 }),
    result: json("result").$type<Record<string, unknown>>(),
    error: text("error"),
    configSnapshot: json("configSnapshot")
      .$type<import("../shared/pipeline").PipelineConfig>()
      .notNull(),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow().onUpdateNow(),
  },
  t => [uniqueIndex("pipeline_lead_stage").on(t.pipelineId, t.leadId, t.stage)]
);

export const intakeControls = mysqlTable("intakeControls", {
  companyId: int("companyId").primaryKey(),
  sourcingPaused: int("sourcingPaused").default(0).notNull(),
  syncPaused: int("syncPaused").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const analysisDrafts = mysqlTable("analysisDrafts", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  kind: mysqlEnum("kind", ["company", "lead"]).notNull(),
  url: varchar("url", { length: 2000 }).notNull(),
  result: json("result")
    .$type<
      | import("../shared/analysis").CompanyAnalysis
      | import("../shared/analysis").LeadAnalysis
    >()
    .notNull(),
  evidence: json("evidence")
    .$type<import("../shared/analysis").AnalysisEvidence>()
    .notNull(),
  baseSignature: varchar("baseSignature", { length: 64 }).notNull(),
  appliedAt: timestamp("appliedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/** Real progress snapshots; operation data/results remain in their existing scoped tables. */
export const operationProgress = mysqlTable("operationProgress", {
  id: varchar("id", { length: 36 }).primaryKey(),
  companyId: int("companyId").notNull(),
  userId: int("userId").notNull(),
  kind: mysqlEnum("kind", [
    "company_analysis",
    "lead_analysis",
    "page_generation",
    "outreach_generation",
  ]).notNull(),
  status: mysqlEnum("status", ["running", "succeeded", "failed"])
    .default("running")
    .notNull(),
  stage: int("stage").default(0).notNull(),
  detail: varchar("detail", { length: 700 })
    .default("Starting the request…")
    .notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export const sourcePlans = mysqlTable("sourcePlans", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  icpId: int("icpId").notNull(),
  answers: json("answers").$type<SourceAnswers>().notNull(),
  recommendation: json("recommendation")
    .$type<SourceRecommendation>()
    .notNull(),
  catalog: json("catalog").$type<SourceActor[]>().notNull(),
  contextHash: varchar("contextHash", { length: 64 }).notNull(),
  selection: json("selection").$type<SourceSelection>(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
