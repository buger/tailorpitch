import { usePageOpen } from "@/components/usePageOpen";
import { useState } from "react";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Link, useRoute } from "wouter";
import { api } from "@/components/leadloom-types";
import { PagePreview } from "@/components/PagePreview";
import { TextInput, Toast } from "@/components/LeadloomUI";

export default function PublicPage() {
  const [, params] = useRoute<{ token: string }>("/p/:token");
  const token = params?.token ?? "";
  const page = api.public.page.useQuery(
    { token },
    { enabled: Boolean(token), retry: false }
  );
  const subscribe = api.public.subscribe.useMutation();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  usePageOpen(token, Boolean(page.data));
  if (page.isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-5 w-5 animate-spin text-terracotta" />
      </div>
    );
  if (page.error || !page.data)
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-6 text-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[.14em] text-terracotta">
            404 / page unavailable
          </p>
          <h1 className="mt-4 font-display text-5xl tracking-[-.07em]">
            This page has moved
            <br />
            or is still a draft.
          </h1>
          <Link
            href="/"
            className="mt-7 inline-flex text-sm font-semibold underline"
          >
            Back to TailorPitch
          </Link>
        </div>
      </div>
    );
  const { page: publicPage, company, lead } = page.data;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (subscribe.isPending) return;
    if (!consent) {
      setToast("Please agree before submitting.");
      return;
    }
    try {
      await subscribe.mutateAsync({ token, email, consent: true, website });
      setEmail("");
      setConsent(false);
      setSubmitted(true);
      setToast("Thanks — your request has been saved.");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "We couldn't save that yet."
      );
    }
  };
  return (
    <div
      style={
        {
          "--preview-paper": publicPage.brandSnapshot.backgroundColor,
          "--preview-ink": publicPage.brandSnapshot.primaryColor,
          backgroundColor: publicPage.brandSnapshot.backgroundColor,
          color: publicPage.brandSnapshot.primaryColor,
        } as React.CSSProperties
      }
      className="min-h-screen bg-[var(--preview-paper)]"
    >
      <PagePreview
        content={publicPage.content}
        brand={publicPage.brandSnapshot}
        companyName={company.name}
        leadName={lead.companyName}
        ctaHref="#contact"
      />
      <section id="contact" className="pp-contact">
        <div className="pp-contact-layout">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.15em] opacity-60">
              A small first commitment
            </p>
            <h2 className="mt-4">
              {company.name === "Proof"
                ? "Bring one change."
                : "Start with a conversation."}
              <br />
              Let’s see what fits.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-7 opacity-70">
              {company.name === "Proof"
                ? "The first conversation is about your workflow, not a sales deck. No repository access, purchase or wider rollout is required."
                : "Share the context that matters to your team. This requests a conversation—not a purchase, subscription or commitment to a wider engagement."}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.15em] opacity-60">
              Your next step
            </p>
            <h2 className="mt-3 font-serif text-3xl tracking-[-.04em]">
              {publicPage.content.ctaText || "Explore a first step together"}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 opacity-75">
              Leave your email so {company.name} can discuss this proposal with
              you. No purchase or subscription starts.
            </p>
            {submitted ? (
              <div role="status" className="mt-6 border border-black/20 p-6">
                <Check className="mb-3 h-6 w-6" />
                <h3 className="font-semibold">Your request is saved.</h3>
                <p className="mt-2 text-sm opacity-75">
                  {company.name} can follow up about this proposal.
                </p>
              </div>
            ) : (
              <form
                onSubmit={submit}
                className="mt-6 max-w-lg"
                aria-label="Request a conversation"
              >
                <TextInput
                  label="Your work email"
                  type="email"
                  autoComplete="email"
                  maxLength={320}
                  disabled={subscribe.isPending}
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="border-black/20 bg-transparent"
                />
                <label className="mt-4 flex items-start gap-3 text-xs leading-5 opacity-75">
                  <input
                    type="checkbox"
                    required
                    disabled={subscribe.isPending}
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  I agree to be contacted about this proposal. This is an
                  explicit request for a conversation.
                </label>
                <div className="absolute -left-[10000px]" aria-hidden="true">
                  <label>
                    Website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                    />
                  </label>
                </div>
                {subscribe.error && (
                  <p
                    role="alert"
                    className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                  >
                    We couldn’t save your request. Please try again.
                  </p>
                )}
                <button
                  type="submit"
                  disabled={subscribe.isPending}
                  className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--preview-ink)] px-5 text-sm font-semibold text-[var(--preview-paper)] disabled:opacity-60"
                >
                  {subscribe.isPending
                    ? "Saving request…"
                    : publicPage.content.ctaText || "Start the conversation"}
                  <Check className="h-4 w-4" />
                </button>
              </form>
            )}
            <p className="mt-5 text-xs opacity-70">
              Prefer to choose a time?{" "}
              <a
                href={publicPage.brandSnapshot.bookingUrl}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Open {company.name}’s booking page
              </a>
              .
            </p>
            <p className="mt-5 text-[11px] leading-5 opacity-60">
              This page records anonymous tab-session opens, not visitor
              identity. Your submitted email is shared with {company.name}.{" "}
              <Link href="/privacy" className="underline">
                Privacy details
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
      <footer className="flex items-center justify-between border-t border-black/10 px-6 py-6 text-xs opacity-60 sm:px-12">
        <span>{company.name}</span>
        <Link href="/" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-3 w-3" />
          Built with TailorPitch
        </Link>
      </footer>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
