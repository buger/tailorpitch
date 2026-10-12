import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileText,
  FlaskConical,
  Globe2,
  Layers3,
  Link2,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings2,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import type { PipelineConfig } from "@shared/pipeline";
import type { RouterOutputs } from "@/components/leadloom-types";
import { api } from "@/components/leadloom-types";
import {
  Button,
  MonoLabel,
  SectionHeader,
  StatusChip,
  TextArea,
  TextInput,
  Toast,
} from "@/components/LeadloomUI";

/** The response type is intentionally inferred from the router rather than duplicated here. */
type PipelineResponse = RouterOutputs["pipeline"]["get"];
type PipelineJob = PipelineResponse["jobs"][number];
type PipelineLead = PipelineResponse["leads"][number];
type StageKey = "discover" | "qualify" | "pages" | "outreach";

const DEFAULT_INSTRUCTIONS =
  "Research first. Prioritize fresh, relevant buying signals. Never invent contact details.";

const stageDefinitions: Array<{
  key: StageKey;
  label: string;
  eyebrow: string;
  description: string;
  icon: typeof Search;
}> = [
  {
    key: "discover",
    label: "Discover",
    eyebrow: "01 / source",
    description: "Find fresh companies from the configured provider.",
    icon: Search,
  },
  {
    key: "qualify",
    label: "Qualify",
    eyebrow: "02 / reason",
    description: "Research and score candidates against the selected ICP.",
    icon: FlaskConical,
  },
  {
    key: "pages",
    label: "Personalize",
    eyebrow: "03 / page",
    description:
      "Draft a tailored landing page for selected, researched leads.",
    icon: FileText,
  },
  {
    key: "outreach",
    label: "Outreach",
    eyebrow: "04 / invite",
    description:
      "Prepare a draft; sending and publishing remain explicit actions.",
    icon: Send,
  },
];

function defaultConfig(icpId = 0): PipelineConfig {
  return {
    icpId,
    source: "apify",
    researchProvider: "apify",
    dailyLimit: 3,
    intervalMinutes: 240,
    timezone: "UTC",
    weekdaysOnly: true,
    startHour: 9,
    endHour: 17,
    discover: true,
    qualify: true,
    pages: true,
    outreach: false,
    channel: "email",
    instructions: DEFAULT_INSTRUCTIONS,
    gojiberryTool: "",
    gojiberryArgs: {},
    gojiberryLimitField: "",
    manusProjectId: "",
    manusConnectorIds: [],
  };
}

function configWithDefaults(
  config: PipelineConfig | null | undefined,
  fallbackIcpId: number
): PipelineConfig {
  const base = defaultConfig(fallbackIcpId);
  if (!config) return base;
  return {
    ...base,
    ...config,
    icpId: config.icpId || fallbackIcpId,
    instructions: config.instructions || DEFAULT_INSTRUCTIONS,
    gojiberryArgs: config.gojiberryArgs || {},
    manusConnectorIds: config.manusConnectorIds || [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordText(value: unknown, key: string): string {
  if (!isRecord(value)) return "";
  const item = value[key];
  return typeof item === "string" || typeof item === "number"
    ? String(item)
    : "";
}

function dateLabel(value: Date | string | number | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}
function jsonPreview(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusTone(
  status: string
): "neutral" | "good" | "warn" | "bad" | "accent" {
  const value = status.toLowerCase();
  if (
    ["completed", "complete", "succeeded", "success", "ready", "done"].includes(
      value
    )
  )
    return "good";
  if (["failed", "error", "aborted", "timed-out", "cancelled"].includes(value))
    return "bad";
  if (["running", "processing", "started", "queued", "pending"].includes(value))
    return "warn";
  if (["blocked", "paused"].includes(value)) return "accent";
  return "neutral";
}

function leadIsResearched(lead: PipelineLead): boolean {
  return (
    Boolean(lead.research) ||
    ["researched", "qualified", "page_ready", "contacted"].includes(lead.status)
  );
}

function leadStatusLabel(lead: PipelineLead): string {
  if (lead.status === "page_ready") return "page ready";
  return lead.status.replaceAll("_", " ");
}

function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition ${
        checked ? "border-terracotta bg-terracotta" : "border-line bg-paper"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink">
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          onChange={event => onChange(event.target.value)}
          className="w-full appearance-none rounded-sm border border-line bg-white px-3 py-2.5 pr-9 text-sm text-ink outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-ink-muted" />
      </span>
      {hint && (
        <span className="mt-1 block text-[11px] leading-4 text-ink-muted">
          {hint}
        </span>
      )}
    </label>
  );
}

function StageRail({
  config,
  onToggle,
  disabled,
}: {
  config: PipelineConfig;
  onToggle: (key: StageKey) => void;
  disabled: boolean;
}) {
  return (
    <section className="border border-line bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-2 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <MonoLabel>Pipeline / connected rail</MonoLabel>
          <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
            Choose the work this agent may do.
          </h2>
        </div>
        <p className="max-w-sm text-xs leading-5 text-ink-muted">
          Stages run in order. Switches are deliberate permissions, not a
          drag-and-drop workflow.
        </p>
      </div>
      <div className="relative mt-7 grid gap-3 md:grid-cols-4 md:gap-0">
        <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 hidden h-px bg-line md:block" />
        {stageDefinitions.map(
          ({ key, label, eyebrow, description, icon: Icon }, index) => {
            const enabled = config[key];
            return (
              <div
                key={key}
                className="relative flex gap-3 md:block md:px-2 first:md:pl-0 last:md:pr-0"
              >
                <div
                  className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center border ${enabled ? "border-terracotta bg-terracotta text-paper" : "border-line bg-paper text-ink-muted"}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <div className="min-w-0 flex-1 border border-line bg-paper p-4 md:mt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <MonoLabel>{eyebrow}</MonoLabel>
                      <h3 className="mt-2 font-display text-xl tracking-[-.04em]">
                        {label}
                      </h3>
                    </div>
                    <Toggle
                      checked={enabled}
                      onChange={() => onToggle(key)}
                      label={`${enabled ? "Disable" : "Enable"} ${label} stage`}
                      disabled={disabled}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-ink-muted">
                    {description}
                  </p>
                  <p
                    className={`mt-4 font-mono text-[10px] uppercase tracking-[.12em] ${enabled ? "text-terracotta" : "text-ink-muted"}`}
                  >
                    {enabled ? "Enabled" : "Paused"}
                  </p>
                </div>
                {index < stageDefinitions.length - 1 && (
                  <div className="absolute bottom-[-12px] left-6 h-3 w-px bg-line md:hidden" />
                )}
              </div>
            );
          }
        )}
      </div>
    </section>
  );
}

function IntegrationSummary({
  integrations,
}: {
  integrations: PipelineResponse["integrations"];
}) {
  const providers: Array<{
    key: "apify" | "gojiberry" | "manus";
    label: string;
    detail: string;
  }> = [
    { key: "apify", label: "Apify", detail: "Discovery and research" },
    { key: "gojiberry", label: "Gojiberry", detail: "MCP discovery tools" },
    { key: "manus", label: "Manus", detail: "Project and connector work" },
  ];
  return (
    <section className="border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <MonoLabel>Provider access</MonoLabel>
          <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
            Connected, not assumed.
          </h2>
        </div>
        <Link2 className="h-5 w-5 text-terracotta" />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        The agent will not fake a provider connection. Manage secrets and
        reconnect flows in Settings.
      </p>
      <div className="mt-5 divide-y divide-line border-y border-line">
        {providers.map(provider => (
          <div
            key={provider.key}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">{provider.label}</p>
              <p className="text-[11px] text-ink-muted">{provider.detail}</p>
            </div>
            <StatusChip tone={integrations[provider.key] ? "good" : "neutral"}>
              {integrations[provider.key] ? "Connected" : "Not connected"}
            </StatusChip>
          </div>
        ))}
      </div>
      <a
        href="/app/settings"
        className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-terracotta hover:underline"
      >
        Open integration settings <ArrowUpRight className="h-3.5 w-3.5" />
      </a>
    </section>
  );
}

function ScheduleCard({
  schedule,
}: {
  schedule: PipelineResponse["schedule"];
}) {
  const status =
    typeof schedule === "string"
      ? schedule
      : recordText(schedule, "status") || "not_registered";
  const taskUid = recordText(schedule, "taskUid");
  const scheduleId =
    recordText(schedule, "scheduleId") || recordText(schedule, "id");
  const url = recordText(schedule, "url") || recordText(schedule, "taskUrl");
  return (
    <section className="border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <MonoLabel>Recurring scheduler</MonoLabel>
          <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
            A schedule with a paper trail.
          </h2>
        </div>
        <Clock3 className="h-5 w-5 text-terracotta" />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <StatusChip tone={statusTone(status)}>
          {status.replaceAll("_", " ")}
        </StatusChip>
        {scheduleId && (
          <span className="font-mono text-[10px] text-ink-muted">
            schedule {scheduleId}
          </span>
        )}
      </div>
      {taskUid && (
        <p className="mt-3 break-all font-mono text-[10px] leading-5 text-ink-muted">
          taskUid: {taskUid}
        </p>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-1 break-all text-xs text-terracotta underline"
        >
          Open scheduler task <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      )}
      {status !== "registered" && status !== "active" && (
        <p className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          Recurring work is not registered yet. Registering can fail on an
          unpublished workspace; the server response is shown here rather than
          hidden.
        </p>
      )}
    </section>
  );
}

function JobActivity({ jobs }: { jobs: PipelineJob[] }) {
  return (
    <section className="border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <MonoLabel>Activity / provider events</MonoLabel>
          <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
            What the agent actually did.
          </h2>
        </div>
        <Activity className="h-5 w-5 text-terracotta" />
      </div>
      {!jobs.length ? (
        <p className="mt-5 border border-dashed border-line p-5 text-sm leading-6 text-ink-muted">
          No pipeline jobs yet. Save a configuration, then run one bounded tick
          to create provider-backed work.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {jobs.map(job => {
            const status = job.status || "unknown";
            const result = isRecord(job.result) ? job.result : null;
            return (
              <article key={job.id} className="border border-line bg-paper p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusChip tone={statusTone(status)}>{status}</StatusChip>
                    <span className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                      {job.stage} · {job.provider}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-ink-muted">
                    job #{job.id}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-xs text-ink-muted sm:grid-cols-2">
                  <p>
                    Created{" "}
                    <span className="text-ink">{dateLabel(job.createdAt)}</span>
                  </p>
                  {job.startedAt && (
                    <p>
                      Started{" "}
                      <span className="text-ink">
                        {dateLabel(job.startedAt)}
                      </span>
                    </p>
                  )}
                  {job.completedAt && (
                    <p>
                      Completed{" "}
                      <span className="text-ink">
                        {dateLabel(job.completedAt)}
                      </span>
                    </p>
                  )}
                  {job.sourceRunId && (
                    <p>
                      Provider run ID{" "}
                      <span className="font-mono text-ink">
                        {job.sourceRunId}
                      </span>
                    </p>
                  )}
                  {job.manusTaskId && (
                    <p>
                      Manus task ID{" "}
                      <span className="font-mono text-ink">
                        {job.manusTaskId}
                      </span>
                    </p>
                  )}
                  {job.eventCursor && (
                    <p>
                      Provider event cursor{" "}
                      <span className="break-all font-mono text-ink">
                        {job.eventCursor}
                      </span>
                    </p>
                  )}
                </div>
                {job.taskUrl && (
                  <a
                    href={job.taskUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex max-w-full items-center gap-1 break-all text-xs text-terracotta underline"
                  >
                    Open provider task{" "}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
                {job.error && (
                  <p className="mt-3 border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                    {job.error}
                  </p>
                )}
                <JobRecovery job={job} />
                {result && (
                  <details className="mt-3 border border-line bg-white p-3">
                    <summary className="cursor-pointer text-xs font-semibold">
                      View provider result / events
                    </summary>
                    <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-ink-muted">
                      {jsonPreview(result)}
                    </pre>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CandidateSelection({
  leads,
  onSelect,
  pending,
}: {
  leads: PipelineLead[];
  onSelect: (lead: PipelineLead) => void;
  pending: boolean;
}) {
  const researched = leads.filter(leadIsResearched);
  const selected = leads.filter(lead => Boolean(lead.pipelineSelectedAt));
  return (
    <section className="border border-line bg-white p-5 sm:p-7">
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <MonoLabel>Review queue / explicit selection</MonoLabel>
          <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
            Choose who earns a page.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            Only researched candidates can be selected. Selection opts a lead
            into the page and draft-outreach stages; it never publishes or
            sends.
          </p>
        </div>
        <StatusChip tone={selected.length ? "accent" : "neutral"}>
          {selected.length} selected
        </StatusChip>
      </div>
      {!leads.length ? (
        <p className="mt-6 border border-dashed border-line p-5 text-sm leading-6 text-ink-muted">
          No candidates have arrived yet. Discoveries will appear here with
          their source and research state.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {leads.map(lead => {
            const researchedLead = leadIsResearched(lead);
            const isSelected = Boolean(lead.pipelineSelectedAt);
            return (
              <label
                key={lead.id}
                className={`flex gap-4 border p-4 transition ${isSelected ? "border-terracotta bg-terracotta-pale/40" : "border-line bg-paper"} ${!researchedLead ? "opacity-75" : "cursor-pointer hover:border-terracotta/60"}`}
              >
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[var(--terracotta)]"
                  checked={isSelected}
                  disabled={!researchedLead || pending}
                  onChange={() => onSelect(lead)}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{lead.companyName}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusChip tone={researchedLead ? "good" : "neutral"}>
                        {researchedLead ? "Researched" : leadStatusLabel(lead)}
                      </StatusChip>
                      {lead.score != null && (
                        <span className="font-mono text-[10px] text-ink-muted">
                          {lead.score}/100 fit
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-ink-muted">
                    {lead.contactName || "Contact not recorded"}
                    {lead.title ? ` · ${lead.title}` : ""}
                  </span>
                  <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 truncate text-terracotta hover:underline"
                      onClick={event => event.stopPropagation()}
                    >
                      {lead.website
                        .replace(/^https?:\/\//, "")
                        .replace(/\/$/, "")}{" "}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    {lead.sourceUrl && (
                      <a
                        href={lead.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-ink-muted hover:text-terracotta"
                        onClick={event => event.stopPropagation()}
                      >
                        source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </span>
                  {lead.research?.summary && (
                    <span className="mt-3 block text-xs leading-5 text-ink-muted">
                      {lead.research.summary}
                    </span>
                  )}
                  {!researchedLead && (
                    <span className="mt-3 block text-[11px] text-amber-800">
                      Blocked until research is complete.
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      )}
      {leads.length > 0 && researched.length === 0 && (
        <p className="mt-5 border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          Awaiting researched candidates. Selection is intentionally blocked
          until the agent has evidence to review.
        </p>
      )}
    </section>
  );
}

export function WorkspaceAgents() {
  const pipeline = api.pipeline.get.useQuery(undefined, {
    retry: false,
    refetchInterval: 10_000,
  });
  const save = api.pipeline.save.useMutation();
  const toggle = api.pipeline.toggle.useMutation();
  const tick = api.pipeline.tick.useMutation();
  const select = api.pipeline.select.useMutation();
  const registerSchedule = api.pipeline.registerSchedule.useMutation();

  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [name, setName] = useState("Your prospecting agent");
  const [argsText, setArgsText] = useState("{}");
  const [argsError, setArgsError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    kind: "success" | "error";
  } | null>(null);
  const configRef = useRef<PipelineConfig | null>(null);
  const nameRef = useRef(name);
  const dirtyRef = useRef(false);
  const savedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pipeline.data) return;
    const next = configWithDefaults(
      pipeline.data.pipeline?.config,
      pipeline.data.icps[0]?.id ?? 0
    );
    const nextName = pipeline.data.pipeline?.name || "Your prospecting agent";
    const signature = JSON.stringify({ name: nextName, config: next });
    if (
      !configRef.current ||
      (!dirtyRef.current && savedSignatureRef.current !== signature)
    ) {
      configRef.current = next;
      nameRef.current = nextName;
      savedSignatureRef.current = signature;
      setConfig(next);
      setName(nextName);
      setArgsText(JSON.stringify(next.gojiberryArgs || {}, null, 2));
      setDirty(false);
      dirtyRef.current = false;
      setArgsError(null);
    }
  }, [pipeline.data]);

  const updateConfig = <K extends keyof PipelineConfig>(
    key: K,
    value: PipelineConfig[K]
  ) => {
    setConfig(previous => {
      if (!previous) return previous;
      const next = { ...previous, [key]: value };
      configRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    setDirty(true);
  };

  const updateName = (value: string) => {
    nameRef.current = value;
    setName(value);
    dirtyRef.current = true;
    setDirty(true);
  };

  const handleArgs = (value: string) => {
    setArgsText(value);
    try {
      const parsed: unknown = JSON.parse(value);
      if (!isRecord(parsed)) {
        setArgsError("Arguments must be a JSON object.");
        return;
      }
      setArgsError(null);
      updateConfig("gojiberryArgs", parsed);
    } catch {
      setArgsError("Enter valid JSON before saving.");
    }
  };

  const saveConfig = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!config || !config.icpId) {
      setMessage({
        text: "Choose an ICP before saving the agent.",
        kind: "error",
      });
      return;
    }
    if (argsError) {
      setMessage({
        text: "Fix the Gojiberry arguments JSON before saving.",
        kind: "error",
      });
      return;
    }
    try {
      await save.mutateAsync({
        name: name.trim() || "Your prospecting agent",
        config,
      });
      const signature = JSON.stringify({
        name: name.trim() || "Your prospecting agent",
        config,
      });
      savedSignatureRef.current = signature;
      dirtyRef.current = false;
      setDirty(false);
      setMessage({ text: "Agent configuration saved.", kind: "success" });
      await pipeline.refetch();
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Agent configuration could not be saved.",
        kind: "error",
      });
    }
  };

  const runTick = async () => {
    try {
      await tick.mutateAsync();
      setMessage({
        text: "One bounded tick started. No page was published and no outreach was sent.",
        kind: "success",
      });
      await pipeline.refetch();
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "The bounded tick could not start.",
        kind: "error",
      });
    }
  };

  const setEnabled = async (enabled: boolean) => {
    try {
      await toggle.mutateAsync({ enabled });
      setMessage({
        text: enabled ? "Agent enabled." : "Agent paused.",
        kind: "success",
      });
      await pipeline.refetch();
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Agent state could not be changed.",
        kind: "error",
      });
    }
  };

  const register = async () => {
    try {
      await registerSchedule.mutateAsync();
      setMessage({ text: "Recurring schedule registered.", kind: "success" });
      await pipeline.refetch();
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Recurring schedule could not be registered.",
        kind: "error",
      });
      await pipeline.refetch();
    }
  };

  const selectLead = async (lead: PipelineLead) => {
    try {
      await select.mutateAsync({
        leadId: lead.id,
        selected: !Boolean(lead.pipelineSelectedAt),
      });
      await pipeline.refetch();
    } catch (error) {
      setMessage({
        text:
          error instanceof Error
            ? error.message
            : "Candidate selection could not be saved.",
        kind: "error",
      });
    }
  };

  if (pipeline.isLoading || (!pipeline.error && pipeline.data && !config)) {
    return (
      <div className="flex min-h-48 items-center justify-center border border-line bg-white">
        <Loader2 className="mr-3 h-4 w-4 animate-spin text-terracotta" />
        <span className="font-mono text-xs uppercase tracking-[.1em] text-ink-muted">
          Opening agent workspace
        </span>
      </div>
    );
  }

  if (pipeline.error || !pipeline.data || !config) {
    return (
      <div className="border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
        {pipeline.error?.message || "The agent workspace could not be loaded."}
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => void pipeline.refetch()}
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const data = pipeline.data;
  const enabled = Boolean(data.pipeline?.enabled);
  const selectedCount = data.leads.filter(lead =>
    Boolean(lead.pipelineSelectedAt)
  ).length;
  const blocked = (config.pages || config.outreach) && selectedCount === 0;
  const displayNext = dateLabel(data.pipeline?.nextDiscoveryAt);

  return (
    <>
      <SectionHeader
        eyebrow="Agents / TailorPitch pipeline"
        title="A careful system for finding a reason to reach out."
        description="Configure a bounded, provider-backed agent. It discovers, researches, and prepares work for review; publication and sending remain explicit human actions."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void setEnabled(!enabled)}
              disabled={toggle.isPending || !data.pipeline}
            >
              {enabled ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {toggle.isPending
                ? "Updating…"
                : enabled
                  ? "Pause agent"
                  : "Enable agent"}
            </Button>
            <Button
              onClick={() => void runTick()}
              disabled={tick.isPending || !data.pipeline}
            >
              <Zap className="h-4 w-4" />
              {tick.isPending ? "Running…" : "Run one bounded tick"}
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border border-line bg-white p-4">
          <MonoLabel>Agent state</MonoLabel>
          <div className="mt-3 flex items-center gap-2">
            <StatusChip tone={enabled ? "good" : "neutral"}>
              {!data.pipeline
                ? "Not configured"
                : enabled
                  ? "Enabled"
                  : "Paused"}
            </StatusChip>
            {data.pipeline?.lastError && (
              <StatusChip tone="bad">Needs attention</StatusChip>
            )}
          </div>
        </div>
        <div className="border border-line bg-white p-4">
          <MonoLabel>Selected leads</MonoLabel>
          <p className="mt-3 font-display text-3xl tracking-[-.06em]">
            {selectedCount}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Explicitly opted into downstream work
          </p>
        </div>
        <div className="border border-line bg-white p-4">
          <MonoLabel>Next discovery</MonoLabel>
          <p className="mt-3 text-sm font-semibold">{displayNext}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Pacing window follows the saved timezone
          </p>
        </div>
        <div className="border border-line bg-white p-4">
          <MonoLabel>Jobs in view</MonoLabel>
          <p className="mt-3 font-display text-3xl tracking-[-.06em]">
            {data.jobs.length}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Provider events and errors, not fake progress
          </p>
        </div>
      </div>

      <StageRail
        config={config}
        onToggle={key => updateConfig(key, !config[key])}
        disabled={save.isPending}
      />

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,.75fr)]">
        <form onSubmit={saveConfig} className="space-y-6">
          <section className="border border-line bg-white p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <MonoLabel>Agent brief / durable config</MonoLabel>
                <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
                  Set the boundaries.
                </h2>
              </div>
              <Settings2 className="h-5 w-5 text-terracotta" />
            </div>
            <div className="mt-6 space-y-5">
              <TextInput
                label="Agent name"
                value={name}
                onChange={event => updateName(event.target.value)}
                maxLength={200}
                placeholder="Your prospecting agent"
              />
              <SelectField
                label="Ideal customer profile"
                value={config.icpId || ""}
                onChange={value => updateConfig("icpId", Number(value))}
                hint={
                  !data.icps.length
                    ? "Create an ICP in Profiles before saving this agent."
                    : "The profile anchors discovery and qualification."
                }
              >
                <option value="">Choose a profile</option>
                {data.icps.map(icp => (
                  <option key={icp.id} value={icp.id}>
                    {icp.criteria.name}
                  </option>
                ))}
              </SelectField>
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Discovery source"
                  value={config.source}
                  onChange={value =>
                    updateConfig("source", value as PipelineConfig["source"])
                  }
                >
                  <option value="apify">Apify</option>
                  <option value="gojiberry">Gojiberry</option>
                  <option value="manus">Manus</option>
                </SelectField>
                <SelectField
                  label="Research provider"
                  value={config.researchProvider}
                  onChange={value =>
                    updateConfig(
                      "researchProvider",
                      value as PipelineConfig["researchProvider"]
                    )
                  }
                >
                  <option value="apify">Apify</option>
                  <option value="manus">Manus</option>
                </SelectField>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput
                  label="Daily discovery limit"
                  type="number"
                  min={1}
                  max={30}
                  value={config.dailyLimit}
                  onChange={event =>
                    updateConfig(
                      "dailyLimit",
                      Math.min(30, Math.max(1, Number(event.target.value) || 1))
                    )
                  }
                  hint="1–30 new discoveries per pacing day."
                />
                <TextInput
                  label="Interval between ticks (minutes)"
                  type="number"
                  min={240}
                  max={10080}
                  value={config.intervalMinutes}
                  onChange={event =>
                    updateConfig(
                      "intervalMinutes",
                      Math.min(
                        10080,
                        Math.max(60, Number(event.target.value) || 60)
                      )
                    )
                  }
                  hint="60–10,080 minutes."
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <TextInput
                  label="Timezone"
                  value={config.timezone}
                  onChange={event =>
                    updateConfig("timezone", event.target.value)
                  }
                  placeholder="UTC"
                />
                <TextInput
                  label="Start hour"
                  type="number"
                  min={0}
                  max={23}
                  value={config.startHour}
                  onChange={event =>
                    updateConfig(
                      "startHour",
                      Math.min(23, Math.max(0, Number(event.target.value) || 0))
                    )
                  }
                />
                <TextInput
                  label="End hour"
                  type="number"
                  min={1}
                  max={24}
                  value={config.endHour}
                  onChange={event =>
                    updateConfig(
                      "endHour",
                      Math.min(24, Math.max(1, Number(event.target.value) || 1))
                    )
                  }
                />
              </div>
              <label className="flex items-center gap-3 border border-line bg-paper p-3 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--terracotta)]"
                  checked={config.weekdaysOnly}
                  onChange={event =>
                    updateConfig("weekdaysOnly", event.target.checked)
                  }
                />
                <span>
                  <span className="font-semibold">Weekdays only</span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    Keep the pacing window Monday through Friday.
                  </span>
                </span>
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Outreach channel"
                  value={config.channel}
                  onChange={value =>
                    updateConfig("channel", value as PipelineConfig["channel"])
                  }
                >
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="x">X</option>
                </SelectField>
                <TextInput
                  label="Gojiberry result limit field"
                  value={config.gojiberryLimitField}
                  onChange={event =>
                    updateConfig("gojiberryLimitField", event.target.value)
                  }
                  placeholder="limit"
                  hint="Required numeric limit field from the live tool schema; the server forces it to 1."
                />
              </div>
              <TextArea
                label="Agent instructions"
                value={config.instructions}
                maxLength={5000}
                onChange={event =>
                  updateConfig("instructions", event.target.value)
                }
                hint="Grounded research instructions. Never add credentials here."
              />
            </div>
          </section>

          <section className="border border-line bg-white p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <MonoLabel>Provider-specific fields</MonoLabel>
                <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
                  Only fill what the provider needs.
                </h2>
              </div>
              <Bot className="h-5 w-5 text-terracotta" />
            </div>
            <div className="mt-6 space-y-5">
              <TextInput
                label="Gojiberry tool name"
                value={config.gojiberryTool}
                onChange={event =>
                  updateConfig("gojiberryTool", event.target.value)
                }
                hint="Use an exact name from the discovered tools list; do not guess."
              />
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-ink">
                  Gojiberry arguments / JSON object
                </span>
                <textarea
                  value={argsText}
                  onChange={event => handleArgs(event.target.value)}
                  className={`min-h-36 w-full resize-y rounded-sm border bg-white px-3 py-2.5 font-mono text-xs text-ink outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10 ${argsError ? "border-red-300" : "border-line"}`}
                  spellCheck={false}
                />
                {argsError ? (
                  <span className="mt-1 block text-[11px] text-red-700">
                    {argsError}
                  </span>
                ) : (
                  <span className="mt-1 block text-[11px] leading-4 text-ink-muted">
                    Arguments are stored as structured JSON and sent only when
                    the stage explicitly runs.
                  </span>
                )}
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextInput
                  label="Manus project ID"
                  value={config.manusProjectId}
                  onChange={event =>
                    updateConfig("manusProjectId", event.target.value)
                  }
                />
                <TextInput
                  label="Manus connector IDs"
                  value={config.manusConnectorIds.join(", ")}
                  onChange={event =>
                    updateConfig(
                      "manusConnectorIds",
                      event.target.value
                        .split(",")
                        .map(value => value.trim())
                        .filter(Boolean)
                        .slice(0, 10)
                    )
                  }
                  hint="Comma-separated IDs; up to 10."
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={save.isPending || !config.icpId || Boolean(argsError)}
            >
              <Save className="h-4 w-4" />
              {save.isPending ? "Saving…" : "Save agent configuration"}
            </Button>
            {dirty && (
              <span className="font-mono text-[10px] uppercase tracking-[.1em] text-terracotta">
                Unsaved changes
              </span>
            )}
          </div>
        </form>

        <aside className="space-y-6">
          <IntegrationSummary integrations={data.integrations} />
          <ScheduleCard schedule={data.schedule} />
          <section className="border border-line bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <MonoLabel>Explicit run controls</MonoLabel>
                <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
                  Keep the next step visible.
                </h2>
              </div>
              <Sparkles className="h-5 w-5 text-terracotta" />
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              A bounded tick can incur provider usage. It does not send outreach
              or publish pages; review the resulting jobs and leads below.
            </p>
            <Button
              className="mt-5 w-full"
              variant="secondary"
              onClick={() => void runTick()}
              disabled={tick.isPending || !data.pipeline}
            >
              <Zap className="h-4 w-4" />
              {tick.isPending
                ? "Running bounded tick…"
                : "Run one bounded tick"}
            </Button>
            <Button
              className="mt-2 w-full"
              variant="secondary"
              onClick={() => void register()}
              disabled={registerSchedule.isPending || !data.pipeline}
            >
              <Clock3 className="h-4 w-4" />
              {registerSchedule.isPending
                ? "Registering…"
                : "Register recurring schedule"}
            </Button>
            <p className="mt-3 text-[11px] leading-5 text-ink-muted">
              Registration is owner-controlled server work. If this workspace is
              not published, the server may reject it and the error will remain
              visible.
            </p>
            {data.pipeline?.lastError && (
              <p className="mt-4 border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                Last agent error: {data.pipeline.lastError}
              </p>
            )}
          </section>
        </aside>
      </div>

      <div className="mt-6 space-y-6">
        {blocked && (
          <div className="flex items-start gap-3 border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <strong>Downstream work is blocked awaiting selection.</strong>
              <p>
                Select at least one researched candidate below before page or
                outreach stages can proceed.
              </p>
            </div>
          </div>
        )}
        <CandidateSelection
          leads={data.leads}
          onSelect={lead => void selectLead(lead)}
          pending={select.isPending}
        />
        <JobActivity jobs={data.jobs} />
      </div>

      {message && (
        <Toast
          message={message.text}
          kind={message.kind}
          onDismiss={() => setMessage(null)}
        />
      )}
    </>
  );
}

export const AgentsView = WorkspaceAgents;

export default WorkspaceAgents;

function JobRecovery({
  job,
}: {
  job: { id: number; provider: string; status: string };
}) {
  const utils = api.useUtils();
  const retry = api.pipeline.retry.useMutation();
  const reconcile = api.pipeline.reconcile.useMutation();
  const [error, setError] = useState("");
  async function act(kind: "retry" | "reconcile") {
    try {
      setError("");
      if (kind === "retry") {
        if (
          !window.confirm(
            "Retry this definitively failed stage? This can use provider resources; nothing is sent or published."
          )
        )
          return;
        await retry.mutateAsync({ jobId: job.id });
      } else {
        let sourceRunId: number | undefined, manusTaskId: string | undefined;
        if (job.provider === "apify") {
          const value = window.prompt(
            "Existing internal Apify run ID from Leads (not a new run):"
          );
          if (!value) return;
          sourceRunId = Number(value);
        } else if (job.provider === "manus") {
          const value = window.prompt(
            "Exact existing Manus task ID after inspecting the original task context:"
          );
          if (!value) return;
          manusTaskId = value;
        } else if (
          !window.confirm(
            "After reviewing existing provider results and page/outreach drafts, acknowledge this interrupted stage without replaying it?"
          )
        )
          return;
        await reconcile.mutateAsync({
          jobId: job.id,
          sourceRunId,
          manusTaskId,
        });
      }
      await utils.pipeline.get.invalidate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recovery failed.");
    }
  }
  return (
    <div className="mt-3">
      {["failed", "cancelled"].includes(job.status) && (
        <Button
          variant="secondary"
          disabled={retry.isPending}
          onClick={() => void act("retry")}
        >
          Retry failed stage
        </Button>
      )}
      {["unknown", "starting"].includes(job.status) && (
        <Button
          variant="secondary"
          disabled={reconcile.isPending}
          onClick={() => void act("reconcile")}
        >
          Reconcile existing provider work
        </Button>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
