import { pricingSummary, sourceInputPreview } from "@shared/sourcePreview";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowUpRight,
  Check,
  Loader2,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  api,
  type Workspace,
  type RouterOutputs,
} from "@/components/leadloom-types";
import {
  Button,
  MonoLabel,
  SectionHeader,
  TextArea,
  TextInput,
  StatusChip,
} from "@/components/LeadloomUI";
import {
  sourceQuestions,
  sourceAnswersSchema,
  type SourceAnswers,
  type SourceActor,
} from "@shared/sourcePlans";

type Plan = RouterOutputs["sources"]["list"]["plans"][number];
function defaults(
  workspace: Workspace,
  criteria?: {
    industries: string;
    geography: string;
    companySize: string;
    roles: string;
    signals: string;
    exclusions: string;
  }
): SourceAnswers {
  return {
    outcome: workspace.company.brand.offer.slice(0, 3000),
    signals: criteria?.signals ?? "",
    accountFilters: [
      criteria?.industries,
      criteria?.geography,
      criteria?.companySize,
    ]
      .filter(Boolean)
      .join("; "),
    buyerRoles: criteria?.roles ?? "",
    exclusions: criteria?.exclusions ?? "",
    evidence:
      "An exact public statement with its original source URL and posting date; a named active initiative, current stage and behavior at risk. Keep unknowns explicit.",
    preferences:
      "Prioritize primary engineering pages and dated project evidence. Identify contacts only after qualification.",
    recencyDays: 90,
    dailyLimit: 3,
  };
}
function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}
function ActorDetails({ actor }: { actor: SourceActor }) {
  return (
    <details className="mt-3 border-t border-line pt-3 text-xs leading-5">
      <summary className="cursor-pointer font-semibold">
        Live input schema & pricing
      </summary>
      <p className="mt-3 text-ink-muted">
        Checked {new Date(actor.checkedAt).toLocaleString()}. {actor.caveat}{" "}
        Published rates may depend on plan, event, optional enrichment and
        memory; this is not an all-in usage quote.
      </p>
      <MonoLabel className="mt-4 block">Current pricing metadata</MonoLabel>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all bg-paper p-3 font-mono text-[10px]">
        {actor.pricing
          ? json(actor.pricing)
          : "No current pricing schedule was supplied. Do not assume free usage."}
      </pre>
      <MonoLabel className="mt-4 block">Default input schema</MonoLabel>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all bg-paper p-3 font-mono text-[10px]">
        {actor.schema
          ? json(actor.schema)
          : "No verified default input schema."}
      </pre>
    </details>
  );
}
export function SourcesView({ workspace }: { workspace: Workspace }) {
  const profiles = api.icps.list.useQuery(undefined, { retry: false });
  const catalog = api.sources.catalog.useQuery(undefined, {
    retry: false,
    staleTime: 600000,
  });
  const [icpId, setIcpId] = useState(() => {
    const value = Number(
      new URLSearchParams(window.location.search).get("icpId")
    );
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  });
  const plans = api.sources.list.useQuery(
    { icpId },
    { enabled: icpId > 0, retry: false }
  );
  const recommend = api.sources.recommend.useMutation();
  const approve = api.sources.approve.useMutation();
  const [answers, setAnswers] = useState<SourceAnswers>(() =>
    defaults(workspace)
  );
  const [chosen, setChosen] = useState("apify/google-search-scraper");
  const [query, setQuery] = useState("");
  const [optional, setOptional] = useState<string[]>([]);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [started, setStarted] = useState<number>();
  const [elapsed, setElapsed] = useState(0);
  const plan: Plan | undefined = plans.data?.plans[0];
  const canManage = workspace.role === "owner";
  useEffect(() => {
    if (started === undefined) return;
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [started]);
  useEffect(() => {
    if (!plan) return;
    setChosen(
      plan.selection?.actorId ??
        plan.recommendation.sources.find(source => source.role === "discovery")
          ?.actorId ??
        "apify/google-search-scraper"
    );
    setQuery(plan.selection?.query ?? plan.recommendation.queries[0] ?? "");
    setOptional(
      plan.selection?.optionalActorIds ??
        plan.recommendation.sources
          .filter(source => source.role !== "discovery")
          .map(source => source.actorId)
    );
  }, [
    plan?.id,
    JSON.stringify(plan?.selection),
    JSON.stringify(plan?.recommendation),
  ]);
  useEffect(() => {
    if (plan) setAnswers(plan.answers);
  }, [plan?.id]);
  const changeIcp = (id: number) => {
    setIcpId(id);
    const criteria = profiles.data?.find(item => item.id === id)?.criteria;
    setAnswers(defaults(workspace, criteria));
    setMessage(undefined);
    setError(undefined);
  };
  const propose = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    setMessage(undefined);
    const validated = sourceAnswersSchema.safeParse(answers);
    if (!validated.success) {
      setError(validated.error.issues[0]?.message ?? "Review your answers.");
      return;
    }
    setStarted(Date.now());
    try {
      await recommend.mutateAsync({ icpId, answers: validated.data });
      await plans.refetch();
      setMessage(
        "Your source strategy is saved for review. No scrape or recurring agent was started."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Source strategy could not be prepared."
      );
    } finally {
      setStarted(undefined);
    }
  };
  const approvePlan = async () => {
    if (!plan) return;
    setError(undefined);
    setMessage(undefined);
    try {
      const result = await approve.mutateAsync({
        id: plan.id,
        selection: { actorId: chosen, query, optionalActorIds: optional },
      });
      await plans.refetch();
      setMessage(
        result.executable
          ? "Strategy approved. Start a bounded run in Leads or configure your pace in Agents. Nothing has started automatically."
          : "Strategy approved for planning. This specialist source requires execution-adapter activation before discovery; it will not be replaced with Google Search."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Source approval failed.");
    }
  };
  const actor = catalog.data?.find(item => item.id === chosen);
  return (
    <div>
      <SectionHeader
        eyebrow="01 / research strategy"
        title="Find a reason. Then find the lead."
        description="Choose an ICP, tell us what would make an account worth contacting, and review the right Apify sources before any discovery runs."
      />
      {plan?.approvedAt && !plan.stale && (
        <div className="mb-5 border border-line p-4 text-sm">
          <ShieldCheck size={16} className="inline mr-2" />
          This ICP’s strategy is approved.{" "}
          <Link className="underline ml-2" href="/app/agents">
            Configure & start its cloud agent ↗
          </Link>
        </div>
      )}
      <div className="mb-7 flex flex-wrap items-center gap-3 border-y border-line py-4 text-xs text-ink-muted">
        <ShieldCheck className="h-4 w-4 text-terracotta" />
        <span>Backend-managed Apify</span>
        <span>Questions → sources → your approval → paced discovery</span>
        <Link href="/app/icps" className="ml-auto underline">
          Edit ICPs
        </Link>
      </div>
      {!canManage && (
        <p className="mb-5 border border-line p-4 text-sm">
          Only the company owner can recommend or approve sourcing strategies.
          You can inspect the source catalog and saved plans.
        </p>
      )}
      <label className="mb-7 block max-w-xl">
        <span className="mb-2 block text-xs font-semibold">
          Which ideal customer profile (ICP) are we sourcing for?
        </span>
        <select
          value={icpId || ""}
          onChange={e => changeIcp(Number(e.target.value))}
          disabled={recommend.isPending}
          className="w-full border border-line bg-white p-3 text-sm"
        >
          <option value="">Choose an ICP</option>
          {profiles.data?.map(profile => (
            <option key={profile.id} value={profile.id}>
              {profile.criteria.name}
            </option>
          ))}
        </select>
      </label>
      {profiles.isError && (
        <p role="alert" className="mb-5 text-sm text-red-700">
          ICPs could not load.{" "}
          <button onClick={() => void profiles.refetch()} className="underline">
            Retry
          </button>
        </p>
      )}
      {profiles.data?.length === 0 && (
        <p className="mb-5 text-sm">
          Add an ICP in{" "}
          <Link href="/app/icps" className="underline">
            ICPs
          </Link>
          , or analyze your company website in onboarding first.
        </p>
      )}
      {icpId > 0 && (
        <form
          onSubmit={propose}
          className="border border-line bg-white p-5 sm:p-7"
        >
          <MonoLabel>01 / Tell us what matters</MonoLabel>
          <h2 className="mt-3 font-display text-3xl">
            Better questions. Better sources.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            These answers are separate from your saved ICP. A recommendation
            does not change that profile, start scraping, or authorize contact
            enrichment. Refine this questionnaire to create a new review.
          </p>
          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            {sourceQuestions.map((item, index) => (
              <TextArea
                key={item.key}
                label={`${String(index + 1).padStart(2, "0")} / ${item.label}`}
                hint={item.hint}
                value={answers[item.key]}
                disabled={!canManage || recommend.isPending}
                maxLength={
                  item.key === "buyerRoles"
                    ? 1500
                    : item.key === "preferences" || item.key === "exclusions"
                      ? 2000
                      : 3000
                }
                onChange={e =>
                  setAnswers(current => ({
                    ...current,
                    [item.key]: e.target.value,
                  }))
                }
              />
            ))}
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <TextInput
              label="How recent must the signal be? (days)"
              type="number"
              min={1}
              max={365}
              value={answers.recencyDays}
              disabled={!canManage || recommend.isPending}
              onChange={e =>
                setAnswers(current => ({
                  ...current,
                  recencyDays: Number(e.target.value),
                }))
              }
            />
            <TextInput
              label="Daily candidate ceiling for this strategy"
              hint="Default: 3. This is not 3 guaranteed qualified leads. Provider batch minimums may exceed imports; they must be shown before activation."
              type="number"
              min={1}
              max={30}
              value={answers.dailyLimit}
              disabled={!canManage || recommend.isPending}
              onChange={e =>
                setAnswers(current => ({
                  ...current,
                  dailyLimit: Number(e.target.value),
                }))
              }
            />
          </div>
          <Button
            type="submit"
            className="mt-7"
            disabled={
              !canManage ||
              recommend.isPending ||
              catalog.isLoading ||
              catalog.isError
            }
          >
            <Search className="h-4 w-4" />
            {recommend.isPending
              ? "Preparing your source strategy…"
              : "Recommend Apify sources"}
          </Button>
          {recommend.isPending && (
            <div
              role="status"
              aria-live="polite"
              className="mt-5 flex gap-4 border border-line bg-paper p-5"
            >
              <Loader2 className="mt-1 h-5 w-5 shrink-0 animate-spin" />
              <div>
                <MonoLabel>Source strategist / {elapsed}s elapsed</MonoLabel>
                <h3 className="mt-2 font-display text-2xl">
                  Evaluating your answers and source capabilities.
                </h3>
                <p className="mt-2 text-xs leading-5 text-ink-muted">
                  Using live actor schemas, pricing metadata and your company
                  context. No scrape has started. Stay on this page until the
                  editable strategy is saved; there is no simulated completion
                  percentage.
                </p>
              </div>
            </div>
          )}
        </form>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="mt-5 border border-line bg-white p-4 text-sm"
        >
          {message}
        </p>
      )}
      {plans.isLoading && icpId > 0 && (
        <p role="status" className="mt-6 text-sm">
          Loading this ICP’s saved strategy…
        </p>
      )}
      {plans.isError && (
        <p role="alert" className="mt-6 text-sm text-red-700">
          Saved strategies could not load.{" "}
          <button className="underline" onClick={() => void plans.refetch()}>
            Retry
          </button>
        </p>
      )}
      {plan && (
        <section className="mt-10 border border-line bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            <MonoLabel>02 / Recommended source stack</MonoLabel>
            <StatusChip
              tone={plan.stale ? "warn" : plan.approvedAt ? "good" : "accent"}
            >
              {plan.stale
                ? "Needs re-review"
                : plan.approvedAt
                  ? "Approved strategy"
                  : "Awaiting your review"}
            </StatusChip>
          </div>
          <h2 className="mt-4 font-display text-3xl">
            {plan.recommendation.cohort}
          </h2>
          <p className="mt-3 text-sm leading-6">
            {plan.recommendation.summary}
          </p>
          <div className="mt-7 divide-y divide-line border-y border-line">
            {plan.recommendation.sources.map(source => {
              const item = plan.catalog.find(a => a.id === source.actorId);
              return (
                <article key={source.actorId} className="py-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusChip>{source.role}</StatusChip>
                    <h3 className="font-display text-2xl">
                      {item?.name ?? source.actorId}
                    </h3>
                    <a
                      href={`https://apify.com/${source.actorId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs underline"
                    >
                      Actor details <ArrowUpRight className="inline h-3 w-3" />
                    </a>
                  </div>
                  <p className="mt-3 text-sm leading-6">{source.why}</p>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">
                    {source.caveat}
                  </p>
                  {item && (
                    <>
                      <p className="mt-2 text-xs font-semibold">
                        {item.adapter
                          ? "Bounded adapter available; live scrape not tested in this setup."
                          : "Recommended source / execution adapter not activated"}
                      </p>
                      <div className="mt-3 text-xs leading-5 text-ink-muted">
                        {pricingSummary(item.pricing).map((line, index) => (
                          <p key={index}>{line}</p>
                        ))}
                      </div>
                      <details className="mt-3 text-xs">
                        <summary className="cursor-pointer font-semibold">
                          Bounded example input / not a run
                        </summary>
                        <pre className="mt-3 overflow-auto whitespace-pre-wrap break-all bg-paper p-3 text-[10px]">
                          {json(
                            sourceInputPreview(
                              item.id,
                              query ||
                                plan.selection?.query ||
                                plan.recommendation.queries[0],
                              plan.answers
                            )
                          )}
                        </pre>
                        <p className="mt-2 text-ink-muted">
                          {plan.selection?.query !== query &&
                            "Unsaved query preview. "}
                          Preview only; known-company/person placeholders must
                          be replaced after qualification. Current actor schema
                          must validate this input before execution. Career-site
                          searches fetch at least 10 provider records; only the
                          reviewed daily candidate allowance may be imported.
                        </p>
                      </details>
                      <ActorDetails actor={item} />
                    </>
                  )}
                </article>
              );
            })}
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <MonoLabel>Qualification must prove</MonoLabel>
              <p className="mt-3 text-sm leading-6">
                {plan.recommendation.qualification}
              </p>
            </div>
            <div>
              <MonoLabel>Official alternatives & gaps</MonoLabel>
              <p className="mt-3 text-sm leading-6">
                {plan.recommendation.alternatives}
              </p>
              {plan.recommendation.unknowns.map((gap, index) => (
                <p key={index} className="mt-2 text-xs text-ink-muted">
                  — {gap}
                </p>
              ))}
            </div>
          </div>
          <details className="mt-6 border-t border-line pt-4">
            <summary className="cursor-pointer text-xs font-semibold">
              Answers used for this saved strategy
            </summary>
            <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words text-xs">
              {json(plan.answers)}
            </pre>
          </details>
          <div className="mt-7 border-t border-line pt-7">
            <MonoLabel>03 / Approve the discovery source</MonoLabel>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              Select the best source, not just the one currently implemented. If
              a specialist adapter is pending, we will block execution rather
              than silently change your strategy. Optional evidence/contact
              stages below are planning selections—not automatic enrichment.
            </p>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-semibold">
                Primary discovery actor
              </span>
              <select
                value={chosen}
                onChange={e => setChosen(e.target.value)}
                disabled={!canManage || approve.isPending}
                className="w-full border border-line bg-paper p-3 text-sm"
              >
                {(catalog.data ?? plan.catalog)
                  .filter(item => item.role === "discovery" && item.available)
                  .map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.adapter
                        ? " — bounded adapter"
                        : " — activation needed"}
                    </option>
                  ))}
              </select>
            </label>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-semibold">
                Approved search phrase
              </span>
              <select
                aria-label="Suggested search phrases"
                value=""
                onChange={e => setQuery(e.target.value)}
                disabled={!canManage || approve.isPending}
                className="mb-2 w-full border border-line bg-paper p-2 text-xs"
              >
                <option value="">Use a suggested phrase…</option>
                {plan.recommendation.queries.map(q => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
              <textarea
                value={query}
                maxLength={1500}
                onChange={e => setQuery(e.target.value)}
                disabled={!canManage || approve.isPending}
                className="min-h-24 w-full border border-line bg-white p-3 text-sm"
              />
            </label>
            <div className="mt-5 space-y-2">
              {plan.catalog
                .filter(item => item.role !== "discovery" && item.available)
                .map(item => (
                  <label key={item.id} className="flex gap-3 text-xs">
                    <input
                      type="checkbox"
                      checked={optional.includes(item.id)}
                      disabled={!canManage || approve.isPending}
                      onChange={e =>
                        setOptional(current =>
                          e.target.checked
                            ? [...current, item.id]
                            : current.filter(id => id !== item.id)
                        )
                      }
                    />
                    {item.name} / {item.role}
                    {item.adapter ? "" : " / proposed stage"}
                  </label>
                ))}
            </div>
            {actor && !actor.adapter && (
              <p className="mt-4 border border-line bg-paper p-4 text-xs leading-5">
                This source can be approved as your preferred strategy, but its
                execution adapter must be activated before discovery. No live
                run is implied.
              </p>
            )}
            <Button
              className="mt-6"
              onClick={() => void approvePlan()}
              disabled={
                !canManage ||
                approve.isPending ||
                plan.stale ||
                query.trim().length < 3 ||
                !actor?.available
              }
            >
              <Check className="h-4 w-4" />
              {approve.isPending
                ? "Saving approval…"
                : "Approve this source strategy"}
            </Button>
            <Link href="/app/leads" className="ml-4 text-sm underline">
              Open Leads
            </Link>
          </div>
        </section>
      )}
      <section className="mt-10">
        <MonoLabel>Source catalog / read-only metadata</MonoLabel>
        <h2 className="mt-3 font-display text-3xl">
          Different sources. Different jobs.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
          Discovery is not qualification. Company lists, buying signals, primary
          evidence and contact lookup are separate stages. Pricing and schemas
          below come from the current Apify default build—not a hardcoded lead
          database.
        </p>
        {catalog.isLoading && (
          <p role="status" className="mt-5 text-sm">
            Checking live actor schemas and pricing…
          </p>
        )}
        {catalog.isError && (
          <p role="alert" className="mt-5 text-sm text-red-700">
            Actor catalog could not load.{" "}
            <Button variant="secondary" onClick={() => void catalog.refetch()}>
              Retry catalog
            </Button>
          </p>
        )}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {catalog.data?.map(item => (
            <article
              key={item.id}
              className="min-w-0 border border-line bg-white p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip>{item.role}</StatusChip>
                <StatusChip tone={item.available ? "good" : "warn"}>
                  {item.available ? "Schema verified" : "Not verified"}
                </StatusChip>
              </div>
              <h3 className="mt-3 font-display text-2xl">{item.name}</h3>
              <p className="mt-2 text-xs leading-5 text-ink-muted">
                {item.use}
              </p>
              <ActorDetails actor={item} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
