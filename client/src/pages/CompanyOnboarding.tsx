import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Globe2,
  History,
  Save,
  Sparkles,
} from "lucide-react";
import type { Brand, IcpCriteria } from "@shared/domain";
import type { AnalysisEvidence, CompanyAnalysis } from "@shared/analysis";
import type { RouterOutputs, Workspace } from "@/components/leadloom-types";
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

type AnalysisDraft = RouterOutputs["analysis"]["history"][number];
type CompanyDraft = AnalysisDraft & {
  kind: "company";
  result: CompanyAnalysis;
  evidence: AnalysisEvidence;
};

const emptyEvidence: AnalysisEvidence = {
  sources: [],
  copyExamples: [],
  logos: [],
  styleClues: [],
  links: [],
};

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function dateLabel(value: Date | string | number | null | undefined): string {
  if (!value) return "Unknown date";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

function cloneIcp(criteria: IcpCriteria): IcpCriteria {
  return { ...criteria };
}

function cloneBrand(brand: Brand): Brand {
  return {
    ...brand,
    inspiration: brand.inspiration.map(reference => ({ ...reference })),
  };
}

function companyDraftFromRow(row: AnalysisDraft): CompanyDraft | null {
  if (row.kind !== "company") return null;
  return {
    ...row,
    kind: "company",
    result: row.result as CompanyAnalysis,
    evidence: row.evidence as AnalysisEvidence,
  };
}

export function CompanyOnboarding({ workspace }: { workspace: Workspace }) {
  const canManage = workspace.role === "owner";
  const history = api.analysis.history.useQuery(undefined, { retry: false });
  const analyze = api.analysis.company.useMutation();
  const apply = api.analysis.applyCompany.useMutation();
  const utils = api.useUtils();
  const [website, setWebsite] = useState(workspace.company.website);
  const [draft, setDraft] = useState<CompanyDraft | null>(null);
  const [companyName, setCompanyName] = useState(workspace.company.name);
  const [brand, setBrand] = useState<Brand>(() =>
    cloneBrand(workspace.company.brand)
  );
  const [icps, setIcps] = useState<IcpCriteria[]>([]);
  const [selectedIcp, setSelectedIcp] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const companyHistory = useMemo(
    () =>
      (history.data ?? [])
        .map(companyDraftFromRow)
        .filter((item): item is CompanyDraft => Boolean(item)),
    [history.data]
  );

  const loadDraft = (next: CompanyDraft) => {
    setDraft(next);
    setWebsite(next.result.website);
    setCompanyName(next.result.companyName);
    setBrand(cloneBrand(next.result.brand));
    setIcps(next.result.icps.map(cloneIcp));
    setSelectedIcp(next.result.icps.map(() => true));
    setError(null);
  };

  useEffect(() => {
    const latest = companyHistory[0];
    if (!draft && latest) loadDraft(latest);
  }, [companyHistory, draft]);

  const analyzeWebsite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!canManage) {
      setError(
        "Only the company owner can analyze or apply onboarding changes."
      );
      return;
    }
    if (!isHttpsUrl(website.trim())) {
      setError("Enter a public HTTPS website without credentials.");
      return;
    }
    try {
      const row = await analyze.mutateAsync({ url: website.trim() });
      const next = companyDraftFromRow(row as AnalysisDraft);
      if (!next)
        throw new Error("The analysis response was not a company draft.");
      loadDraft(next);
      await history.refetch();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Website analysis failed."
      );
    }
  };

  const applyReviewed = async () => {
    if (!draft) return;
    setError(null);
    if (!canManage) {
      setError("Only the company owner can apply onboarding changes.");
      return;
    }
    if (!isHttpsUrl(website.trim())) {
      setError(
        "Use a public HTTPS website before applying the reviewed profile."
      );
      return;
    }
    try {
      await apply.mutateAsync({
        id: draft.id,
        companyName: companyName.trim(),
        website: website.trim(),
        brand,
        icps: icps.filter((_, index) => selectedIcp[index]),
      });
      await Promise.all([
        utils.workspace.get.invalidate(),
        utils.icps.list.invalidate(),
        history.refetch(),
      ]);
      setDraft(previous =>
        previous ? { ...previous, appliedAt: new Date() } : previous
      );
      setToast("Reviewed company profile applied.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The reviewed profile could not be applied."
      );
    }
  };

  const setBrandField = <K extends keyof Brand>(key: K, value: Brand[K]) => {
    setBrand(previous => ({ ...previous, [key]: value }));
  };
  const updateIcp = <K extends keyof IcpCriteria>(
    index: number,
    key: K,
    value: IcpCriteria[K]
  ) => {
    setIcps(previous =>
      previous.map((criteria, item) =>
        item === index ? { ...criteria, [key]: value } : criteria
      )
    );
  };
  const candidateLogos =
    draft?.evidence.logos.filter(candidate => isHttpsUrl(candidate.url)) ?? [];
  const sources = draft?.evidence.sources ?? emptyEvidence.sources;
  const copyExamples =
    draft?.evidence.copyExamples ?? emptyEvidence.copyExamples;

  return (
    <>
      <SectionHeader
        eyebrow="Onboarding / company intelligence"
        title="Start with what the site actually says."
        description="Analyze a public company website, then review every suggested brand field and ICP hypothesis before anything is saved. Website copy is evidence; suggestions remain yours to edit."
        action={
          <StatusChip
            tone={workspace.company.onboardingCompletedAt ? "good" : "warn"}
          >
            {workspace.company.onboardingCompletedAt
              ? "Profile reviewed"
              : "Review before saving"}
          </StatusChip>
        }
      />

      <div className="grid gap-8 xl:grid-cols-[.75fr_1.25fr]">
        <div className="space-y-5">
          <section className="border border-line bg-white p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <MonoLabel>01 / analyze</MonoLabel>
                <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
                  Website first, not a blank form.
                </h2>
              </div>
              <Globe2 className="h-5 w-5 text-terracotta" />
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              We collect real page text, visible links, observed logos and CSS
              clues. We do not claim to have seen a visual screenshot or verify
              inferred claims automatically.
            </p>
            <form onSubmit={analyzeWebsite} className="mt-6 space-y-4">
              <TextInput
                label="Company website"
                type="url"
                required
                value={website}
                onChange={event => setWebsite(event.target.value)}
                placeholder="https://example.com"
                hint="GitHub links are for lead intake; use the company site here."
                disabled={!canManage}
              />
              <Button
                type="submit"
                disabled={!canManage || analyze.isPending}
                className="w-full"
              >
                <Sparkles className="h-4 w-4" />
                {analyze.isPending
                  ? "Analyzing pages…"
                  : draft
                    ? "Reanalyze website"
                    : "Analyze website"}
              </Button>
              {!canManage && (
                <p className="text-xs leading-5 text-ink-muted">
                  You can review durable drafts, but only the company owner can
                  start a new analysis or apply changes.
                </p>
              )}
            </form>
            {error && (
              <div
                role="alert"
                className="mt-4 border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800"
              >
                {error}
              </div>
            )}
          </section>

          <section className="border border-line bg-white p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <MonoLabel>Analysis history / durable drafts</MonoLabel>
                <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
                  Reopen a previous pass.
                </h2>
              </div>
              <History className="h-5 w-5 text-terracotta" />
            </div>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              The last ten analysis drafts remain available for review. Applying
              is explicit; reanalysis never changes the saved company by itself.
            </p>
            <div className="mt-5 divide-y divide-line border-y border-line">
              {history.isLoading && (
                <p className="py-4 text-xs text-ink-muted">
                  Loading analysis history…
                </p>
              )}
              {!history.isLoading && companyHistory.length === 0 && (
                <p className="py-4 text-xs text-ink-muted">
                  No company analysis yet.
                </p>
              )}
              {companyHistory.map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => loadDraft(item)}
                  className={`flex w-full items-center gap-3 py-4 text-left ${draft?.id === item.id ? "text-terracotta" : "hover:text-terracotta"}`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${item.appliedAt ? "bg-sage" : "bg-terracotta"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {item.result.companyName}
                    </span>
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-[.08em] text-ink-muted">
                      {dateLabel(item.createdAt)} ·{" "}
                      {item.appliedAt ? "applied" : "draft"}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          {!draft ? (
            <div className="border border-dashed border-line bg-white px-6 py-16 text-center">
              <Sparkles className="mx-auto mb-4 h-6 w-6 text-terracotta" />
              <h2 className="font-display text-2xl tracking-[-.04em]">
                Your review canvas is ready.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-muted">
                Analyze the website to see actual copy examples, source pages,
                observed logos and editable suggestions.
              </p>
            </div>
          ) : (
            <>
              <section className="border border-line bg-white p-6 sm:p-7">
                <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <MonoLabel>02 / review company profile</MonoLabel>
                    <p className="mt-4 text-sm leading-6 text-ink-muted">
                      {draft.result.summary}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-ink-muted">
                      {draft.result.styleNotes}
                    </p>
                    {draft.result.unknowns.length > 0 && (
                      <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                        <strong>Unknowns / review before use</strong>
                        <ul className="mt-2 list-disc space-y-1 pl-4">
                          {draft.result.unknowns.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <h2 className="mt-3 font-display text-3xl tracking-[-.05em]">
                      Edit before applying.
                    </h2>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[.1em] text-ink-muted">
                    Draft #{draft.id}
                  </span>
                </div>
                <div className="mt-6 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextInput
                      label="Company name"
                      required
                      value={companyName}
                      onChange={event => setCompanyName(event.target.value)}
                    />
                    <TextInput
                      label="Website"
                      type="url"
                      required
                      value={website}
                      onChange={event => setWebsite(event.target.value)}
                    />
                  </div>
                  <TextArea
                    label="Offer"
                    required
                    value={brand.offer}
                    onChange={event =>
                      setBrandField("offer", event.target.value)
                    }
                    hint="Suggested from supplied pages. Keep only what you can stand behind."
                  />
                  <TextArea
                    label="Voice"
                    value={brand.voice}
                    onChange={event =>
                      setBrandField("voice", event.target.value)
                    }
                  />
                  <TextArea
                    label="Website instructions & visual direction"
                    value={brand.websiteInstructions}
                    onChange={event =>
                      setBrandField("websiteInstructions", event.target.value)
                    }
                    hint="Edit typography, layout, imagery and page-writing guidance here; these preferences also remain editable in Settings."
                  />
                  <TextArea
                    label="Outreach instructions"
                    value={brand.outreachInstructions}
                    onChange={event =>
                      setBrandField("outreachInstructions", event.target.value)
                    }
                  />
                  <TextArea
                    label="Approved claims and limitations"
                    value={brand.approvedClaims}
                    onChange={event =>
                      setBrandField("approvedClaims", event.target.value)
                    }
                    hint="Owner-reviewed copy guidance only. Inferred claims are not verified automatically."
                  />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextInput
                      label="Booking or contact URL"
                      type="url"
                      value={brand.bookingUrl}
                      onChange={event =>
                        setBrandField("bookingUrl", event.target.value)
                      }
                    />
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-ink">
                        Logo candidate
                      </span>
                      <select
                        value={brand.logoUrl}
                        onChange={event =>
                          setBrandField("logoUrl", event.target.value)
                        }
                        className="w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-terracotta"
                      >
                        <option value="">No logo selected</option>
                        {brand.logoUrl &&
                          !candidateLogos.some(
                            candidate => candidate.url === brand.logoUrl
                          ) && (
                            <option value={brand.logoUrl}>Custom logo</option>
                          )}
                        {candidateLogos.map(candidate => (
                          <option value={candidate.url} key={candidate.url}>
                            {candidate.label || candidate.url}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-[11px] leading-4 text-ink-muted">
                        Only observed HTTPS candidates are listed.
                      </span>
                    </label>
                  </div>
                  <TextInput
                    label="Logo URL — custom override"
                    value={brand.logoUrl}
                    onChange={event =>
                      setBrandField("logoUrl", event.target.value)
                    }
                    placeholder="https://example.com/logo.svg"
                    hint="Replace a discovered logo with your own HTTPS URL or an existing uploaded /manus-storage/ asset. You can upload files later in Settings."
                  />
                  <div className="grid gap-5 sm:grid-cols-3">
                    <TextInput
                      label="Primary color"
                      type="color"
                      value={brand.primaryColor}
                      onChange={event =>
                        setBrandField("primaryColor", event.target.value)
                      }
                      className="h-11 p-1"
                    />
                    <TextInput
                      label="Paper / background"
                      type="color"
                      value={brand.backgroundColor}
                      onChange={event =>
                        setBrandField("backgroundColor", event.target.value)
                      }
                      className="h-11 p-1"
                    />
                    <TextInput
                      label="Accent color"
                      type="color"
                      value={brand.accentColor}
                      onChange={event =>
                        setBrandField("accentColor", event.target.value)
                      }
                      className="h-11 p-1"
                    />
                  </div>
                </div>
              </section>

              <section className="border border-line bg-white p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <MonoLabel>03 / ICP hypotheses</MonoLabel>
                    <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
                      Select only the profiles you reviewed.
                    </h2>
                  </div>
                  <Check className="h-5 w-5 text-terracotta" />
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  These are editable working hypotheses, not verified market
                  facts. Uncheck anything you do not want created as a profile.
                </p>
                <div className="mt-6 space-y-5">
                  {icps.map((criteria, index) => (
                    <div
                      className="border border-line bg-paper p-5"
                      key={`${draft.id}-${index}`}
                    >
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedIcp[index])}
                          onChange={event =>
                            setSelectedIcp(previous =>
                              previous.map((checked, item) =>
                                item === index ? event.target.checked : checked
                              )
                            )
                          }
                          className="mt-1 accent-[#bf5839]"
                        />
                        <span>
                          <span className="block text-xs font-semibold">
                            Review and apply this hypothesis
                          </span>
                          <span className="mt-1 block text-[11px] text-ink-muted">
                            Profile {index + 1} · working hypothesis
                          </span>
                        </span>
                      </label>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <TextInput
                          label="Profile name"
                          value={criteria.name}
                          onChange={event =>
                            updateIcp(index, "name", event.target.value)
                          }
                        />
                        <TextInput
                          label="Geography"
                          value={criteria.geography}
                          onChange={event =>
                            updateIcp(index, "geography", event.target.value)
                          }
                        />
                        <TextInput
                          label="Industries"
                          value={criteria.industries}
                          onChange={event =>
                            updateIcp(index, "industries", event.target.value)
                          }
                        />
                        <TextInput
                          label="Company size"
                          value={criteria.companySize}
                          onChange={event =>
                            updateIcp(index, "companySize", event.target.value)
                          }
                        />
                        <TextInput
                          label="Decision-maker roles"
                          value={criteria.roles}
                          onChange={event =>
                            updateIcp(index, "roles", event.target.value)
                          }
                        />
                        <TextInput
                          label="Minimum score"
                          type="number"
                          min={0}
                          max={100}
                          value={criteria.minScore}
                          onChange={event =>
                            updateIcp(
                              index,
                              "minScore",
                              Number(event.target.value)
                            )
                          }
                        />
                      </div>
                      <TextArea
                        className="mt-4"
                        label="Keywords"
                        value={criteria.keywords}
                        onChange={event =>
                          updateIcp(index, "keywords", event.target.value)
                        }
                      />
                      <TextArea
                        className="mt-4"
                        label="Buying signals"
                        value={criteria.signals}
                        onChange={event =>
                          updateIcp(index, "signals", event.target.value)
                        }
                      />
                      <TextArea
                        className="mt-4"
                        label="Exclusions"
                        value={criteria.exclusions}
                        onChange={event =>
                          updateIcp(index, "exclusions", event.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => void applyReviewed()}
                  disabled={
                    !canManage || apply.isPending || Boolean(draft.appliedAt)
                  }
                  className="mt-6 w-full sm:w-auto"
                >
                  <Save className="h-4 w-4" />
                  {draft.appliedAt
                    ? "Profile applied — edit later in Settings"
                    : apply.isPending
                      ? "Applying reviewed profile…"
                      : "Apply reviewed company profile"}
                </Button>
                {apply.isPending && (
                  <p className="mt-3 text-xs text-ink-muted">
                    Saving the selected brand fields and only the checked ICP
                    hypotheses.
                  </p>
                )}
              </section>

              <EvidencePanel
                evidence={draft.evidence}
                copyExamples={copyExamples}
                sources={sources}
                selectedLogo={brand.logoUrl}
              />
            </>
          )}
        </div>
      </div>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

function EvidencePanel({
  evidence,
  copyExamples,
  sources,
  selectedLogo,
}: {
  evidence: AnalysisEvidence;
  copyExamples: AnalysisEvidence["copyExamples"];
  sources: AnalysisEvidence["sources"];
  selectedLogo: string;
}) {
  return (
    <section className="border border-line bg-white p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <MonoLabel>Evidence / supplied pages</MonoLabel>
          <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
            Keep the sources next to the suggestion.
          </h2>
        </div>
        <ExternalLink className="h-5 w-5 text-terracotta" />
      </div>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        Quotes are real snippets returned from the supplied website. Style notes
        describe observed CSS clues, not a screenshot-based visual audit.
      </p>
      {selectedLogo && isHttpsUrl(selectedLogo) && (
        <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
          <img
            src={selectedLogo}
            alt="Selected observed logo"
            className="h-10 w-10 rounded-sm border border-line object-contain p-1"
          />
          <span className="text-xs text-ink-muted">
            Selected observed logo candidate
          </span>
        </div>
      )}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div>
          <MonoLabel>Real copy snippets</MonoLabel>
          <div className="mt-3 space-y-3">
            {copyExamples.length === 0 && (
              <p className="text-xs text-ink-muted">
                No copy snippets returned.
              </p>
            )}
            {copyExamples.map((example, index) => (
              <blockquote
                key={`${example.sourceUrl}-${index}`}
                className="border-l-2 border-terracotta/40 pl-3 text-sm leading-6"
              >
                <p>“{example.text}”</p>
                <a
                  href={example.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-terracotta underline"
                >
                  {example.kind} · source <ExternalLink className="h-3 w-3" />
                </a>
              </blockquote>
            ))}
          </div>
        </div>
        <div>
          <MonoLabel>Observed style clues</MonoLabel>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-ink-muted">
            {evidence.styleClues.length === 0 && (
              <li>No style clues returned.</li>
            )}
            {evidence.styleClues.map(clue => (
              <li
                key={clue}
                className="border-b border-line pb-2 last:border-0"
              >
                {clue}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-6 border-t border-line pt-5">
        <MonoLabel>Source pages</MonoLabel>
        <div className="mt-3 space-y-3">
          {sources.length === 0 && (
            <p className="text-xs text-ink-muted">No source pages returned.</p>
          )}
          {sources.map(source => (
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer"
              key={source.url}
              className="block border border-line bg-paper p-3 hover:border-terracotta"
            >
              <span className="flex items-center gap-2 text-xs font-semibold">
                <ExternalLink className="h-3.5 w-3.5 text-terracotta" />
                {source.url}
              </span>
              <span className="mt-2 block line-clamp-3 text-xs leading-5 text-ink-muted">
                {source.text}
              </span>
            </a>
          ))}
        </div>
      </div>
      {evidence.links.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {evidence.links.slice(0, 12).map(link =>
            isHttpsUrl(link) ? (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                key={link}
                className="inline-flex items-center gap-1 border border-line px-2 py-1 text-[10px] text-terracotta hover:border-terracotta"
              >
                {new URL(link).pathname || "/"}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null
          )}
        </div>
      )}
    </section>
  );
}
