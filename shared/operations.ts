export const operationDefinitions = {
  company_analysis: {
    title: "Analyzing your company website",
    agent: "Company intelligence",
    steps: [
      "Read public website pages",
      "Suggest brand, voice & ICPs",
      "Check sources and logo candidates",
      "Save your editable review draft",
    ],
    boundary:
      "Suggestions only. Your saved brand and ICPs change only when you apply the reviewed profile.",
    ready: "Your website analysis is ready to review.",
  },
  lead_analysis: {
    title: "Researching this lead",
    agent: "Lead intelligence",
    steps: [
      "Read the website or repository",
      "Extract observed company details",
      "Assess the fit against your ICP",
      "Save your editable lead review",
    ],
    boundary:
      "Research draft only. No lead is added to your database until you save the reviewed lead.",
    ready: "Your lead research is ready to review.",
  },
  page_generation: {
    title: "Building their personal page",
    agent: "Page studio",
    steps: [
      "Check the selected lead and research",
      "Load your voice and design references",
      "Write the account-specific page",
      "Save the private page draft",
    ],
    boundary: "Private draft only. Nothing is published or sent automatically.",
    ready: "Your private landing-page draft is ready.",
  },
  outreach_generation: {
    title: "Preparing a personal first message",
    agent: "Outreach studio",
    steps: [
      "Check the lead and selected page",
      "Write in your company voice",
      "Validate the next-step link",
      "Save the unsent message draft",
    ],
    boundary: "Draft only. No email or social message is sent by this action.",
    ready: "Your unsent outreach draft is ready.",
  },
} as const;
export type OperationKind = keyof typeof operationDefinitions;
export type OperationStatus =
  | "running"
  | "succeeded"
  | "failed"
  | "interrupted";
export type OperationSnapshot = {
  id: string;
  companyId: number;
  userId: number;
  kind: OperationKind;
  status: OperationStatus;
  stage: number;
  detail: string;
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};
export type ProgressReporter = (
  stage: number,
  detail?: string
) => Promise<void>;
export function stepState(
  stage: number,
  index: number,
  status: OperationStatus
) {
  if (status === "succeeded" || index < stage) return "complete" as const;
  if (index === stage && status === "interrupted") return "uncertain" as const;
  if (index === stage)
    return status === "running" ? ("active" as const) : ("stopped" as const);
  return "waiting" as const;
}
