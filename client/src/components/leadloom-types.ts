import type { Brand, Channel, IcpCriteria, PageContent, Research } from "@shared/domain";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
export type Workspace = RouterOutputs["workspace"]["get"];
export type Asset = Workspace["assets"][number];
export type IcpRow = RouterOutputs["icps"]["list"][number];
export type LeadRow = RouterOutputs["leads"]["list"][number];
export type LeadDetail = RouterOutputs["leads"]["get"];
export type RunRow = RouterOutputs["runs"]["list"][number];
export type PageRow = RouterOutputs["pages"]["list"][number];
export type OutreachDraft = RouterOutputs["outreach"]["list"][number];
export type PreparedEmail = RouterOutputs["outreach"]["prepareSend"];
export type MailboxStatus = RouterOutputs["mailbox"]["status"];
export type InboxMessage = RouterOutputs["inbox"]["list"][number];
export type Submission = RouterOutputs["submissions"]["list"][number];
export type ApiError = { data?: { code?: string }; message?: string };

export type { Brand, Channel, IcpCriteria, PageContent, Research };
export const api = trpc;
