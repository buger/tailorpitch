import { useState } from "react";
import { Pause, Play, RefreshCw } from "lucide-react";
import { api } from "@/components/leadloom-types";
import { MonoLabel, StatusChip } from "@/components/LeadloomUI";

export function IntakeControls() {
  const workspace = api.workspace.get.useQuery(undefined, { retry: false });
  const canManage = workspace.data?.role === "owner";
  const controls = api.intake.get.useQuery(undefined, { retry: false });
  const save = api.intake.save.useMutation();
  const utils = api.useUtils();
  const sourcingPaused = controls.data?.sourcingPaused ?? false;
  const syncPaused = controls.data?.syncPaused ?? false;
  const [message, setMessage] = useState<string | null>(null);

  const toggle = async (key: "sourcingPaused" | "syncPaused") => {
    const next = {
      sourcingPaused,
      syncPaused,
      [key]: key === "sourcingPaused" ? !sourcingPaused : !syncPaused,
    };
    setMessage(null);
    try {
      await save.mutateAsync(next);
      await controls.refetch();
      await utils.icpAgents.list.invalidate();
      setMessage("Saved. Existing provider work was not cancelled.");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Intake controls could not be saved."
      );
    }
  };

  return (
    <section className="mb-7 border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <MonoLabel>Intake controls / durable state</MonoLabel>
          <h2 className="mt-2 font-display text-xl tracking-[-.04em]">
            Choose what may start or sync.
          </h2>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-ink-muted">
            Only the company owner changes these switches. Manual link intake
            stays available when sourcing is paused. Sync pause blocks provider
            result fetching and imports. Neither switch cancels an external
            provider run already in progress.
          </p>
        </div>
        {controls.isFetching && (
          <RefreshCw className="h-4 w-4 animate-spin text-terracotta" />
        )}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={() => void toggle("sourcingPaused")}
          disabled={
            !canManage ||
            save.isPending ||
            controls.isLoading ||
            Boolean(controls.error)
          }
          className="flex items-center justify-between gap-4 border border-line bg-paper p-4 text-left hover:border-terracotta disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>
            <span className="block text-sm font-semibold">
              Provider sourcing
            </span>
            <span className="mt-1 block text-xs leading-5 text-ink-muted">
              Blocks new automatic discovery runs.
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {sourcingPaused ? (
              <Pause className="h-4 w-4 text-terracotta" />
            ) : (
              <Play className="h-4 w-4 text-sage-ink" />
            )}
            <StatusChip tone={sourcingPaused ? "warn" : "good"}>
              {controls.data
                ? sourcingPaused
                  ? "Paused"
                  : "Open"
                : "Checking…"}
            </StatusChip>
          </span>
        </button>
        <button
          type="button"
          onClick={() => void toggle("syncPaused")}
          disabled={
            !canManage ||
            save.isPending ||
            controls.isLoading ||
            Boolean(controls.error)
          }
          className="flex items-center justify-between gap-4 border border-line bg-paper p-4 text-left hover:border-terracotta disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>
            <span className="block text-sm font-semibold">
              Provider sync / import
            </span>
            <span className="mt-1 block text-xs leading-5 text-ink-muted">
              Blocks fetching or importing provider results.
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {syncPaused ? (
              <Pause className="h-4 w-4 text-terracotta" />
            ) : (
              <Play className="h-4 w-4 text-sage-ink" />
            )}
            <StatusChip tone={syncPaused ? "warn" : "good"}>
              {controls.data ? (syncPaused ? "Paused" : "Open") : "Checking…"}
            </StatusChip>
          </span>
        </button>
      </div>
      {message && (
        <p role="status" className="mt-4 text-xs text-ink-muted">
          {message}
        </p>
      )}
      {controls.error && (
        <p className="mt-4 text-xs text-red-700">
          Intake controls could not load: {controls.error.message}
        </p>
      )}
    </section>
  );
}
