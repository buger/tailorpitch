import { useOperation } from "@/components/operations/OperationProvider";
import { useState } from "react";
import {
  ArrowRight,
  Copy,
  ExternalLink,
  FileText,
  Inbox as InboxIcon,
  Mail,
  Send,
  Share2,
} from "lucide-react";
import { Link, useSearch } from "wouter";
import type { Channel, PageContent } from "@shared/domain";
import type {
  InboxMessage,
  LeadRow,
  OutreachDraft,
  PageRow,
  Workspace,
} from "@/components/leadloom-types";
import { api } from "@/components/leadloom-types";
import { BrandSnapshot, PagePreview } from "@/components/PagePreview";
import {
  Button,
  DrawerDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  MonoLabel,
  SectionHeader,
  StatusChip,
  TextArea,
  TextInput,
  Toast,
} from "@/components/LeadloomUI";

type ToastState = { message: string; kind: "success" | "error" };

type PageEditorProps = {
  page: PageRow;
  brand: Workspace["company"]["brand"];
  saving: boolean;
  onClose: () => void;
  onSave: (content: PageContent, title: string) => Promise<void>;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function leadIdFromSearch(search: string) {
  const raw = new URLSearchParams(search).get("lead");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function publishedLink(page: PageRow) {
  const path = `/p/${page.shareToken}`;
  return typeof window === "undefined"
    ? path
    : `${window.location.origin}${path}`;
}

async function copyText(value: string) {
  if (!navigator.clipboard)
    throw new Error("Clipboard access is not available in this browser.");
  await navigator.clipboard.writeText(value);
}

export function PagesView({ workspace }: { workspace: Workspace }) {
  const operation = useOperation();
  const search = useSearch();
  const selectedLeadId = leadIdFromSearch(search);
  const [selected, setSelected] = useState<PageRow | null>(null);
  const [editing, setEditing] = useState<PageRow | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [copyingPageId, setCopyingPageId] = useState<number | null>(null);
  const pages = api.pages.list.useQuery(undefined, { retry: false });
  const leads = api.leads.list.useQuery(undefined, { retry: false });
  const selectedPage = api.pages.get.useQuery(
    { id: selected?.id ?? 0 },
    { enabled: Boolean(selected), retry: false }
  );
  const generate = api.pages.generate.useMutation();
  const save = api.pages.save.useMutation();
  const publish = api.pages.setPublished.useMutation();
  const utils = api.useUtils();

  const showToast = (message: string, kind: ToastState["kind"] = "success") => {
    setToast({ message, kind });
  };

  const generatePage = async (leadId: number) => {
    if (generate.isPending || operation.busy) return;
    try {
      const result = await operation.run(
        "page_generation",
        leads.data?.find(lead => lead.id === leadId)?.companyName ??
          `Lead #${leadId}`,
        operationId => generate.mutateAsync({ leadId, operationId })
      );
      const generated = await utils.pages.get.fetch({ id: result.id });
      const generatedRow: PageRow = {
        ...generated.page,
        companyName: generated.lead.companyName,
      };
      const refreshed = await pages.refetch();
      const pageRow =
        refreshed.data?.find(page => page.id === result.id) ?? generatedRow;
      setEditing(pageRow);
      showToast("Draft page generated. Review before publishing.");
    } catch (error) {
      showToast(
        errorMessage(error, "Page generation requires saved research."),
        "error"
      );
    }
  };

  const savePage = async (content: PageContent, title: string) => {
    if (!editing || save.isPending) return;
    try {
      await save.mutateAsync({ id: editing.id, content, title });
      setEditing(null);
      await pages.refetch();
      showToast("Page draft saved.");
    } catch (error) {
      showToast(
        errorMessage(
          error,
          "Page could not be saved. Unpublish it before editing."
        ),
        "error"
      );
      throw error;
    }
  };

  const togglePublish = async (page: PageRow) => {
    if (publish.isPending) return;
    const shouldPublish = page.status === "draft";
    const prompt = shouldPublish
      ? "Publish this page? It will become publicly visible at its share URL."
      : "Unpublish this page? The public URL will stop resolving.";
    if (!window.confirm(prompt)) return;
    try {
      await publish.mutateAsync({ id: page.id, published: shouldPublish });
      await pages.refetch();
      showToast(shouldPublish ? "Page published." : "Page unpublished.");
    } catch (error) {
      showToast(errorMessage(error, "Publishing failed."), "error");
    }
  };

  const copyPublishedLink = async (page: PageRow) => {
    if (copyingPageId !== null) return;
    setCopyingPageId(page.id);
    try {
      await copyText(publishedLink(page));
      showToast("Published link copied.");
    } catch (error) {
      showToast(
        errorMessage(error, "Could not copy the published link."),
        "error"
      );
    } finally {
      setCopyingPageId(null);
    }
  };

  const visiblePages = selectedLeadId
    ? (pages.data?.filter(page => page.leadId === selectedLeadId) ?? [])
    : (pages.data ?? []);

  return (
    <>
      <SectionHeader
        eyebrow="Pages / personalized proposals"
        title="A page worth sharing."
        description="Generated pages stay private until someone explicitly publishes them. Each preview uses the saved company brand snapshot."
      />
      {selectedLeadId && (
        <div className="mb-5 flex items-center justify-between gap-3 border border-terracotta/25 bg-terracotta-pale/40 px-4 py-3 text-sm">
          <span>
            Showing pages and generation for{" "}
            <strong>lead #{selectedLeadId}</strong>.
          </span>
          <Link
            className="text-xs font-semibold text-terracotta underline"
            href="/app/pages"
          >
            Show all pages
          </Link>
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <div>
          {leads.isLoading ? (
            <LoadingState label="Loading researched leads" />
          ) : leads.error ? (
            <ErrorState
              message={leads.error.message || "Leads are unavailable."}
              onRetry={() => void leads.refetch()}
            />
          ) : (
            <LeadPageLaunchers
              leads={leads.data ?? []}
              selectedLeadId={selectedLeadId}
              onGenerate={generatePage}
              pending={generate.isPending || operation.busy}
            />
          )}
          {pages.isLoading && <LoadingState label="Loading page drafts" />}
          {pages.error && (
            <ErrorState
              message={pages.error.message || "Pages are unavailable."}
              onRetry={() => void pages.refetch()}
            />
          )}
          {!pages.isLoading && !pages.error && !visiblePages.length && (
            <EmptyState
              icon={FileText}
              title="No page drafts yet"
              description="Research a lead first. Then generate a considered proposal from the company offer, brand and supported research."
              action={
                <a href="/app/leads">
                  <Button>
                    Open leads <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              }
            />
          )}
          <div className="space-y-3">
            {visiblePages.map(page => {
              const isPublished = page.status === "published";
              return (
                <div
                  key={page.id}
                  className={`flex items-center justify-between gap-4 border bg-white p-5 ${
                    selectedLeadId === page.leadId
                      ? "border-terracotta/50 ring-1 ring-terracotta/20"
                      : "border-line"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip tone={isPublished ? "good" : "neutral"}>
                        {isPublished ? "Published" : "Draft"}
                      </StatusChip>
                      <BrandSnapshot
                        brand={page.brandSnapshot || workspace.company.brand}
                      />
                    </div>
                    <h2 className="mt-3 truncate font-display text-xl tracking-[-.03em]">
                      {page.title || page.content.headline}
                    </h2>
                    <p className="mt-1 truncate text-xs text-ink-muted">
                      {page.companyName || `Lead #${page.leadId}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    <Button
                      variant="ghost"
                      className="min-h-8 px-2 text-xs"
                      onClick={() => setSelected(page)}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="secondary"
                      className="min-h-8 px-2 text-xs"
                      onClick={() => setEditing(page)}
                      disabled={
                        isPublished || publish.isPending || save.isPending
                      }
                    >
                      Edit
                    </Button>
                    {isPublished && (
                      <>
                        <Button
                          variant="ghost"
                          className="min-h-8 px-2 text-xs"
                          onClick={() => void copyPublishedLink(page)}
                          disabled={copyingPageId === page.id}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copyingPageId === page.id ? "Copying…" : "Copy link"}
                        </Button>
                        <a
                          href={publishedLink(page)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-8 items-center gap-2 rounded-sm px-2 text-xs font-semibold text-ink-muted hover:bg-ink/[0.05] hover:text-ink"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Open
                        </a>
                      </>
                    )}
                    <Button
                      variant={isPublished ? "danger" : "primary"}
                      className="min-h-8 px-2 text-xs"
                      onClick={() => void togglePublish(page)}
                      disabled={publish.isPending}
                    >
                      {isPublished ? "Unpublish" : "Publish"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <aside className="border border-line bg-ink p-6 text-paper">
          <MonoLabel className="text-paper/50">Publishing discipline</MonoLabel>
          <h2 className="mt-3 font-display text-2xl tracking-[-.04em]">
            Draft is a real state.
          </h2>
          <ul className="mt-6 space-y-4 text-sm leading-6 text-paper/70">
            <li>
              • A generated page is a proposal from your company, not an
              endorsement by the prospect.
            </li>
            <li>
              • Public share links contain an opaque token and never expose
              private research notes.
            </li>
            <li>
              • Publishing and unpublishing always require an explicit
              confirmation.
            </li>
          </ul>
        </aside>
      </div>
      {selected && (
        <DrawerDialog
          title={selected.title || selected.content.headline}
          description="Preview only — this page is not changed by viewing it."
          onClose={() => setSelected(null)}
        >
          {selectedPage.isLoading && (
            <LoadingState label="Loading page preview" />
          )}
          {selectedPage.error && (
            <ErrorState
              message={
                selectedPage.error.message ||
                "The page preview could not be loaded."
              }
              onRetry={() => void selectedPage.refetch()}
            />
          )}
          {selectedPage.data && (
            <PagePreview
              content={selectedPage.data.page.content}
              brand={
                selectedPage.data.page.brandSnapshot || workspace.company.brand
              }
              companyName={selectedPage.data.company.name}
              leadName={selectedPage.data.lead.contactName || undefined}
              preview
            />
          )}
        </DrawerDialog>
      )}
      {editing && (
        <PageEditor
          page={editing}
          brand={workspace.company.brand}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={savePage}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

function LeadPageLaunchers({
  leads,
  selectedLeadId,
  onGenerate,
  pending,
}: {
  leads: LeadRow[];
  selectedLeadId: number | null;
  onGenerate: (leadId: number) => Promise<void>;
  pending: boolean;
}) {
  const scopedLeads = selectedLeadId
    ? leads.filter(lead => lead.id === selectedLeadId)
    : leads;
  const researched = scopedLeads.filter(lead => lead.score != null);
  if (selectedLeadId && !scopedLeads.length) {
    return (
      <div className="mb-5 border border-dashed border-line bg-white p-5 text-sm text-ink-muted">
        Lead #{selectedLeadId} was not found in this workspace.
      </div>
    );
  }
  if (!researched.length) {
    return (
      <div className="mb-5 border border-dashed border-line bg-white p-5 text-sm text-ink-muted">
        Research a lead before generating a page. Only saved research can inform
        a public proposal.
      </div>
    );
  }
  return (
    <div className="mb-5 border border-line bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <MonoLabel>Generate / from saved research</MonoLabel>
          <p className="mt-2 text-sm text-ink-muted">
            Choose a researched company to make a private page draft.
          </p>
        </div>
        <FileText className="h-5 w-5 text-terracotta" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {researched.map(lead => (
          <Button
            key={lead.id}
            variant={selectedLeadId === lead.id ? "primary" : "secondary"}
            className="min-h-8 px-3 text-xs"
            onClick={() => void onGenerate(lead.id)}
            disabled={pending}
          >
            {lead.companyName}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ))}
      </div>
    </div>
  );
}

function PageEditor({ page, brand, saving, onClose, onSave }: PageEditorProps) {
  const [content, setContent] = useState<PageContent>(page.content);
  const [title, setTitle] = useState(page.title || page.content.headline);
  const [error, setError] = useState<string | null>(null);

  const updateContent = <K extends keyof PageContent>(
    key: K,
    value: PageContent[K]
  ) => {
    setContent(previous => ({ ...previous, [key]: value }));
  };

  const updateBenefit = (
    index: number,
    field: "title" | "body",
    value: string
  ) => {
    setContent(previous => ({
      ...previous,
      benefits: previous.benefits.map((benefit, benefitIndex) =>
        benefitIndex === index ? { ...benefit, [field]: value } : benefit
      ),
    }));
  };

  const updateStep = (
    index: number,
    field: "title" | "body",
    value: string
  ) => {
    setContent(previous => ({
      ...previous,
      steps: previous.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, [field]: value } : step
      ),
    }));
  };

  const updateLayout = (value: string) => {
    if (value === "editorial" || value === "minimal" || value === "bold") {
      updateContent("layout", value);
    }
  };

  const submit = async () => {
    if (saving) return;
    setError(null);
    try {
      await onSave(content, title);
    } catch (saveError) {
      setError(
        errorMessage(
          saveError,
          "The page could not be saved. Your edits are still here."
        )
      );
    }
  };

  return (
    <DrawerDialog
      title="Edit page draft"
      description="Edit every structured proposal field. Published pages must be unpublished before their content can change."
      onClose={onClose}
    >
      <div className="space-y-5">
        {error && (
          <div className="border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800">
            {error}
          </div>
        )}
        <TextInput
          label="Internal page title"
          value={title}
          onChange={event => setTitle(event.target.value)}
          disabled={saving}
        />
        <TextInput
          label="Eyebrow"
          value={content.eyebrow}
          onChange={event => updateContent("eyebrow", event.target.value)}
          disabled={saving}
        />
        <TextInput
          label="Hero headline"
          value={content.headline}
          onChange={event => updateContent("headline", event.target.value)}
          disabled={saving}
        />
        <TextArea
          label="Hero subheadline"
          value={content.subheadline}
          onChange={event => updateContent("subheadline", event.target.value)}
          disabled={saving}
        />
        <TextInput
          label="Context title"
          value={content.contextTitle}
          onChange={event => updateContent("contextTitle", event.target.value)}
          disabled={saving}
        />
        <TextArea
          label="Context body"
          value={content.contextBody}
          onChange={event => updateContent("contextBody", event.target.value)}
          disabled={saving}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {content.benefits.map((benefit, index) => (
            <div className="border border-line p-4" key={`benefit-${index}`}>
              <MonoLabel>Benefit {index + 1}</MonoLabel>
              <TextInput
                className="mt-3"
                label="Title"
                value={benefit.title}
                onChange={event =>
                  updateBenefit(index, "title", event.target.value)
                }
                disabled={saving}
              />
              <TextArea
                className="mt-3"
                label="Body"
                value={benefit.body}
                onChange={event =>
                  updateBenefit(index, "body", event.target.value)
                }
                disabled={saving}
              />
            </div>
          ))}
        </div>
        <TextInput
          label="Pilot title"
          value={content.pilotTitle}
          onChange={event => updateContent("pilotTitle", event.target.value)}
          disabled={saving}
        />
        <TextArea
          label="Pilot body"
          value={content.pilotBody}
          onChange={event => updateContent("pilotBody", event.target.value)}
          disabled={saving}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          {content.steps.map((step, index) => (
            <div className="border border-line p-4" key={`step-${index}`}>
              <MonoLabel>Step {index + 1}</MonoLabel>
              <TextInput
                className="mt-3"
                label="Title"
                value={step.title}
                onChange={event =>
                  updateStep(index, "title", event.target.value)
                }
                disabled={saving}
              />
              <TextArea
                className="mt-3"
                label="Body"
                value={step.body}
                onChange={event =>
                  updateStep(index, "body", event.target.value)
                }
                disabled={saving}
              />
            </div>
          ))}
        </div>
        <TextInput
          label="CTA text"
          value={content.ctaText}
          onChange={event => updateContent("ctaText", event.target.value)}
          disabled={saving}
        />
        <TextArea
          label="Closing"
          value={content.closing}
          onChange={event => updateContent("closing", event.target.value)}
          disabled={saving}
        />
        <TextArea
          label="Design notes"
          hint="Private generation and design guidance retained with this draft."
          value={content.designNotes}
          onChange={event => updateContent("designNotes", event.target.value)}
          disabled={saving}
        />
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink">
            Layout
          </span>
          <select
            className="w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/10"
            value={content.layout}
            onChange={event => updateLayout(event.target.value)}
            disabled={saving}
          >
            <option value="editorial">Editorial</option>
            <option value="minimal">Minimal</option>
            <option value="bold">Bold</option>
          </select>
        </label>
        <Button
          className="w-full"
          onClick={() => void submit()}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save page draft"}
        </Button>
        <div className="border-t border-line pt-4">
          <BrandSnapshot brand={page.brandSnapshot || brand} />
        </div>
      </div>
    </DrawerDialog>
  );
}

export function OutreachView() {
  const operation = useOperation();
  const search = useSearch();
  const selectedLeadId = leadIdFromSearch(search);
  const list = api.outreach.list.useQuery(undefined, { retry: false });
  const leads = api.leads.list.useQuery(undefined, { retry: false });
  const pages = api.pages.list.useQuery(undefined, { retry: false });
  const generate = api.outreach.generate.useMutation();
  const [review, setReview] = useState<OutreachDraft | null>(null);
  const [selectedPageIds, setSelectedPageIds] = useState<
    Record<number, number | null>
  >({});
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, kind: ToastState["kind"] = "success") => {
    setToast({ message, kind });
  };

  const refreshDraft = async (draftId: number) => {
    const refreshed = await list.refetch();
    const next = refreshed.data?.find(draft => draft.id === draftId);
    if (next) setReview(next);
  };

  const prepare = async (leadId: number, channel: Channel, pageId?: number) => {
    if (generate.isPending || operation.busy) return;
    try {
      const result = await operation.run(
        "outreach_generation",
        `${leads.data?.find(lead => lead.id === leadId)?.companyName ?? `Lead #${leadId}`} / ${channel}`,
        operationId =>
          generate.mutateAsync({ leadId, channel, pageId, operationId })
      );
      const refreshed = await list.refetch();
      const created = refreshed.data?.find(draft => draft.id === result.id);
      if (!created)
        throw new Error(
          "The new draft could not be loaded. Refresh the outreach list and try again."
        );
      setReview(created);
      showToast("Draft prepared. Review every field before action.");
    } catch (error) {
      showToast(errorMessage(error, "Draft generation failed."), "error");
    }
  };

  const scopedLeads = selectedLeadId
    ? (leads.data?.filter(lead => lead.id === selectedLeadId) ?? [])
    : (leads.data ?? []);
  const visibleDrafts = selectedLeadId
    ? (list.data?.filter(draft => draft.leadId === selectedLeadId) ?? [])
    : (list.data ?? []);

  return (
    <>
      <SectionHeader
        eyebrow="Outreach / considered messages"
        title="Prepare the conversation."
        description="Email review is exact and explicit. LinkedIn and X remain manual workflows until an authorized provider is connected."
        action={
          <StatusChip tone="warn">No outreach sent automatically</StatusChip>
        }
      />
      {selectedLeadId && (
        <div className="mb-5 flex items-center justify-between gap-3 border border-terracotta/25 bg-terracotta-pale/40 px-4 py-3 text-sm">
          <span>
            Showing outreach for <strong>lead #{selectedLeadId}</strong>.
          </span>
          <Link
            className="text-xs font-semibold text-terracotta underline"
            href="/app/outreach"
          >
            Show all outreach
          </Link>
        </div>
      )}
      <div className="grid gap-8 xl:grid-cols-[.8fr_1.2fr]">
        <div className="border border-line bg-white p-6">
          <MonoLabel>Start from a researched lead</MonoLabel>
          {leads.isLoading ? (
            <div className="mt-5">
              <LoadingState label="Loading leads" />
            </div>
          ) : leads.error ? (
            <div className="mt-5">
              <ErrorState
                message={leads.error.message || "Leads are unavailable."}
                onRetry={() => void leads.refetch()}
              />
            </div>
          ) : selectedLeadId && !scopedLeads.length ? (
            <p className="mt-5 text-sm leading-6 text-ink-muted">
              Lead #{selectedLeadId} was not found in this workspace.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {scopedLeads.length ? (
                scopedLeads.map(lead => {
                  const publishedPages = (pages.data ?? []).filter(
                    page =>
                      page.leadId === lead.id && page.status === "published"
                  );
                  return (
                    <LeadDraftRow
                      key={lead.id}
                      lead={lead}
                      selected={selectedLeadId === lead.id}
                      publishedPages={publishedPages}
                      selectedPageId={selectedPageIds[lead.id] ?? null}
                      onPageChange={pageId =>
                        setSelectedPageIds(previous => ({
                          ...previous,
                          [lead.id]: pageId,
                        }))
                      }
                      onPrepare={prepare}
                      pending={generate.isPending || operation.busy}
                      pagesLoading={pages.isLoading}
                    />
                  );
                })
              ) : (
                <p className="text-sm leading-6 text-ink-muted">
                  Research and add a lead before preparing outreach.
                </p>
              )}
            </div>
          )}
          {pages.error && (
            <p className="mt-4 text-xs leading-5 text-red-700">
              Published page choices are unavailable: {pages.error.message}
            </p>
          )}
        </div>
        <div>
          {list.isLoading && <LoadingState label="Loading outreach drafts" />}
          {list.error && (
            <ErrorState
              message={list.error.message || "Outreach drafts are unavailable."}
              onRetry={() => void list.refetch()}
            />
          )}
          {!list.isLoading && !list.error && visibleDrafts.length ? (
            <div className="space-y-3">
              {visibleDrafts.map(draft => (
                <div
                  key={draft.id}
                  className={`border bg-white p-5 ${
                    selectedLeadId === draft.leadId
                      ? "border-terracotta/50 ring-1 ring-terracotta/20"
                      : "border-line"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <StatusChip tone={outreachStatusTone(draft.status)}>
                        {outreachStatusLabel(draft.status)}
                      </StatusChip>
                      <span className="font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                        {draft.channel}
                      </span>
                    </div>
                    <button
                      className="text-xs font-semibold text-terracotta underline"
                      onClick={() => setReview(draft)}
                      disabled={draft.status === "sending"}
                    >
                      Review / edit
                    </button>
                  </div>
                  <h2 className="mt-4 text-sm font-semibold">
                    {draft.subject ||
                      `Message for ${draft.companyName || "lead"}`}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink-muted">
                    {draft.body}
                  </p>
                  <div className="mt-4 text-xs text-ink-muted">
                    To {draft.recipient || "no recipient — add one in review"}
                    {draft.channel !== "email" && " · manual delivery"}
                  </div>
                  {draft.status === "unknown" && (
                    <p className="mt-3 border-t border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">
                      Provider result is unknown. Do not resend this draft;
                      check the provider’s sent folder first.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : !list.isLoading && !list.error ? (
            <EmptyState
              icon={Send}
              title="No outreach drafts"
              description="TailorPitch will not send anything automatically. Generate a draft from researched context, then review it before any action."
            />
          ) : null}
        </div>
      </div>
      {review && (
        <OutreachReview
          draft={review}
          onClose={() => setReview(null)}
          onSaved={() => refreshDraft(review.id)}
          onSent={async message => {
            await refreshDraft(review.id);
            setReview(null);
            showToast(message);
          }}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

function LeadDraftRow({
  lead,
  selected,
  publishedPages,
  selectedPageId,
  onPageChange,
  onPrepare,
  pending,
  pagesLoading,
}: {
  lead: LeadRow;
  selected: boolean;
  publishedPages: PageRow[];
  selectedPageId: number | null;
  onPageChange: (pageId: number | null) => void;
  onPrepare: (
    leadId: number,
    channel: Channel,
    pageId?: number
  ) => Promise<void>;
  pending: boolean;
  pagesLoading: boolean;
}) {
  const researched = lead.score != null;
  const suppressed = lead.status === "suppressed";
  const disabled = pending || !researched || suppressed;
  return (
    <div
      className={`border-b pb-4 last:border-0 ${selected ? "border-terracotta/40" : "border-line"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{lead.companyName}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {lead.email || "No email recorded"}{" "}
            {lead.contactName && `· ${lead.contactName}`}
          </p>
        </div>
        <StatusChip tone={suppressed ? "bad" : researched ? "good" : "neutral"}>
          {suppressed
            ? "Suppressed"
            : researched
              ? `${lead.score}% fit`
              : "Research required"}
        </StatusChip>
      </div>
      {publishedPages.length > 0 && (
        <label className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
          <span className="shrink-0 font-semibold text-ink">
            Published page
          </span>
          <select
            className="min-w-0 flex-1 rounded-sm border border-line bg-paper px-2 py-1.5 text-xs text-ink outline-none focus:border-terracotta"
            value={selectedPageId ?? ""}
            onChange={event =>
              onPageChange(
                event.target.value ? Number(event.target.value) : null
              )
            }
            disabled={pending || suppressed || pagesLoading}
          >
            <option value="">No page link</option>
            {publishedPages.map(page => (
              <option key={page.id} value={page.id}>
                {page.title || page.content.headline}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="mt-3 flex flex-wrap gap-1">
        <Button
          variant="ghost"
          className="min-h-8 px-2 text-[11px]"
          onClick={() =>
            void onPrepare(lead.id, "email", selectedPageId ?? undefined)
          }
          disabled={disabled}
        >
          <Mail className="h-3.5 w-3.5" /> Email
        </Button>
        <Button
          variant="ghost"
          className="min-h-8 px-2 text-[11px]"
          onClick={() =>
            void onPrepare(lead.id, "linkedin", selectedPageId ?? undefined)
          }
          disabled={disabled}
        >
          LinkedIn
        </Button>
        <Button
          variant="ghost"
          className="min-h-8 px-2 text-[11px]"
          onClick={() =>
            void onPrepare(lead.id, "x", selectedPageId ?? undefined)
          }
          disabled={disabled}
        >
          X
        </Button>
      </div>
      {!researched && !suppressed && (
        <p className="mt-2 text-[11px] text-ink-muted">
          Run and save research before generating a message.
        </p>
      )}
      {researched && !lead.email && (
        <p className="mt-2 text-[11px] text-ink-muted">
          Email can be drafted now; add a recipient during review.
        </p>
      )}
    </div>
  );
}

function outreachStatusTone(
  status: OutreachDraft["status"]
): "neutral" | "good" | "warn" | "bad" {
  if (status === "accepted" || status === "manual") return "good";
  if (status === "failed" || status === "unknown") return "bad";
  if (status === "sending") return "warn";
  return "neutral";
}

function outreachStatusLabel(status: OutreachDraft["status"]) {
  if (status === "accepted") return "Accepted · not delivered";
  if (status === "unknown") return "Unknown · do not resend";
  if (status === "manual") return "Marked manually";
  return status;
}

function safeProfileUrl(channel: Channel, value: string) {
  if (channel === "email" || !value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    const linkedin = host === "linkedin.com" || host.endsWith(".linkedin.com");
    const x =
      host === "x.com" ||
      host.endsWith(".x.com") ||
      host === "twitter.com" ||
      host.endsWith(".twitter.com");
    if ((channel === "linkedin" && !linkedin) || (channel === "x" && !x))
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

function OutreachReview({
  draft,
  onClose,
  onSaved,
  onSent,
}: {
  draft: OutreachDraft;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onSent: (message: string) => Promise<void>;
}) {
  const utils = api.useUtils();
  const save = api.outreach.save.useMutation();
  const send = api.outreach.send.useMutation();
  const manual = api.outreach.manual.useMutation();
  const canEdit = draft.status === "draft" || draft.status === "failed";
  const prepared = api.outreach.prepareSend.useQuery(
    { id: draft.id },
    {
      enabled: draft.channel === "email" && draft.status === "draft",
      retry: false,
    }
  );
  const [recipient, setRecipient] = useState(draft.recipient);
  const [subject, setSubject] = useState(draft.subject || "");
  const [body, setBody] = useState(draft.body);
  const [dirty, setDirty] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<string | null>(null);

  const busy = save.isPending || send.isPending || manual.isPending;
  const markDirty = () => {
    setDirty(true);
    setActionError(null);
  };

  const saveDraft = async () => {
    if (!canEdit || busy) return;
    setActionError(null);
    try {
      await save.mutateAsync({ id: draft.id, recipient, subject, body });
      setDirty(false);
      await onSaved();
      if (draft.channel === "email") {
        const exact = await utils.outreach.prepareSend.fetch({ id: draft.id });
        utils.outreach.prepareSend.setData({ id: draft.id }, exact);
      }
    } catch (error) {
      setActionError(
        errorMessage(
          error,
          "The draft could not be saved. Your edits are still here."
        )
      );
    }
  };

  const sendEmail = async () => {
    if (
      draft.channel !== "email" ||
      draft.status !== "draft" ||
      dirty ||
      !prepared.data ||
      prepared.isFetching ||
      send.isPending
    ) {
      return;
    }
    if (
      !window.confirm(
        "Send this exact email once? Check the recipient, subject, body and opt-out link first."
      )
    )
      return;
    setActionError(null);
    try {
      await send.mutateAsync({
        id: draft.id,
        confirmed: true,
        fingerprint: prepared.data.fingerprint,
      });
      await onSent(
        "Email accepted by the provider — delivery is not confirmed."
      );
    } catch (error) {
      setActionError(
        errorMessage(
          error,
          "Sending result is uncertain. Check the provider’s sent folder before trying another message."
        )
      );
      await onSaved();
    }
  };

  const markSocialManuallySent = async () => {
    if (draft.channel === "email" || draft.status !== "draft" || dirty || busy)
      return;
    if (
      !window.confirm(
        `Mark this ${draft.channel} message as manually sent? Confirm only after you sent the saved content yourself.`
      )
    )
      return;
    setActionError(null);
    try {
      await manual.mutateAsync({ id: draft.id });
      await onSent("Marked as manually sent.");
    } catch (error) {
      setActionError(
        errorMessage(
          error,
          "This social draft could not be marked manually sent."
        )
      );
      await onSaved();
    }
  };

  const copySocialText = async () => {
    setCopyState(null);
    try {
      await copyText(body);
      setCopyState("Copied social text.");
    } catch (error) {
      setCopyState(errorMessage(error, "Could not copy social text."));
    }
  };

  const profileHref = safeProfileUrl(draft.channel, recipient);
  const sendDisabled =
    draft.channel !== "email" ||
    draft.status !== "draft" ||
    dirty ||
    !prepared.data ||
    prepared.isLoading ||
    prepared.isFetching ||
    Boolean(prepared.error) ||
    busy;

  return (
    <DrawerDialog
      title="Review outreach"
      description={
        draft.channel === "email"
          ? "Save any edits, then inspect the exact provider payload before one explicit send."
          : "Social delivery is manual. Save the draft, copy the text and open the verified profile yourself."
      }
      onClose={onClose}
    >
      <div className="space-y-5">
        {actionError && (
          <div className="border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800">
            {actionError}
          </div>
        )}
        <div className="flex items-center justify-between border border-line bg-paper p-4">
          <div>
            <MonoLabel>Channel</MonoLabel>
            <p className="mt-2 text-sm font-semibold">{draft.channel}</p>
          </div>
          <StatusChip tone={outreachStatusTone(draft.status)}>
            {outreachStatusLabel(draft.status)}
          </StatusChip>
        </div>
        {draft.status === "unknown" && (
          <div className="border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            The provider result is unknown. Do not resend this draft; check the
            provider’s sent folder first.
          </div>
        )}
        {draft.status === "accepted" && (
          <div className="border border-sage/30 bg-sage-soft/50 p-4 text-sm leading-6 text-sage-ink">
            The provider accepted this email. Accepted does not mean delivered,
            and it cannot be sent again from this draft.
          </div>
        )}
        <TextInput
          label={draft.channel === "email" ? "Recipient email" : "Profile URL"}
          value={recipient}
          onChange={event => {
            setRecipient(event.target.value);
            markDirty();
          }}
          disabled={!canEdit || busy}
          hint={
            draft.channel === "email"
              ? "Leave blank only if you plan to add the address before saving."
              : "Use the HTTPS profile URL for the selected platform."
          }
        />
        <TextInput
          label="Subject / internal note"
          value={subject}
          onChange={event => {
            setSubject(event.target.value);
            markDirty();
          }}
          disabled={!canEdit || busy}
        />
        <TextArea
          label="Message body"
          className="min-h-52"
          value={body}
          onChange={event => {
            setBody(event.target.value);
            markDirty();
          }}
          disabled={!canEdit || busy}
        />
        {draft.channel === "email" && (
          <div className="border border-terracotta/25 bg-terracotta-pale/50 p-4 text-xs leading-5 text-ink">
            <strong>Opt-out footer:</strong> The configured public origin is
            appended to the exact email payload as an unsubscribe link. Sending
            uses the saved draft, not unsaved edits.
          </div>
        )}
        {draft.channel === "email" && draft.status === "draft" && (
          <div className="border border-line bg-white p-4">
            <MonoLabel>Exact provider payload</MonoLabel>
            {prepared.isLoading || prepared.isFetching ? (
              <p className="mt-3 text-xs text-ink-muted">
                Preparing final email…
              </p>
            ) : prepared.error ? (
              <p className="mt-3 text-xs leading-5 text-red-700">
                {prepared.error.message ||
                  "Could not prepare the final payload."}
              </p>
            ) : prepared.data ? (
              <div className="mt-3 space-y-2 text-xs">
                <p>
                  <span className="font-semibold">From:</span>{" "}
                  {prepared.data.from}
                </p>
                <p>
                  <span className="font-semibold">To:</span> {prepared.data.to}
                </p>
                <p>
                  <span className="font-semibold">Subject:</span>{" "}
                  {prepared.data.subject}
                </p>
                <pre className="max-h-44 overflow-auto whitespace-pre-wrap border-t border-line pt-3 font-sans leading-5">
                  {prepared.data.body}
                </pre>
                <p className="border-t border-line pt-3 text-ink-muted">
                  Opt out: {prepared.data.unsubscribeUrl}
                </p>
              </div>
            ) : null}
          </div>
        )}
        {draft.channel !== "email" && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => void saveDraft()}
              disabled={!canEdit || !dirty || busy}
            >
              {save.isPending ? "Saving…" : "Save draft"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void copySocialText()}
              disabled={!body || copyState === "Copied social text."}
            >
              <Copy className="h-4 w-4" /> Copy
            </Button>
            {profileHref ? (
              <a
                href={profileHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-sm border border-line bg-paper px-4 text-sm font-semibold text-ink hover:border-ink/40"
              >
                <ExternalLink className="h-4 w-4" /> Open profile
              </a>
            ) : (
              <Button variant="secondary" disabled>
                <ExternalLink className="h-4 w-4" /> Open profile
              </Button>
            )}
            <Button
              onClick={() => void markSocialManuallySent()}
              disabled={!canEdit || draft.status !== "draft" || dirty || busy}
            >
              {manual.isPending ? "Saving status…" : "Mark manually sent"}
            </Button>
          </div>
        )}
        {copyState && <p className="text-xs text-ink-muted">{copyState}</p>}
        {draft.channel === "email" && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void saveDraft()}
              disabled={!canEdit || !dirty || busy}
            >
              {save.isPending ? "Saving…" : "Save draft"}
            </Button>
            <Button onClick={() => void sendEmail()} disabled={sendDisabled}>
              {send.isPending
                ? "Sending…"
                : dirty
                  ? "Save to refresh preview"
                  : "Send email once"}
            </Button>
          </div>
        )}
      </div>
    </DrawerDialog>
  );
}

export function InboxView() {
  const status = api.mailbox.status.useQuery(undefined, { retry: false });
  const messages = api.inbox.list.useQuery(undefined, { retry: false });
  const sync = api.mailbox.syncInbox.useMutation();
  const [toast, setToast] = useState<ToastState | null>(null);

  const syncNow = async () => {
    if (sync.isPending) return;
    try {
      const result = await sync.mutateAsync(undefined);
      setToast({
        message: `${result.count} messages synced.`,
        kind: "success",
      });
      await messages.refetch();
    } catch (error) {
      setToast({
        message: errorMessage(error, "Inbox sync failed."),
        kind: "error",
      });
    }
  };

  return (
    <>
      <SectionHeader
        eyebrow="Inbox / reply context"
        title="Keep the loop close."
        description="Connect a mailbox in settings to sync replies. Inbox data is separate from draft generation and sending."
        action={
          <Button
            variant="secondary"
            onClick={() => void syncNow()}
            disabled={
              sync.isPending || status.isLoading || Boolean(status.error)
            }
          >
            <InboxIcon className="h-4 w-4" />{" "}
            {sync.isPending ? "Syncing…" : "Sync inbox"}
          </Button>
        }
      />
      <div className="mb-7 border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <MonoLabel>Mailbox connection</MonoLabel>
            {status.isLoading ? (
              <p className="mt-2 text-sm text-ink-muted">Checking mailbox…</p>
            ) : status.error ? (
              <p className="mt-2 text-sm text-red-700">
                {status.error.message || "Mailbox status unavailable."}
              </p>
            ) : (
              <p className="mt-2 text-sm">
                {status.data?.mailbox.connected
                  ? `${status.data.mailbox.provider} · ${status.data.mailbox.displayName || "connected"}`
                  : "No mailbox connected"}
              </p>
            )}
          </div>
          <Link
            href="/app/settings"
            className="text-xs font-semibold text-terracotta underline"
          >
            Manage integrations
          </Link>
        </div>
      </div>
      {messages.isLoading && <LoadingState label="Loading inbox messages" />}
      {messages.error && (
        <ErrorState
          message={messages.error.message || "Inbox messages are unavailable."}
          onRetry={() => void messages.refetch()}
        />
      )}
      {!messages.isLoading && !messages.error && messages.data?.length ? (
        <div className="border border-line bg-white">
          {messages.data.map((message: InboxMessage) => (
            <div
              key={message.id}
              className="border-b border-line p-5 last:border-0"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{message.subject}</p>
                  <p className="mt-1 text-xs text-ink-muted">{message.from}</p>
                </div>
                <span className="font-mono text-[10px] text-ink-muted">
                  {message.receivedAt.toLocaleDateString()}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-muted">
                {message.snippet}
              </p>
            </div>
          ))}
        </div>
      ) : !messages.isLoading && !messages.error ? (
        <EmptyState
          icon={InboxIcon}
          title="No inbox messages yet"
          description="Connect Gmail or IMAP in Settings, then sync when you are ready. Sync does not change draft or lead content."
        />
      ) : null}
      {toast && (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}

export function SubmissionsView() {
  const list = api.submissions.list.useQuery(undefined, { retry: false });
  return (
    <>
      <SectionHeader
        eyebrow="Submissions / consented interest"
        title="Who raised a hand."
        description="Submissions from public personalized pages and the TailorPitch early-access list. Consent text is retained with each record."
      />
      {list.isLoading && <LoadingState label="Loading submissions" />}
      {list.error && (
        <ErrorState
          message={list.error.message || "Submissions are unavailable."}
          onRetry={() => void list.refetch()}
        />
      )}
      {!list.isLoading && !list.error && list.data?.length ? (
        <div className="overflow-x-auto border border-line bg-white">
          <table className="min-w-[700px] w-full text-left">
            <thead>
              <tr className="border-b border-line bg-paper">
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                  Email
                </th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                  Source
                </th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                  Consent
                </th>
                <th className="px-5 py-3 font-mono text-[10px] uppercase tracking-[.12em] text-ink-muted">
                  Received
                </th>
              </tr>
            </thead>
            <tbody>
              {list.data.map(submission => (
                <tr
                  key={submission.id}
                  className="border-b border-line last:border-0"
                >
                  <td className="px-5 py-4 text-sm font-semibold">
                    {submission.email}
                  </td>
                  <td className="px-5 py-4">
                    <StatusChip tone="good">{submission.source}</StatusChip>
                  </td>
                  <td className="max-w-xs px-5 py-4 text-xs leading-5 text-ink-muted">
                    {submission.consentText}
                  </td>
                  <td className="px-5 py-4 font-mono text-[10px] text-ink-muted">
                    {submission.createdAt.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !list.isLoading && !list.error ? (
        <EmptyState
          icon={Share2}
          title="No submissions yet"
          description="When someone submits a consented email on a published page, it will appear here. The public waitlist is also visible to the pilot owner."
        />
      ) : null}
    </>
  );
}
