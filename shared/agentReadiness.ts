export type SourceReadiness = {
  icpId: number;
  state:
    | "ready"
    | "no_strategy"
    | "needs_approval"
    | "stale"
    | "tool_unavailable";
  message: string;
  sourcePlanId: number | null;
  actorId: string | null;
  dailyLimit: number;
};
export function sourceReadiness(
  icpId: number,
  plan:
    | {
        id: number;
        approvedAt: Date | string | null;
        stale: boolean;
        selection: { actorId: string } | null;
        answers: { dailyLimit: number };
      }
    | undefined,
  availableActorIds: string[]
): SourceReadiness {
  const base = {
    icpId,
    sourcePlanId: plan?.id ?? null,
    actorId: plan?.selection?.actorId ?? null,
    dailyLimit: plan?.answers.dailyLimit ?? 3,
  };
  if (!plan)
    return {
      ...base,
      state: "no_strategy",
      message: "Review a source strategy for this ICP first.",
    };
  if (plan.stale)
    return {
      ...base,
      state: "stale",
      message:
        "Company or ICP changed. Refresh and approve its source strategy.",
    };
  if (!plan.approvedAt || !plan.selection)
    return {
      ...base,
      state: "needs_approval",
      message: "Approve this ICP’s latest source strategy before starting.",
    };
  if (!availableActorIds.includes(plan.selection.actorId))
    return {
      ...base,
      state: "tool_unavailable",
      message:
        "The approved tool is not available to this bounded agent. Review its source strategy.",
    };
  return {
    ...base,
    state: "ready",
    message: "Source strategy approved. Ready to configure and start.",
  };
}
export function preferredIcpId(
  icps: { id: number }[],
  readiness: SourceReadiness[]
) {
  return (
    readiness.find(r => r.state === "ready" && icps.some(i => i.id === r.icpId))
      ?.icpId ??
    icps[0]?.id ??
    0
  );
}
export function startBlocker(input: {
  source?: SourceReadiness;
  sourcingPaused: boolean;
  syncPaused: boolean;
  workerActive: boolean;
  executor: "local" | "hosted";
}) {
  if (input.source?.state !== "ready")
    return input.source?.message ?? "Source readiness is still loading.";
  if (input.sourcingPaused)
    return "Company sourcing is paused. Resume Provider sourcing above to start this agent.";
  if (input.syncPaused)
    return "Company sync is paused. Resume Provider sync above so results can be delivered.";
  if (input.executor === "local" && !input.workerActive)
    return "The server worker is not active. Check Cloud Computer execution.";
  if (input.executor === "hosted")
    return "Save paused, register its platform schedule, then resume. This app runs on the Cloud Computer.";
  return null;
}
export function agentStateMessage(state: string) {
  const messages: Record<string, string> = {
    sourcing_paused:
      "Company sourcing is paused. Resume Provider sourcing above; this agent cannot start new searches.",
    sync_paused:
      "Company sync is paused. Resume Provider sync above; results cannot be imported yet.",
    outside_working_hours:
      "Enabled, waiting for its configured working hours. Check timezone and hours below.",
    waiting_for_next_turn:
      "Enabled, waiting for the next paced turn. Check now does not bypass the interval.",
    daily_delivery_cap:
      "Today’s delivery maximum is reached. Resumes on the next eligible day—no bulk catch-up.",
    daily_attempt_cap:
      "Today’s search budget is used. Resumes on the next eligible day without extra provider work.",
    ready:
      "Enabled. The Cloud Computer worker will start a bounded search on its next check.",
    paused: "Paused. Resume after reviewing its sources and pace.",
    busy: "An existing worker already owns this turn; no duplicate search was started.",
    running:
      "Apify is working on the bounded search. The worker will check and qualify the results.",
    reviewing: "Checking source evidence and ICP fit before delivering a lead.",
    needs_review:
      "An uncertain provider start needs review before any replacement work can run.",
  };
  return messages[state] ?? `Agent status: ${state.replaceAll("_", " ")}.`;
}
