import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Bot,
  Pause,
  Play,
  Plus,
  Clock3,
  RefreshCw,
  ChevronDown,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { api, type RouterOutputs } from "@/components/leadloom-types";
import {
  Button,
  SectionHeader,
  MonoLabel,
  Toast,
  TextInput,
  TextArea,
  StatusChip,
} from "@/components/LeadloomUI";
import {
  agentSourceIds,
  icpAgentConfigSchema,
  type IcpAgentConfig,
} from "@shared/icpAgents";
import { WorkspaceAgents } from "./WorkspaceAgents";
import "./icp-agents.css";
type Agent = RouterOutputs["icpAgents"]["list"]["agents"][number];
const sourceNames: Record<string, string> = {
  "apify/google-search-scraper": "Web signals",
  "harvestapi/linkedin-post-search": "LinkedIn posts",
  "harvestapi/linkedin-job-search": "LinkedIn jobs",
  "harvestapi/linkedin-company-search": "Company search",
  "fantastic-jobs/career-site-job-listing-api": "Career-site jobs",
};
const label = (v: string) => v.replaceAll("_", " ");
const date = (v: Date | string | null) =>
  v ? new Date(v).toLocaleString() : "After resume, within working hours";
export function IcpAgentsView() {
  const query = api.icpAgents.list.useQuery(undefined, {
    retry: false,
    refetchInterval: 15000,
  });
  const save = api.icpAgents.save.useMutation(),
    toggle = api.icpAgents.toggle.useMutation(),
    tick = api.icpAgents.tick.useMutation(),
    schedule = api.icpAgents.registerSchedule.useMutation(),
    reconcile = api.icpAgents.reconcile.useMutation();
  const [editor, setEditor] = useState<{
      icpId: number;
      name: string;
      config: IcpAgentConfig;
    } | null>(null),
    [expanded, setExpanded] = useState<number | null>(null),
    [message, setMessage] = useState<{
      text: string;
      kind: "error" | "success";
    }>(),
    [legacy, setLegacy] = useState(false);
  useEffect(() => {
    if (editor)
      document
        .querySelector(".ia-editor")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [Boolean(editor)]);
  const perform = async (fn: () => Promise<any>, success: string) => {
    try {
      const r = await fn();
      if (r?.error) throw Error(r.error);
      setMessage({ text: success, kind: "success" });
      await query.refetch();
      return true;
    } catch (e) {
      setMessage({
        text: e instanceof Error ? e.message : "Agent action failed.",
        kind: "error",
      });
      return false;
    }
  };
  const edit = (a?: Agent, icpId?: number) => {
    const id = a?.icpId ?? icpId ?? query.data?.icps[0]?.id ?? 0;
    setEditor({
      icpId: id,
      name:
        a?.name ??
        `${query.data?.icps.find(x => x.id === id)?.criteria.name ?? "ICP"} agent`,
      config:
        a?.config ??
        icpAgentConfigSchema.parse({
          allowedActorIds: [agentSourceIds[0]],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
    });
  };
  if (query.isLoading)
    return (
      <div className="border border-line p-10">Opening your ICP agents…</div>
    );
  if (query.error || !query.data)
    return (
      <div className="border border-line p-8 text-red-700">
        {query.error?.message ?? "Agents unavailable."}
        <Button variant="secondary" onClick={() => void query.refetch()}>
          Retry
        </Button>
      </div>
    );
  const data = query.data,
    total = data.agents.reduce((sum, a) => sum + a.delivered, 0);
  const update = (values: Partial<IcpAgentConfig>) =>
    setEditor(x => (x ? { ...x, config: { ...x.config, ...values } } : x));
  return (
    <>
      <SectionHeader
        eyebrow="Agents / ICP delivery desk"
        title="A few right leads. Every working day."
        description="One agent per ideal customer profile. Each chooses an allowed Apify source, checks the evidence and delivers one qualified lead at a time—not a thousand-row list."
        action={
          <Button onClick={() => edit()} disabled={!data.icps.length}>
            <Plus size={15} />
            Configure ICP agent
          </Button>
        }
      />
      <div className="ia-summary">
        <div>
          <MonoLabel>Delivered today · each agent’s timezone</MonoLabel>
          <strong>{total}</strong>
          <span>qualified leads added to your database</span>
        </div>
        <div>
          <MonoLabel>Independent agents</MonoLabel>
          <strong>
            {data.agents.filter(a => a.enabled).length}
            <small> / {data.agents.length}</small>
          </strong>
          <span>Each has its own pace, sources and pause switch</span>
        </div>
        <div>
          <MonoLabel>Execution</MonoLabel>
          <strong className="ia-worker">
            {data.worker.active
              ? data.worker.environment === "cloud"
                ? "Cloud Computer worker active"
                : "Server worker active"
              : "Worker not active here"}
          </strong>
          <span>
            {data.worker.environment === "cloud"
              ? "Runs on the Cloud Computer, independently of your Mac or browser. No separate published schedule is needed."
              : "Runs in the app server, independently of an open dashboard."}
            {data.worker.active && (
              <span className="block mt-2">
                Checks every {data.worker.pollIntervalSeconds} seconds ·{" "}
                {data.worker.lastCheckAt
                  ? `Last check: ${new Date(data.worker.lastCheckAt).toLocaleTimeString()}`
                  : "First check within one minute"}
              </span>
            )}
            {data.worker.lastError && (
              <span className="block text-red-700">
                {data.worker.lastError}
              </span>
            )}
          </span>
        </div>
      </div>
      {message && (
        <Toast
          message={message.text}
          kind={message.kind}
          onDismiss={() => setMessage(undefined)}
        />
      )}
      <div className="ia-roster">
        {!data.agents.length && (
          <section className="ia-empty">
            <Bot size={28} />
            <h2>Your first ICP deserves its own scout.</h2>
            <p>
              Approve its source strategy, choose a small daily target, then
              resume the agent. We never create filler leads to reach a quota.
            </p>
            <Link href="/app/sources">
              Review source strategies <ArrowUpRight size={14} />
            </Link>
          </section>
        )}
        {data.agents.map(a => (
          <section className="ia-agent" key={a.id}>
            <header>
              <div className="ia-title">
                <span className="ia-index">
                  {String(a.id).padStart(2, "0")}
                </span>
                <div>
                  <MonoLabel>ICP / {a.icpName}</MonoLabel>
                  <h2>{a.name}</h2>
                </div>
              </div>
              <StatusChip tone={a.enabled ? "good" : "neutral"}>
                {label(a.state)}
              </StatusChip>
            </header>
            <div className="ia-agent-body">
              <div className="ia-delivery">
                <strong>
                  {a.delivered}
                  <span> / {a.config.dailyTarget}</span>
                </strong>
                <p>qualified leads delivered today</p>
                <div className="ia-meter">
                  <span
                    style={{
                      width: `${Math.min(100, (a.delivered / a.config.dailyTarget) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  {a.attempts} / {a.config.maxDailyAttempts} search turns ·{" "}
                  {a.config.timezone}
                </small>
              </div>
              <div className="ia-history">
                <MonoLabel>Daily deliveries · last 7 days</MonoLabel>
                <div className="ia-days">
                  {a.history.map(d => (
                    <div
                      key={d.day}
                      title={`${d.day}: ${d.delivered} qualified leads`}
                    >
                      <b>{d.delivered}</b>
                      <span
                        className="ia-bar"
                        style={{
                          height: `${12 + Math.min(d.delivered, 5) * 7}px`,
                        }}
                      />
                      <small>{d.day.slice(5)}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ia-policy">
                <MonoLabel>Source tools · agent chooses per turn</MonoLabel>
                <p>
                  {a.config.allowedActorIds
                    .map(id => sourceNames[id])
                    .join(" · ")}
                </p>
                <span>
                  <Clock3 size={13} /> At least {a.config.intervalMinutes} min
                  between searches
                </span>
                <span>Next eligible: {date(a.nextRunAt)}</span>
                <span>
                  {a.config.weekdaysOnly ? "Weekdays" : "Every day"}{" "}
                  {a.config.startHour}:00–{a.config.endHour}:00 ·{" "}
                  {a.config.execution === "local"
                    ? data.worker.environment === "cloud"
                      ? "Cloud Computer"
                      : "App server"
                    : "Platform schedule"}
                </span>
              </div>
            </div>
            {a.lastError && (
              <div className="ia-error">Paused for review: {a.lastError}</div>
            )}
            <footer>
              <div className="ia-actions">
                <Button
                  variant="secondary"
                  disabled={toggle.isPending}
                  onClick={() =>
                    void perform(
                      () =>
                        toggle.mutateAsync({ id: a.id, enabled: !a.enabled }),
                      a.enabled
                        ? "This ICP agent is paused. Existing provider runs were not cancelled."
                        : "This ICP agent is resumed; daily caps remain enforced."
                    )
                  }
                >
                  {a.enabled ? <Pause size={14} /> : <Play size={14} />}
                  {a.enabled ? "Pause agent" : "Resume agent"}
                </Button>
                <Button variant="secondary" onClick={() => edit(a)}>
                  Edit pace & sources
                </Button>
                {a.config.execution === "local" ? (
                  <Button
                    variant="ghost"
                    disabled={tick.isPending || !a.enabled}
                    onClick={() =>
                      void perform(
                        () => tick.mutateAsync({ id: a.id }),
                        "One eligible agent turn checked. No automatic publication or outreach."
                      )
                    }
                  >
                    <RefreshCw size={14} />
                    Check one turn
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    disabled={schedule.isPending}
                    onClick={() =>
                      void perform(
                        () => schedule.mutateAsync({ id: a.id }),
                        "Hosted schedule registered; it requires this version to be published."
                      )
                    }
                  >
                    Register hosted schedule
                  </Button>
                )}
              </div>
              <button
                className="ia-detail-toggle"
                onClick={() => setExpanded(expanded === a.id ? null : a.id)}
              >
                <ChevronDown size={14} /> {expanded === a.id ? "Hide" : "View"}{" "}
                activity
              </button>
            </footer>
            {expanded === a.id && (
              <div className="ia-activity">
                <div>
                  <MonoLabel>Agent decisions & turns</MonoLabel>
                  {!a.cycles.length && (
                    <p>
                      No turns yet. This agent has not searched or delivered a
                      lead.
                    </p>
                  )}
                  {a.cycles.map(c => (
                    <article key={c.id}>
                      <div>
                        <StatusChip>{label(c.status)}</StatusChip>
                        <small>{date(c.createdAt)}</small>
                      </div>
                      <b>
                        {c.actorId
                          ? (sourceNames[c.actorId] ?? c.actorId)
                          : "Choosing a source"}{" "}
                        {c.decision?.query && ` / ${c.decision.query}`}
                      </b>
                      <p>
                        {String(
                          c.result?.summary ??
                            c.error ??
                            c.decision?.reason ??
                            "Waiting for the next observed stage."
                        )}
                      </p>
                      <small>
                        {c.candidatesExamined} candidate records examined · turn{" "}
                        {c.id}
                      </small>
                      {c.externalId && (
                        <a
                          href={`https://console.apify.com/actors/runs/${encodeURIComponent(c.externalId)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Provider run ↗
                        </a>
                      )}
                      {c.status === "unknown" && (
                        <div className="ia-actions">
                          <Button
                            variant="secondary"
                            disabled={reconcile.isPending}
                            onClick={() => {
                              const id = window.prompt(
                                "Existing Apify run ID from provider history. It must match this agent/turn’s signed input."
                              );
                              if (id)
                                void perform(
                                  () =>
                                    reconcile.mutateAsync({
                                      cycleId: c.id,
                                      externalId: id.trim(),
                                    }),
                                  "Original provider run attached. Resume the agent to inspect it."
                                );
                            }}
                          >
                            Attach original run
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => {
                              if (
                                window.confirm(
                                  "Have you checked Apify run history and confirmed this turn created no external run?"
                                )
                              )
                                void perform(
                                  () =>
                                    reconcile.mutateAsync({
                                      cycleId: c.id,
                                      confirmedNoRun: true,
                                    }),
                                  "Turn reconciled without replay. Resume when ready."
                                );
                            }}
                          >
                            Confirmed no run exists
                          </Button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
                <div>
                  <MonoLabel>Leads delivered by this ICP agent</MonoLabel>
                  {!a.deliveries.length && (
                    <p>
                      No qualified leads delivered yet. Weak and duplicate
                      candidates do not count.
                    </p>
                  )}
                  {a.deliveries.map(l => (
                    <Link
                      key={l.id}
                      href={`/app/leads/${l.id}`}
                      className="ia-lead"
                    >
                      <span>
                        {l.companyName}
                        <small>{l.day}</small>
                      </span>
                      <b>{l.score}/100 ↗</b>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
      {editor && (
        <section className="ia-editor" aria-label="ICP agent configuration">
          <header>
            <MonoLabel>Configure / saved paused</MonoLabel>
            <h2>One ICP. A clear mandate.</h2>
          </header>
          <form
            onSubmit={e => {
              e.preventDefault();
              void (async () => {
                let parsed: IcpAgentConfig;
                try {
                  parsed = icpAgentConfigSchema.parse(editor.config);
                } catch {
                  setMessage({
                    text: "Check daily bounds, timezone and working hours. Choose at least one available source.",
                    kind: "error",
                  });
                  return;
                }
                const ok = await perform(
                  () => save.mutateAsync({ ...editor, config: parsed }),
                  "Agent saved paused. Resume it explicitly after reviewing the policy."
                );
                if (ok) setEditor(null);
              })();
            }}
          >
            <label className="ia-select">
              Ideal customer profile
              <select
                aria-label="Agent ideal customer profile"
                value={editor.icpId}
                onChange={e => {
                  const id = Number(e.target.value);
                  setEditor(x =>
                    x
                      ? {
                          ...x,
                          icpId: id,
                          name: `${data.icps.find(x => x.id === id)?.criteria.name ?? "ICP"} agent`,
                        }
                      : x
                  );
                }}
              >
                {data.icps.map(i => (
                  <option value={i.id} key={i.id}>
                    {i.criteria.name}
                  </option>
                ))}
              </select>
            </label>
            <TextInput
              label="Agent name"
              value={editor.name}
              onChange={e =>
                setEditor(x => (x ? { ...x, name: e.target.value } : x))
              }
            />
            <div className="ia-fields">
              <TextInput
                label="Qualified leads per day · max 5"
                type="number"
                min={1}
                max={5}
                value={editor.config.dailyTarget}
                onChange={e => update({ dailyTarget: Number(e.target.value) })}
              />
              <TextInput
                label="Search turns per day · max 6"
                type="number"
                min={1}
                max={6}
                value={editor.config.maxDailyAttempts}
                onChange={e =>
                  update({ maxDailyAttempts: Number(e.target.value) })
                }
              />
              <TextInput
                label="Minutes between searches · min 120"
                type="number"
                min={120}
                max={10080}
                value={editor.config.intervalMinutes}
                onChange={e =>
                  update({ intervalMinutes: Number(e.target.value) })
                }
              />
              <TextInput
                label="IANA timezone"
                value={editor.config.timezone}
                onChange={e => update({ timezone: e.target.value })}
              />
              <TextInput
                label="Start hour"
                type="number"
                min={0}
                max={23}
                value={editor.config.startHour}
                onChange={e => update({ startHour: Number(e.target.value) })}
              />
              <TextInput
                label="End hour"
                type="number"
                min={1}
                max={24}
                value={editor.config.endHour}
                onChange={e => update({ endHour: Number(e.target.value) })}
              />
            </div>
            <label>
              <input
                type="checkbox"
                checked={editor.config.weekdaysOnly}
                onChange={e => update({ weekdaysOnly: e.target.checked })}
              />{" "}
              Weekdays only
            </label>
            <fieldset>
              <legend>
                Allowed discovery tools — agent chooses one per turn
              </legend>
              <p>
                Only validated, bounded tools. Five company/post/job records per
                turn, or ten for the job API’s minimum; never bulk delivery.
                $0.50 maximum Apify charge parameter per turn. Contacts,
                comments and reactions are excluded.
              </p>
              {agentSourceIds.map(id => {
                const available = data.catalog.some(a => a.id === id);
                return (
                  <label key={id}>
                    <input
                      type="checkbox"
                      disabled={!available}
                      checked={editor.config.allowedActorIds.includes(id)}
                      onChange={e =>
                        update({
                          allowedActorIds: e.target.checked
                            ? [...editor.config.allowedActorIds, id]
                            : editor.config.allowedActorIds.filter(
                                x => x !== id
                              ),
                        })
                      }
                    />
                    {sourceNames[id]}
                    {!available ? " · unavailable" : ""}
                  </label>
                );
              })}
            </fieldset>
            <TextArea
              label="Agent instructions"
              value={editor.config.instructions}
              onChange={e => update({ instructions: e.target.value })}
            />
            <label className="ia-select">
              Runs on
              <select
                aria-label="Agent executor"
                value={editor.config.execution}
                onChange={e =>
                  update({ execution: e.target.value as "local" | "hosted" })
                }
              >
                <option value="local">
                  {data.worker.environment === "cloud"
                    ? "Cloud Computer · automatic server worker"
                    : "App server · automatic worker"}
                </option>
                {data.worker.environment !== "cloud" ||
                editor.config.execution === "hosted" ? (
                  <option value="hosted">
                    Platform hosting · separate schedule
                  </option>
                ) : null}
              </select>
            </label>
            <p className="ia-note">
              A current approved source strategy is required. Saving pauses the
              agent without resetting its history. The daily target is a
              maximum, not a promise of matches. No catch-up burst, automatic
              outreach or landing-page publication.
            </p>
            <div className="ia-actions">
              <Button disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save ICP agent · paused"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditor(null)}
              >
                Cancel
              </Button>
              <Link href="/app/sources">Review source strategy ↗</Link>
            </div>
          </form>
        </section>
      )}
      <div className="ia-legacy">
        <button onClick={() => setLegacy(!legacy)}>
          <ChevronDown size={14} /> Legacy company pipeline / page & outreach
          stages
        </button>
        <p>
          Separate from ICP sourcing agents. Do not enable both for the same
          ICP. Select delivered leads in the existing pipeline for private pages
          and outreach drafts.
        </p>
        {legacy && <WorkspaceAgents />}
      </div>
    </>
  );
}
