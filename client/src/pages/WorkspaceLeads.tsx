import { useOperation } from "@/components/operations/OperationProvider";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FlaskConical,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import type {
  IcpRow,
  LeadRow,
  RunRow,
  Workspace,
} from "@/components/leadloom-types";
import { api } from "@/components/leadloom-types";
import {
  emptyLeadEditorValues,
  LeadEditor,
  type LeadEditorValues,
} from "@/components/LeadEditor";
import { LeadLinkIntake } from "@/components/LeadLinkIntake";
import { IntakeControls } from "@/components/IntakeControls";
import {
  Button,
  DrawerDialog,
  EmptyState,
  MonoLabel,
  SectionHeader,
  StatusChip,
  Toast,
} from "@/components/LeadloomUI";

type LeadStatusFilter =
  | "all"
  | "unresearched"
  | "qualified"
  | "review"
  | "page"
  | "contacted"
  | "suppressed";
const leadStatusFilters: Array<{ value: LeadStatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "unresearched", label: "Unresearched" },
  { value: "qualified", label: "Qualified" },
  { value: "review", label: "Review" },
  { value: "page", label: "Page ready" },
  { value: "contacted", label: "Contacted" },
  { value: "suppressed", label: "Suppressed" },
];

const runStatusLabels = [
  "IMPORTED",
  "FAILED",
  "READY",
  "RUNNING",
  "PROCESSING",
] as const;
type RunStatusLabel = (typeof runStatusLabels)[number];

type RunSyncMutation = ReturnType<typeof api.runs.sync.useMutation>;

function leadStatusLabel(status: LeadRow["status"]): string {
  return status.replaceAll("_", " ");
}

function leadSourceLabel(source: string | null | undefined): string {
  if (source === "github_intake") return "GitHub link";
  if (source === "website_intake") return "Website link";
  if (source === "manual_link") return "Manual link";
  if (source === "apify") return "Provider sourcing";
  return source ? source.replaceAll("_", " ") : "Manual";
}

function leadStatusTone(
  status: LeadRow["status"]
): "neutral" | "good" | "warn" | "bad" | "accent" {
  if (status === "qualified") return "good";
  if (status === "suppressed") return "bad";
  if (status === "contacted" || status === "page_ready") return "accent";
  if (status === "researching" || status === "researched") return "warn";
  return "neutral";
}

function runStatusLabel(status: string): string {
  if (status === "IMPORTED") return "IMPORTED";
  if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) return "FAILED";
  if (["PROCESSING"].includes(status)) return "PROCESSING";
  if (["RUNNING", "TIMING-OUT"].includes(status)) return "RUNNING";
  return "READY";
}

function runStatusTone(
  status: string
): "neutral" | "good" | "warn" | "bad" | "accent" {
  if (status === "IMPORTED") return "good";
  if (status === "FAILED") return "bad";
  if (status === "READY") return "accent";
  return "warn";
}

function leadMatchesFilter(lead: LeadRow, filter: LeadStatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "unresearched")
    return (
      !lead.research && (lead.status === "new" || lead.status === "researching")
    );
  if (filter === "qualified") return lead.status === "qualified";
  if (filter === "review") return lead.status === "researched";
  if (filter === "page") return lead.status === "page_ready";
  return lead.status === filter;
}

function fitLabel(lead: LeadRow) {
  if (lead.score == null) return <StatusChip>Unresearched</StatusChip>;
  const qualified = lead.status === "qualified";
  return (
    <StatusChip tone={qualified ? "good" : "warn"}>
      {lead.score}/100 fit · {qualified ? "Qualified" : "Review"}
    </StatusChip>
  );
}

export function LeadsView() {
  const [, setLocation] = useLocation();
  const leads = api.leads.list.useQuery(undefined, { retry: false });
  const runs = api.runs.list.useQuery(undefined, { retry: false });
  const icps = api.icps.list.useQuery(undefined, { retry: false });
  const sync = api.runs.sync.useMutation();
  const [search, setSearch] = useState("");
  const [icpFilter, setIcpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<LeadStatusFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showLinkIntake, setShowLinkIntake] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [syncingRunId, setSyncingRunId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = (leads.data ?? []).filter(lead => {
    const searchable =
      `${lead.companyName} ${lead.website} ${lead.icpName ?? ""} ${lead.contactName} ${lead.email} ${lead.linkedinUrl} ${lead.xUrl}`.toLowerCase();
    return (
      (!normalizedSearch || searchable.includes(normalizedSearch)) &&
      (icpFilter === "all" || String(lead.icpId ?? "") === icpFilter) &&
      leadMatchesFilter(lead, statusFilter)
    );
  });

  const refreshRun = async (id: number) => {
    if (sync.isPending || syncingRunId !== null) return;
    setActionError(null);
    setSyncingRunId(id);
    try {
      const result = await sync.mutateAsync({ id });
      await Promise.all([runs.refetch(), leads.refetch()]);
      setToast(
        result.status === "IMPORTED"
          ? `${result.imported} candidate${result.imported === 1 ? "" : "s"} imported.`
          : `Run is ${runStatusLabel(result.status)}.`
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Run sync failed."
      );
      await runs.refetch();
    } finally {
      setSyncingRunId(null);
    }
  };

  const refreshAll = () => {
    setActionError(null);
    void Promise.all([leads.refetch(), runs.refetch(), icps.refetch()]);
  };

  return (
    <>
      <SectionHeader
        eyebrow="Leads / company records"
        title="The right companies, with context."
        description="Source candidates are never silently labeled verified matches. Research is the step that earns confidence."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setActionError(null);
                setShowRun(true);
              }}
            >
              <Search className="h-4 w-4" />
              Find companies
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setActionError(null);
                setShowLinkIntake(true);
              }}
            >
              <FlaskConical className="h-4 w-4" />
              Analyze a link
            </Button>
            <Button
              onClick={() => {
                setActionError(null);
                setShowAdd(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add lead
            </Button>
          </div>
        }
      />
      <IntakeControls />
      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative block">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink-muted" />
          <input
            aria-label="Search leads"
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search companies, websites or profiles"
            className="w-full rounded-sm border border-line bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-terracotta"
          />
        </label>
        <select
          aria-label="Filter by ICP"
          value={icpFilter}
          onChange={event => setIcpFilter(event.target.value)}
          className="rounded-sm border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
        >
          <option value="all">All profiles</option>
          {icps.data?.map(icp => (
            <option key={icp.id} value={icp.id}>
              {icp.criteria.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={event =>
            setStatusFilter(event.target.value as LeadStatusFilter)
          }
          className="rounded-sm border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
        >
          {leadStatusFilters.map(filter => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      {icps.error && (
        <p className="mb-4 text-xs text-red-700">
          Profiles could not load, so the profile filter is unavailable:{" "}
          {icps.error.message}
        </p>
      )}
      {actionError && (
        <div
          role="alert"
          className="mb-5 border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          {actionError}
        </div>
      )}
      {leads.isLoading ? (
        <div className="border border-line bg-white p-8 text-sm text-ink-muted">
          Loading leads…
        </div>
      ) : leads.error ? (
        <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {leads.error.message || "Leads are unavailable."}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={
            normalizedSearch || statusFilter !== "all" || icpFilter !== "all"
              ? "No matching companies"
              : "No leads yet"
          }
          description={
            normalizedSearch || statusFilter !== "all" || icpFilter !== "all"
              ? "Try a different search or broaden the profile and status filters."
              : "Add a lead by hand or start a real sourcing run. Apify remains disconnected until an owner connects it in settings."
          }
          action={
            normalizedSearch ||
            statusFilter !== "all" ||
            icpFilter !== "all" ? undefined : (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4" />
                  Add manually
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowLinkIntake(true)}
                >
                  <FlaskConical className="h-4 w-4" />
                  Analyze a link
                </Button>
                <Button variant="secondary" onClick={() => setShowRun(true)}>
                  Start a sourcing run
                </Button>
              </div>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="min-w-[1100px] w-full text-left">
            <thead>
              <tr className="border-b border-line bg-paper">
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                  Company
                </th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                  Profile
                </th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                  Source / context
                </th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                  Fit
                </th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                  Status
                </th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                  Pages
                </th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <tr
                  key={lead.id}
                  className="border-b border-line last:border-0 hover:bg-paper/70"
                >
                  <td className="px-5 py-4">
                    <button
                      className="text-sm font-semibold hover:text-terracotta"
                      onClick={() => setLocation(`/app/leads/${lead.id}`)}
                    >
                      {lead.companyName}
                    </button>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 flex items-center gap-1 text-xs text-ink-muted hover:text-terracotta"
                    >
                      {lead.website
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-5 py-4 text-xs text-ink-muted">
                    {lead.icpName || "Unassigned"}
                  </td>
                  <td className="max-w-[280px] px-5 py-4 text-xs text-ink-muted">
                    <span className="font-semibold text-ink">
                      {leadSourceLabel(lead.source)}
                    </span>
                    {lead.notes && (
                      <p className="mt-1 line-clamp-2 leading-5">
                        {lead.notes}
                      </p>
                    )}
                    {lead.sourceUrl && (
                      <a
                        href={lead.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-terracotta underline"
                      >
                        <span className="truncate">{lead.sourceUrl}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                  </td>
                  <td className="px-5 py-4">{fitLabel(lead)}</td>
                  <td className="px-5 py-4">
                    <StatusChip tone={leadStatusTone(lead.status)}>
                      {leadStatusLabel(lead.status)}
                    </StatusChip>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-ink-muted">
                    {lead.pageCount ?? 0}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <ArrowRight className="ml-auto h-4 w-4 text-ink-muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <MonoLabel>Sourcing runs / durable state</MonoLabel>
            <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
              What has been searched
            </h2>
          </div>
        </div>
        {runs.error && (
          <div className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {runs.error.message || "Sourcing runs are unavailable."}
          </div>
        )}
        <RunsTable
          runs={runs.data ?? []}
          sync={sync}
          syncingRunId={syncingRunId}
          onRefresh={refreshRun}
        />
      </div>
      {showAdd && (
        <AddLeadDialog
          onClose={() => setShowAdd(false)}
          onSaved={async () => {
            setShowAdd(false);
            await leads.refetch();
            setToast("Lead added.");
          }}
        />
      )}
      {showLinkIntake && (
        <LeadLinkIntake
          onClose={() => setShowLinkIntake(false)}
          onSaved={async message => {
            setShowLinkIntake(false);
            await leads.refetch();
            setToast(message || "Reviewed lead saved.");
          }}
        />
      )}
      {showRun && (
        <RunDialog
          onClose={() => setShowRun(false)}
          onSaved={async () => {
            setShowRun(false);
            await runs.refetch();
            setToast("Sourcing run started.");
          }}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

function RunsTable({
  runs,
  sync,
  syncingRunId,
  onRefresh,
}: {
  runs: RunRow[];
  sync: RunSyncMutation;
  syncingRunId: number | null;
  onRefresh: (id: number) => Promise<void>;
}) {
  const reconcile = api.runs.reconcile.useMutation();
  const reconcileRun = async (run: RunRow) => {
    const externalId = window.prompt(
      "After checking your Apify run history, enter the matching run ID. Leave blank only if no external run exists."
    );
    if (externalId === null) return;
    const confirmedNoRun =
      !externalId.trim() &&
      window.confirm(
        "I checked Apify history and confirm no run was started. This allows a new run."
      );
    if (!externalId.trim() && !confirmedNoRun) return;
    try {
      await reconcile.mutateAsync({
        id: run.id,
        ...(externalId.trim()
          ? { externalId: externalId.trim() }
          : { confirmedNoRun: true }),
      });
      await onRefresh(run.id);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Run reconciliation failed."
      );
    }
  };
  if (!runs.length)
    return (
      <div className="border border-dashed border-line bg-white p-6 text-sm text-ink-muted">
        No sourcing runs yet. A run only starts after a team member chooses a
        profile and query.
      </div>
    );
  return (
    <div className="overflow-x-auto border border-line bg-white">
      <table className="min-w-[780px] w-full text-left">
        <thead>
          <tr className="border-b border-line bg-paper">
            <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
              Run
            </th>
            <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
              Status
            </th>
            <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
              Imported
            </th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {runs.map(run => {
            const status = runStatusLabel(run.status);
            const pending = sync.isPending && syncingRunId === run.id;
            return (
              <tr key={run.id} className="border-b border-line last:border-0">
                <td className="px-5 py-4">
                  <p className="text-sm font-semibold">
                    {run.query || "Profile search"}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-ink-muted">
                    {run.createdAt
                      ? new Date(run.createdAt).toLocaleString()
                      : `Run #${run.id}`}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <StatusChip tone={runStatusTone(status)}>{status}</StatusChip>
                  {run.error && (
                    <p className="mt-2 max-w-xs text-xs leading-5 text-red-700">
                      {run.error}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4 font-mono text-xs">
                  {run.imported ?? 0}
                </td>
                <td className="px-5 py-4 text-right">
                  <Button
                    variant="ghost"
                    className="min-h-8 px-2 text-xs"
                    onClick={() => void onRefresh(run.id)}
                    disabled={sync.isPending || syncingRunId !== null}
                  >
                    {pending ? "Syncing…" : "Sync run"}
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
                    />
                  </Button>
                  {["UNKNOWN", "STARTING"].includes(run.status) &&
                    !run.externalId && (
                      <Button
                        variant="secondary"
                        className="ml-2 min-h-8 px-2 text-xs"
                        disabled={reconcile.isPending}
                        onClick={() => void reconcileRun(run)}
                      >
                        Reconcile
                      </Button>
                    )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AddLeadDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const add = api.leads.add.useMutation();
  const submit = async (values: LeadEditorValues) => {
    await add.mutateAsync(values);
    await onSaved();
  };
  return (
    <DrawerDialog
      title="Add a lead"
      description="Add a company you already know. Research can come later; no contact details are invented."
      onClose={onClose}
    >
      <LeadEditor
        initialValues={emptyLeadEditorValues}
        submitLabel="Add company"
        pending={add.isPending}
        error={add.error?.message}
        onSubmit={submit}
        onCancel={onClose}
      />
    </DrawerDialog>
  );
}

function queryForIcp(icp: IcpRow): string {
  const criteria = icp.criteria;
  return (
    [criteria.keywords, criteria.industries, criteria.geography]
      .map(value => value.trim())
      .filter(Boolean)
      .join(", ") || criteria.name
  );
}

function RunDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const icps = api.icps.list.useQuery(undefined, { retry: false });
  const start = api.runs.start.useMutation();
  const [icpId, setIcpId] = useState(0);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(3);
  const sourcePlans = api.sources.list.useQuery(
    { icpId },
    { enabled: icpId > 0, retry: false }
  );
  const sourcePlan = sourcePlans.data?.plans[0];
  const sourceReady = Boolean(
    sourcePlans.isSuccess &&
      sourcePlan?.approvedAt &&
      !sourcePlan.stale &&
      sourcePlan.selection?.actorId === "apify/google-search-scraper"
  );
  const [formError, setFormError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    try {
      await start.mutateAsync({
        icpId,
        query: sourcePlan?.selection?.query ?? query,
        limit: Math.min(30, Math.max(1, limit)),
      });
      await onSaved();
    } catch (caught) {
      setFormError(
        caught instanceof Error
          ? caught.message
          : "The sourcing run could not start."
      );
    }
  };
  return (
    <DrawerDialog
      title="Start a sourcing run"
      description="Choose an ICP with an approved source strategy before starting bounded discovery. The server uses that reviewed query; duplicate active runs are blocked."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold">Profile</span>
          <select
            required
            value={icpId || ""}
            onChange={event => {
              const nextId = Number(event.target.value);
              setIcpId(nextId);
              const selected = icps.data?.find(icp => icp.id === nextId);
              if (selected) setQuery(queryForIcp(selected));
            }}
            className="w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
          >
            <option value="">Choose a profile</option>
            {icps.data?.map(icp => (
              <option value={icp.id} key={icp.id}>
                {icp.criteria.name}
              </option>
            ))}
          </select>
          {icps.isLoading && (
            <span className="mt-1 block text-[11px] text-ink-muted">
              Loading profiles…
            </span>
          )}
          {icps.error && (
            <span className="mt-1 block text-xs text-red-700">
              Profiles could not load: {icps.error.message}
            </span>
          )}
        </label>
        <div className="border border-line bg-paper p-4 text-sm leading-6">
          {sourcePlans.isLoading && icpId > 0 ? (
            "Loading source strategy…"
          ) : sourcePlans.isError ? (
            <>
              <strong>Source strategy could not load</strong>
              <p className="mt-2 text-xs">{sourcePlans.error.message}</p>
              <Button
                type="button"
                variant="secondary"
                className="mt-2"
                onClick={() => void sourcePlans.refetch()}
              >
                Retry source strategy
              </Button>
            </>
          ) : sourceReady ? (
            <>
              <strong>Approved Google Search strategy</strong>
              <p className="mt-2 text-xs">{sourcePlan!.selection!.query}</p>
            </>
          ) : (
            <>
              <strong>
                {sourcePlan?.stale
                  ? "Strategy needs re-review"
                  : sourcePlan?.approvedAt
                    ? "Specialist adapter activation needed"
                    : "Approve an ICP source strategy first"}
              </strong>
              <p className="mt-2 text-xs">
                Answer the strategy questions and review the recommended
                sources. No generic search is substituted.
              </p>
            </>
          )}
          <a
            href="/app/sources"
            className="mt-2 inline-block text-xs underline"
          >
            Review Sources & strategy →
          </a>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold">
            Result limit
          </span>
          <input
            required
            type="number"
            min={1}
            max={30}
            value={limit}
            onChange={event => setLimit(Number(event.target.value) || 1)}
            className="w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-terracotta"
          />
          <span className="mt-1 block text-[11px] leading-4 text-ink-muted">
            1–30 candidates, never above this strategy’s remaining daily
            allowance (UTC).
          </span>
        </label>
        <div className="border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          <strong>
            Provider ceiling: $0.50 per run, 10-minute runtime, optional paid
            add-ons disabled.
          </strong>{" "}
          Imported search candidates have not been verified for ICP fit.
          Research each candidate before calling it qualified.
        </div>
        {formError && (
          <div
            role="alert"
            className="border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800"
          >
            {formError}
          </div>
        )}
        <Button
          type="submit"
          disabled={start.isPending || !icpId || !sourceReady}
          className="w-full"
        >
          {start.isPending ? "Starting…" : "Start run"}
        </Button>
      </form>
    </DrawerDialog>
  );
}

function valuesFromLead(lead: {
  companyName: string;
  website: string;
  contactName: string;
  email: string;
  title: string;
  linkedinUrl: string;
  xUrl: string;
  icpId: number | null;
  notes: string | null;
}): LeadEditorValues {
  return {
    companyName: lead.companyName,
    website: lead.website,
    contactName: lead.contactName,
    email: lead.email,
    title: lead.title,
    linkedinUrl: lead.linkedinUrl,
    xUrl: lead.xUrl,
    icpId: lead.icpId,
    notes: lead.notes ?? "",
  };
}

export function LeadDetailView({
  workspace: _workspace,
}: {
  workspace: Workspace;
}) {
  const operation = useOperation();
  const [, params] = useRoute<{ id: string }>("/app/leads/:id");
  const [, setLocation] = useLocation();
  const id = Number(params?.id);
  const detail = api.leads.get.useQuery(
    { id },
    { enabled: Number.isFinite(id), retry: false }
  );
  const research = api.leads.research.useMutation();
  const suppress = api.leads.suppress.useMutation();
  const sync = api.runs.sync.useMutation();
  const update = api.leads.update.useMutation();
  const generatePage = api.pages.generate.useMutation();
  const [editing, setEditing] = useState(false);
  const [syncingRunId, setSyncingRunId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (detail.isLoading)
    return (
      <div className="border border-line bg-white p-10 text-sm text-ink-muted">
        Loading lead research…
      </div>
    );
  if (detail.error || !detail.data)
    return (
      <EmptyState
        title="Lead unavailable"
        description="This lead may have been removed or you may not have access to it."
        action={
          <Button onClick={() => setLocation("/app/leads")}>
            <ArrowLeft className="h-4 w-4" />
            Back to leads
          </Button>
        }
      />
    );

  const data = detail.data;
  const lead = data.lead;
  const researchData = lead.research;
  const runResearch = async () => {
    if (research.isPending || lead.status === "suppressed") return;
    setActionError(null);
    try {
      const result = await research.mutateAsync({ id });
      await detail.refetch();
      setToast(`Research run #${result.runId} started.`);
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Research could not start."
      );
    }
  };
  const syncResearchRun = async (runId: number) => {
    if (sync.isPending || syncingRunId !== null) return;
    setActionError(null);
    setSyncingRunId(runId);
    try {
      const result = await sync.mutateAsync({ id: runId });
      await detail.refetch();
      setToast(
        result.status === "IMPORTED"
          ? "Research was saved to this lead."
          : `Run is ${runStatusLabel(result.status)}.`
      );
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Research sync failed."
      );
      await detail.refetch();
    } finally {
      setSyncingRunId(null);
    }
  };
  const confirmSuppress = async () => {
    if (
      !window.confirm(
        "Suppress this lead? This records an opt-out and blocks future outreach."
      )
    )
      return;
    setActionError(null);
    try {
      await suppress.mutateAsync({ id });
      await detail.refetch();
      setToast("Lead suppressed. Outreach is blocked.");
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : "Could not suppress lead."
      );
    }
  };
  const saveLead = async (values: LeadEditorValues) => {
    await update.mutateAsync({ id, ...values });
    setEditing(false);
    await detail.refetch();
    setToast("Lead updated.");
  };
  const createPage = async () => {
    if (!researchData || generatePage.isPending || operation.busy) return;
    setActionError(null);
    try {
      await operation.run("page_generation", lead.companyName, operationId =>
        generatePage.mutateAsync({ leadId: id, operationId })
      );
      setLocation(`/app/pages?lead=${id}`);
    } catch (caught) {
      setActionError(
        caught instanceof Error
          ? caught.message
          : "Page generation requires saved research."
      );
    }
  };

  return (
    <>
      <button
        className="mb-7 inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink"
        onClick={() => setLocation("/app/leads")}
      >
        <ArrowLeft className="h-4 w-4" />
        All leads
      </button>
      <SectionHeader
        eyebrow={`Lead / ${lead.companyName}`}
        title={lead.companyName}
        description={lead.website}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setActionError(null);
                setEditing(true);
              }}
              disabled={update.isPending}
            >
              Edit lead
            </Button>
            <Button
              variant="secondary"
              onClick={() => void runResearch()}
              disabled={
                research.isPending ||
                suppress.isPending ||
                lead.status === "suppressed"
              }
            >
              {research.isPending ? "Researching…" : "Research lead"}
              <FlaskConical className="h-4 w-4" />
            </Button>
            <Button
              variant="danger"
              onClick={() => void confirmSuppress()}
              disabled={suppress.isPending}
            >
              {suppress.isPending ? "Suppressing…" : "Suppress"}
              <ShieldCheck className="h-4 w-4" />
            </Button>
          </div>
        }
      />
      {actionError && (
        <div
          role="alert"
          className="mb-5 border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
        >
          {actionError}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-5">
          <div className="border border-line bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <MonoLabel>Research brief</MonoLabel>
              {researchData?.score != null && (
                <StatusChip
                  tone={lead.status === "qualified" ? "good" : "warn"}
                >
                  {researchData.score}/100 fit ·{" "}
                  {lead.status === "qualified" ? "Qualified" : "Review"}
                </StatusChip>
              )}
            </div>
            {researchData ? (
              <>
                <h2 className="mt-4 font-display text-2xl tracking-[-.04em]">
                  {researchData.summary}
                </h2>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <div>
                    <MonoLabel>Supported facts</MonoLabel>
                    {researchData.facts.length ? (
                      <ul className="mt-3 space-y-3">
                        {researchData.facts.map((fact, index) => (
                          <li
                            key={`${fact.claim}-${index}`}
                            className="text-sm leading-6"
                          >
                            <span className="font-semibold">{fact.claim}</span>
                            <a
                              href={fact.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 block break-all text-xs text-terracotta underline"
                            >
                              Source: {fact.sourceUrl}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-ink-muted">
                        No supported facts were recorded.
                      </p>
                    )}
                  </div>
                  <div>
                    <MonoLabel>Working hypotheses</MonoLabel>
                    {researchData.hypotheses.length ? (
                      <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-ink-muted">
                        {researchData.hypotheses.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-ink-muted">
                        No hypotheses were recorded.
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-7 grid gap-6 border-t border-line pt-5 md:grid-cols-2">
                  <div>
                    <MonoLabel>Pains / signals</MonoLabel>
                    {researchData.pains.length ? (
                      <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6">
                        {researchData.pains.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-ink-muted">
                        No pains were recorded.
                      </p>
                    )}
                  </div>
                  <div>
                    <MonoLabel>Why this may be relevant</MonoLabel>
                    <p className="mt-3 text-sm leading-6">
                      {researchData.relevance || researchData.fitReason}
                    </p>
                  </div>
                </div>
                {researchData.criteria.length > 0 && (
                  <div className="mt-7 border-t border-line pt-5">
                    <MonoLabel>ICP criteria</MonoLabel>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-line">
                            <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-ink-muted">
                              Criterion
                            </th>
                            <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-ink-muted">
                              Result
                            </th>
                            <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-ink-muted">
                              Evidence
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {researchData.criteria.map((criterion, index) => (
                            <tr
                              key={`${criterion.criterion}-${index}`}
                              className="border-b border-line last:border-0"
                            >
                              <td className="px-3 py-3 font-semibold">
                                {criterion.criterion}
                              </td>
                              <td className="px-3 py-3">
                                <StatusChip
                                  tone={
                                    criterion.status === "matched"
                                      ? "good"
                                      : criterion.status === "not_matched"
                                        ? "bad"
                                        : "warn"
                                  }
                                >
                                  {criterion.status}
                                </StatusChip>
                              </td>
                              <td className="px-3 py-3 text-xs leading-5 text-ink-muted">
                                {criterion.evidence || "No evidence recorded."}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {researchData.unknowns.length > 0 && (
                  <div className="mt-7 border border-amber-200 bg-amber-50 p-5">
                    <MonoLabel className="text-amber-800">
                      Unknowns / do not assume
                    </MonoLabel>
                    <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-amber-900">
                      {researchData.unknowns.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-7 border-t border-line pt-5 text-xs text-ink-muted">
                  Researched{" "}
                  {lead.researchedAt
                    ? new Date(lead.researchedAt).toLocaleString()
                    : "not yet"}
                </div>
              </>
            ) : (
              <div className="mt-6 border border-dashed border-line p-7 text-center">
                <FlaskConical
                  className="mx-auto h-6 w-6 text-ink-muted"
                  strokeWidth={1.5}
                />
                <h2 className="mt-4 font-display text-xl tracking-[-.03em]">
                  Research earns the next action.
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
                  Run a bounded public-site research job to capture sources,
                  facts, unknowns and a fit explanation.
                </p>
                <Button
                  className="mt-5"
                  onClick={() => void runResearch()}
                  disabled={research.isPending || lead.status === "suppressed"}
                >
                  {research.isPending ? "Researching…" : "Start research"}
                </Button>
              </div>
            )}
          </div>
          <div className="border border-line bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <MonoLabel>Research runs</MonoLabel>
                <p className="mt-2 text-sm text-ink-muted">
                  Sync a completed provider run to save its AI research here.
                </p>
              </div>
              <RefreshCw className="h-5 w-5 text-terracotta" />
            </div>
            {data.runs.length ? (
              <div className="mt-5 space-y-3">
                {data.runs.map(run => {
                  const status = runStatusLabel(run.status);
                  const pending = sync.isPending && syncingRunId === run.id;
                  return (
                    <div
                      key={run.id}
                      className="border-t border-line pt-3 first:border-0 first:pt-0"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusChip tone={runStatusTone(status)}>
                          {status}
                        </StatusChip>
                        <span className="font-mono text-[10px] text-ink-muted">
                          {run.createdAt
                            ? new Date(run.createdAt).toLocaleString()
                            : `Run #${run.id}`}
                        </span>
                      </div>
                      {run.error && (
                        <p className="mt-2 text-xs leading-5 text-red-700">
                          {run.error}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-xs text-ink-muted">
                          {run.imported ?? 0} imported
                        </span>
                        <Button
                          variant="ghost"
                          className="min-h-8 px-2 text-xs"
                          onClick={() => void syncResearchRun(run.id)}
                          disabled={sync.isPending || syncingRunId !== null}
                        >
                          {pending ? "Syncing…" : "Sync run"}
                          <RefreshCw
                            className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`}
                          />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-5 text-sm text-ink-muted">
                No lead research runs yet.
              </p>
            )}
          </div>
          {data.activity.length > 0 && (
            <div className="border border-line bg-white p-6">
              <MonoLabel>Relevant activity</MonoLabel>
              <div className="mt-4 space-y-4">
                {data.activity.map(event => (
                  <div
                    key={event.id}
                    className="border-l-2 border-terracotta/40 pl-3"
                  >
                    <p className="text-sm leading-6">{event.message}</p>
                    <p className="mt-1 font-mono text-[10px] text-ink-muted">
                      {event.createdAt
                        ? new Date(event.createdAt).toLocaleString()
                        : "Recently"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <aside className="space-y-5">
          <div className="border border-line bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <MonoLabel>Lead profile</MonoLabel>
              <StatusChip tone={leadStatusTone(lead.status)}>
                {leadStatusLabel(lead.status)}
              </StatusChip>
            </div>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-ink-muted">ICP profile</dt>
                <dd className="mt-1">
                  {data.icp?.criteria.name || "Unassigned"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Source provenance</dt>
                <dd className="mt-1">
                  {lead.source || "manual"}
                  {lead.sourceUrl && (
                    <a
                      href={lead.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block break-all text-xs text-terracotta underline"
                    >
                      {lead.sourceUrl}
                    </a>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Website</dt>
                <dd className="mt-1 break-all">
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-terracotta underline"
                  >
                    {lead.website}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Contact</dt>
                <dd className="mt-1">{lead.contactName || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Role</dt>
                <dd className="mt-1">{lead.title || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Email</dt>
                <dd className="mt-1 break-all">
                  {lead.email || "Not provided"}
                </dd>
              </div>
              {lead.linkedinUrl && (
                <div>
                  <dt className="text-xs text-ink-muted">LinkedIn</dt>
                  <dd className="mt-1 break-all">
                    <a
                      href={lead.linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-terracotta underline"
                    >
                      {lead.linkedinUrl}
                    </a>
                  </dd>
                </div>
              )}
              {lead.xUrl && (
                <div>
                  <dt className="text-xs text-ink-muted">X</dt>
                  <dd className="mt-1 break-all">
                    <a
                      href={lead.xUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-terracotta underline"
                    >
                      {lead.xUrl}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div className="border border-line bg-white p-6">
            <MonoLabel>Next actions</MonoLabel>
            <div className="mt-5 space-y-3">
              <Button
                className="w-full justify-between"
                onClick={() => void createPage()}
                disabled={
                  !researchData || generatePage.isPending || operation.busy
                }
              >
                {generatePage.isPending
                  ? "Generating draft…"
                  : "Generate a page"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <a
                href={`/app/outreach?lead=${lead.id}`}
                className="flex items-center justify-between border-t border-line pt-3 text-sm hover:text-terracotta"
              >
                Prepare outreach <ArrowRight className="h-4 w-4" />
              </a>
              <p className="text-xs leading-5 text-ink-muted">
                Page generation creates a private draft from saved research. It
                does not publish or send anything.
              </p>
            </div>
          </div>
        </aside>
      </div>
      {editing && (
        <DrawerDialog
          title="Edit lead"
          description="Imported candidates often arrive without contacts. Add only details you can support, then save this lead."
          onClose={() => setEditing(false)}
        >
          <LeadEditor
            initialValues={valuesFromLead(lead)}
            submitLabel="Save lead"
            pending={update.isPending}
            error={update.error?.message}
            onSubmit={saveLead}
            onCancel={() => setEditing(false)}
          />
        </DrawerDialog>
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
