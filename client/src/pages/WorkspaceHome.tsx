import { useState } from "react";
import { ArrowRight, CheckCircle2, Plus, Save, Target } from "lucide-react";
import type { IcpCriteria } from "@shared/domain";
import type { Workspace, IcpRow } from "@/components/leadloom-types";
import { api } from "@/components/leadloom-types";
import {
  Button,
  DrawerDialog,
  EmptyState,
  MonoLabel,
  SectionHeader,
  StatCard,
  StatusChip,
  TextArea,
  TextInput,
  Toast,
} from "@/components/LeadloomUI";

const starter: IcpCriteria = {
  name: "Engineering teams with a review bottleneck",
  industries: "Developer infrastructure, SaaS, technical product teams",
  geography: "North America, UK, Europe",
  companySize: "50–1,000 employees",
  roles: "VP Engineering, Head of Platform, Engineering Productivity",
  keywords: "coding agents, regression, code review, developer experience",
  signals:
    "Hiring for platform or developer productivity; discussing review quality; shipping at scale",
  exclusions: "Agencies, consumer-only products, no public engineering surface",
  minScore: 70,
};

export function OverviewView({ workspace }: { workspace: Workspace }) {
  const stats = workspace.stats;
  const stages = [
    {
      number: "01",
      label: "Define a profile",
      detail: "Make the fit legible",
      count: "Profiles",
      value: "—",
      href: "/app/icps",
    },
    {
      number: "02",
      label: "Source companies",
      detail: "Search with provenance",
      count: "Leads",
      value: stats.leads,
      href: "/app/leads",
    },
    {
      number: "03",
      label: "Research fit",
      detail: "Facts before instinct",
      count: "Qualified",
      value: stats.qualified,
      href: "/app/leads",
    },
    {
      number: "04",
      label: "Start a conversation",
      detail: "Personal, never automatic",
      count: "Pages / drafts",
      value: `${stats.pages} / ${stats.outreach}`,
      href: "/app/pages",
    },
  ];
  return (
    <>
      <SectionHeader
        eyebrow="Workspace / today"
        title="A better reason to reach out."
        description="Your company workspace, at a glance. The numbers below are live records — zero is a useful place to begin."
        action={
          <StatusChip tone="good">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" />
            Live workspace
          </StatusChip>
        }
      />
      {workspace.role === "owner" &&
        !workspace.company.onboardingCompletedAt && (
          <section className="mb-7 flex flex-col gap-4 border border-terracotta/30 bg-terracotta-pale/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <MonoLabel className="text-terracotta">
                First owner pass / optional
              </MonoLabel>
              <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
                Let the company website suggest a starting point.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                Review real copy, observed style clues and editable ICP
                hypotheses before saving anything. You can keep working
                elsewhere while this remains open.
              </p>
            </div>
            <a
              href="/app/onboarding"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-sm bg-ink px-4 text-sm font-semibold text-paper hover:bg-ink/90"
            >
              Analyze company website <ArrowRight className="h-4 w-4" />
            </a>
          </section>
        )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {" "}
        <StatCard
          label="Companies"
          value={stats.leads}
          note="in your lead workspace"
        />
        <StatCard
          label="Qualified"
          value={stats.qualified}
          note="after research"
          tone="sage"
        />
        <StatCard
          label="Pages"
          value={stats.pages}
          note="drafts and published"
        />
        <StatCard
          label="Outreach"
          value={stats.outreach}
          note="prepared, not assumed sent"
          tone="terracotta"
        />
      </div>
      <div className="mt-10 grid gap-8 xl:grid-cols-[1.4fr_.6fr]">
        <div className="border border-line bg-white p-5 sm:p-7">
          <div className="flex items-start justify-between">
            <div>
              <MonoLabel>Pipeline / four considered steps</MonoLabel>
              <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
                From signal to send
              </h2>
            </div>
            <ArrowRight className="h-5 w-5 text-terracotta" />
          </div>
          <div className="mt-8 grid gap-0 sm:grid-cols-4">
            {stages.map(stage => (
              <a
                href={stage.href}
                key={stage.number}
                className="group border-t border-line py-5 sm:border-l sm:border-t-0 sm:px-5 sm:first:border-l-0 sm:first:pl-0"
              >
                <span className="font-mono text-[10px] text-terracotta">
                  {stage.number}
                </span>
                <h3 className="mt-10 text-sm font-semibold group-hover:text-terracotta">
                  {stage.label}
                </h3>
                <p className="mt-1 text-xs leading-5 text-ink-muted">
                  {stage.detail}
                </p>
                <p className="mt-7 font-display text-2xl tracking-[-.04em]">
                  {stage.value}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[.12em] text-ink-muted">
                  {stage.count}
                </p>
              </a>
            ))}
          </div>
        </div>
        <div className="border border-line bg-ink p-6 text-paper sm:p-7">
          <MonoLabel className="text-paper/50">Company profile</MonoLabel>
          <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
            {workspace.company.name}
          </h2>
          <p className="mt-1 truncate text-xs text-paper/55">
            {workspace.company.website}
          </p>
          <div className="mt-12 flex items-center gap-3">
            <img
              src="https://reqproof.com/assets/brand/proof-mark.svg"
              alt="Proof mark"
              className="h-9 w-9"
            />
            <div>
              <p className="text-sm font-semibold">Proof</p>
              <p className="text-xs text-paper/55">Pilot workspace</p>
            </div>
          </div>
          <a
            href="/app/settings"
            className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-paper underline underline-offset-4"
          >
            Review brand & voice <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <MonoLabel>Recent / activity</MonoLabel>
            <h2 className="mt-2 font-display text-2xl tracking-[-.04em]">
              What changed
            </h2>
          </div>
        </div>
        {workspace.recent.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="A clear desk"
            description="No activity yet. Start by shaping an ideal customer profile, then source your first considered lead."
            action={
              <a href="/app/icps">
                <Button>
                  Create a profile <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
            }
          />
        ) : (
          <div className="border border-line bg-white">
            {workspace.recent.map((event, i) => (
              <div
                key={event.id ?? i}
                className="flex items-start gap-4 border-b border-line px-5 py-4 last:border-0"
              >
                <span className="mt-1 h-2 w-2 rounded-full bg-terracotta" />
                <div>
                  <p className="text-sm font-semibold">{event.message}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[.1em] text-ink-muted">
                    {event.createdAt
                      ? new Date(event.createdAt).toLocaleString()
                      : "Recently"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function IcpView() {
  const list = api.icps.list.useQuery(undefined, { retry: false });
  const save = api.icps.save.useMutation();
  const [editing, setEditing] = useState<Pick<
    IcpRow,
    "id" | "criteria"
  > | null>(null);
  const [draft, setDraft] = useState<IcpCriteria>(starter);
  const [toast, setToast] = useState<string | null>(null);
  const openNew = () => {
    setEditing({ id: 0, criteria: starter });
    setDraft(starter);
  };
  const openEdit = (icp: IcpRow) => {
    setEditing(icp);
    setDraft(icp.criteria);
  };
  const update = (key: keyof IcpCriteria, value: string | number) =>
    setDraft(prev => ({ ...prev, [key]: value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await save.mutateAsync({
        ...(editing?.id ? { id: editing.id } : {}),
        criteria: draft,
      });
      setEditing(null);
      setToast("Profile saved.");
      await list.refetch();
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "Couldn't save profile."
      );
    }
  };
  return (
    <>
      <SectionHeader
        eyebrow="Profiles / ideal customer"
        title="Make the fit legible."
        description="Profiles are working hypotheses — a shared starting point for sourcing and research, not a claim about your market."
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            New profile
          </Button>
        }
      />
      {list.isLoading ? (
        <div className="border border-line bg-white p-8 text-sm text-ink-muted">
          Loading profiles…
        </div>
      ) : list.error ? (
        <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {list.error.message || "Profiles are unavailable."}
        </div>
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Target}
          title="Start with a useful hypothesis"
          description="Describe who gets value from Proof, the signals that support the fit, and the exclusions that keep research honest."
          action={<Button onClick={openNew}>Create your first profile</Button>}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.data?.map(icp => (
            <article key={icp.id} className="border border-line bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <StatusChip tone="warn">Working hypothesis</StatusChip>
                  <h2 className="mt-4 font-display text-2xl tracking-[-.04em]">
                    {icp.criteria.name}
                  </h2>
                </div>
                <button
                  className="text-xs font-semibold text-terracotta underline"
                  onClick={() => openEdit(icp)}
                >
                  Edit
                </button>
              </div>
              <dl className="mt-7 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[.12em] text-ink-muted">
                    Target
                  </dt>
                  <dd className="mt-1 leading-5">{icp.criteria.industries}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[.12em] text-ink-muted">
                    Roles
                  </dt>
                  <dd className="mt-1 leading-5">{icp.criteria.roles}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[.12em] text-ink-muted">
                    Signals
                  </dt>
                  <dd className="mt-1 leading-5">{icp.criteria.signals}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[9px] uppercase tracking-[.12em] text-ink-muted">
                    Minimum fit
                  </dt>
                  <dd className="mt-1 font-mono text-terracotta">
                    {icp.criteria.minScore}%
                  </dd>
                </div>
              </dl>
              <div className="mt-6 border-t border-line pt-4 text-xs leading-5 text-ink-muted">
                <span className="font-semibold text-ink">Exclude:</span>{" "}
                {icp.criteria.exclusions || "Nothing noted yet."}
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <DrawerDialog
          title={editing.id ? "Edit profile" : "New ideal customer profile"}
          description="Keep this specific enough to guide research, flexible enough to learn."
          onClose={() => setEditing(null)}
        >
          <form onSubmit={submit} className="space-y-5">
            <TextInput
              label="Profile name"
              required
              value={draft.name}
              onChange={e => update("name", e.target.value)}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextInput
                label="Industries"
                value={draft.industries}
                onChange={e => update("industries", e.target.value)}
              />
              <TextInput
                label="Geography"
                value={draft.geography}
                onChange={e => update("geography", e.target.value)}
              />
              <TextInput
                label="Company size"
                value={draft.companySize}
                onChange={e => update("companySize", e.target.value)}
              />
              <TextInput
                label="Decision-maker roles"
                value={draft.roles}
                onChange={e => update("roles", e.target.value)}
              />
            </div>
            <TextArea
              label="Keywords"
              hint="Comma-separated terms that make the profile findable."
              value={draft.keywords}
              onChange={e => update("keywords", e.target.value)}
            />
            <TextArea
              label="Buying signals"
              value={draft.signals}
              onChange={e => update("signals", e.target.value)}
            />
            <TextArea
              label="Exclusions"
              value={draft.exclusions}
              onChange={e => update("exclusions", e.target.value)}
            />
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold">
                Minimum match threshold{" "}
                <span className="font-mono text-terracotta">
                  {draft.minScore}%
                </span>
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={draft.minScore}
                onChange={e => update("minScore", Number(e.target.value))}
                className="w-full accent-[#bf5839]"
              />
            </label>
            <Button type="submit" disabled={save.isPending} className="w-full">
              <Save className="h-4 w-4" />
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
          </form>
        </DrawerDialog>
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
