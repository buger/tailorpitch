import { useOperation } from "@/components/operations/OperationProvider";
import { useState } from "react";
import { ExternalLink, FlaskConical, Search } from "lucide-react";
import type { AnalysisEvidence, LeadAnalysis } from "@shared/analysis";
import type { RouterOutputs } from "@/components/leadloom-types";
import { api } from "@/components/leadloom-types";
import { LeadEditor, type LeadEditorValues } from "@/components/LeadEditor";
import {
  Button,
  DrawerDialog,
  MonoLabel,
  StatusChip,
  TextInput,
} from "@/components/LeadloomUI";

type AnalysisDraft = RouterOutputs["analysis"]["history"][number];
type LeadDraft = AnalysisDraft & {
  kind: "lead";
  result: LeadAnalysis;
  evidence: AnalysisEvidence;
};

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function leadDraftFromRow(row: AnalysisDraft): LeadDraft | null {
  if (row.kind !== "lead") return null;
  return {
    ...row,
    kind: "lead",
    result: row.result as LeadAnalysis,
    evidence: row.evidence as AnalysisEvidence,
  };
}

export function LeadLinkIntake({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (message?: string) => Promise<void>;
}) {
  const operation = useOperation();
  const icps = api.icps.list.useQuery(undefined, { retry: false });
  const analyze = api.analysis.lead.useMutation();
  const apply = api.analysis.applyLead.useMutation();
  const [url, setUrl] = useState("");
  const [icpId, setIcpId] = useState<number | null>(null);
  const [draft, setDraft] = useState<LeadDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const analyzeLink = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (analyze.isPending || operation.busy) return;
    setError(null);
    if (!isHttpsUrl(url.trim())) {
      setError(
        "Enter a public HTTPS website or GitHub URL without credentials."
      );
      return;
    }
    try {
      const row = await operation.run(
        "lead_analysis",
        url.trim(),
        operationId =>
          analyze.mutateAsync({ url: url.trim(), icpId, operationId })
      );
      const next = leadDraftFromRow(row as AnalysisDraft);
      if (!next) throw new Error("The analysis response was not a lead draft.");
      setDraft(next);
      setUrl(next.url);
      setResultMessage(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Lead link analysis failed."
      );
    }
  };

  const saveReviewed = async (values: LeadEditorValues) => {
    if (!draft) return;
    setError(null);
    try {
      const result = await apply.mutateAsync({ id: draft.id, lead: values });
      setResultMessage(
        result.existing
          ? "This website already exists as a lead; no duplicate was created."
          : result.researchSaved
            ? "Reviewed lead saved with research and source context."
            : "Reviewed lead saved. Research was invalidated by an edit and can be run again."
      );
      await onSaved(
        result.existing
          ? "Existing lead kept; no duplicate created."
          : "Reviewed lead saved."
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The reviewed lead could not be saved."
      );
    }
  };

  const research = draft?.result.research;
  const sources = draft?.evidence.sources ?? [];
  const evidenceUrls = Array.from(
    new Set([
      ...(draft?.evidence.links ?? []),
      ...sources.map(source => source.url),
      ...(research?.facts ?? []).map(fact => fact.sourceUrl),
    ])
  );
  const initialValues: LeadEditorValues | null = draft
    ? {
        companyName: draft.result.lead.companyName,
        website: draft.result.lead.website,
        contactName: draft.result.lead.contactName,
        email: draft.result.lead.email,
        title: draft.result.lead.title,
        linkedinUrl: draft.result.lead.linkedinUrl,
        xUrl: draft.result.lead.xUrl,
        icpId: draft.result.lead.icpId,
        notes: draft.result.lead.notes,
      }
    : null;

  return (
    <DrawerDialog
      title="Analyze a public lead link"
      description="Paste a company website or GitHub repository. Review the proposed lead fields and research before saving; no contact details are invented."
      onClose={() => {
        if (!analyze.isPending && !apply.isPending) onClose();
        else
          setError(
            "This request is still running. Keep this tab open; you can close the intake after it finishes."
          );
      }}
    >
      <div className="space-y-6">
        <form onSubmit={analyzeLink} className="space-y-4">
          <TextInput
            label="Website or GitHub URL"
            type="url"
            disabled={analyze.isPending || apply.isPending}
            required
            value={url}
            onChange={event => setUrl(event.target.value)}
            placeholder="https://github.com/org/repository"
            hint="Website and GitHub links are analyzed for public evidence only. Manual intake remains available while sourcing is paused."
          />
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink">
              ICP profile for research
            </span>
            <select
              value={icpId ?? ""}
              disabled={analyze.isPending || apply.isPending}
              onChange={event =>
                setIcpId(event.target.value ? Number(event.target.value) : null)
              }
              className="w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-terracotta"
            >
              <option value="">Unassigned</option>
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
          </label>
          <Button
            type="submit"
            disabled={
              analyze.isPending ||
              operation.busy ||
              apply.isPending ||
              url.trim().length < 8
            }
            className="w-full"
          >
            <Search className="h-4 w-4" />
            {analyze.isPending
              ? "Researching public pages…"
              : draft
                ? "Reanalyze link"
                : "Analyze link"}
          </Button>
        </form>
        {error && (
          <div
            role="alert"
            className="border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800"
          >
            {error}
          </div>
        )}

        {draft && initialValues && research && (
          <>
            <section className="border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <MonoLabel>Research / review context</MonoLabel>
                  <h3 className="mt-2 font-display text-xl tracking-[-.04em]">
                    A reason, with sources.
                  </h3>
                </div>
                <FlaskConical className="h-5 w-5 text-terracotta" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusChip tone={research.score >= 70 ? "good" : "warn"}>
                  {research.score}/100 fit
                </StatusChip>
                {research.criteria.map((criterion, index) => (
                  <StatusChip
                    key={`${criterion.key}-${index}`}
                    tone={
                      criterion.status === "matched"
                        ? "good"
                        : criterion.status === "not_matched"
                          ? "bad"
                          : "neutral"
                    }
                  >
                    {criterion.key}: {criterion.status.replaceAll("_", " ")}
                  </StatusChip>
                ))}
              </div>
              <p className="mt-4 text-sm leading-6">{research.summary}</p>
              {research.relevance && (
                <p className="mt-3 text-xs leading-5 text-ink-muted">
                  <strong className="text-ink">Relevance:</strong>{" "}
                  {research.relevance}
                </p>
              )}
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <MonoLabel>Facts</MonoLabel>
                  <ul className="mt-2 space-y-2 text-xs leading-5">
                    {research.facts.map((fact, index) => (
                      <li key={`${fact.sourceUrl}-${index}`}>
                        <span>{fact.claim}</span>
                        <a
                          href={fact.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 flex items-center gap-1 text-terracotta underline"
                        >
                          Source <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <MonoLabel>Pains and hypotheses</MonoLabel>
                  <ul className="mt-2 space-y-2 text-xs leading-5 text-ink-muted">
                    {[...research.pains, ...research.hypotheses].map(
                      (item, index) => (
                        <li key={`${item}-${index}`}>• {item}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            </section>
            <section className="border border-line bg-white p-5">
              <MonoLabel>Evidence / source context</MonoLabel>
              <p className="mt-2 text-xs leading-5 text-ink-muted">
                These source URLs are saved with the reviewed lead. They explain
                where the intake came from; they do not turn discovery into
                verified fit.
              </p>
              <div className="mt-4 space-y-2">
                {evidenceUrls.length === 0 && (
                  <p className="text-xs text-ink-muted">
                    No additional source URLs returned.
                  </p>
                )}
                {evidenceUrls.map(source =>
                  isHttpsUrl(source) ? (
                    <a
                      href={source}
                      target="_blank"
                      rel="noreferrer"
                      key={source}
                      className="flex items-center gap-2 border border-line bg-paper px-3 py-2 text-xs text-terracotta hover:border-terracotta"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {source}
                    </a>
                  ) : null
                )}
              </div>
              {sources.map(source => (
                <blockquote
                  key={`quote-${source.url}`}
                  className="mt-4 border-l-2 border-terracotta/40 pl-3 text-xs leading-5 text-ink-muted"
                >
                  “{source.text.slice(0, 420)}”
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 flex items-center gap-1 text-terracotta underline"
                  >
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                </blockquote>
              ))}
            </section>
            <section className="border border-line bg-white p-5">
              <MonoLabel>Review lead fields</MonoLabel>
              <p className="mt-2 mb-5 text-xs leading-5 text-ink-muted">
                Edit any proposed field. Changing the website, ICP, or company
                name intentionally invalidates this analysis before save.
              </p>
              <LeadEditor
                key={draft.id}
                initialValues={initialValues}
                submitLabel={
                  apply.isPending
                    ? "Saving reviewed lead…"
                    : "Save reviewed lead"
                }
                pending={apply.isPending || analyze.isPending}
                error={apply.error?.message}
                onSubmit={saveReviewed}
                onCancel={onClose}
              />
            </section>
          </>
        )}
        {draft && !research && (
          <div className="border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Research did not return a saved result. Review the lead fields and
            run analysis again if needed.
          </div>
        )}
        {resultMessage && (
          <div
            role="status"
            className="border border-sage/30 bg-sage-soft p-4 text-sm leading-6 text-sage-ink"
          >
            {resultMessage}
          </div>
        )}
      </div>
    </DrawerDialog>
  );
}
