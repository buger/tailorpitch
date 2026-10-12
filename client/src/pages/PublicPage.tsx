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
  const [toast, setToast] = useState<string | null>(null);
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
            Back to Leadloom
          </Link>
        </div>
      </div>
    );
  const { page: publicPage, company, lead } = page.data;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!consent) {
      setToast("Please agree before submitting.");
      return;
    }
    try {
      await subscribe.mutateAsync({ token, email, consent: true, website: "" });
      setEmail("");
      setConsent(false);
      setToast("Thanks — we’ll be in touch.");
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
      />
      <section className="border-t border-black/10 bg-[var(--preview-paper)] px-6 py-12 text-[var(--preview-ink)] sm:px-12">
        <div className="mx-auto max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[.15em] opacity-60">
            Keep the conversation open
          </p>
          <h2 className="mt-3 font-serif text-3xl tracking-[-.04em]">
            Want to explore this together?
          </h2>
          <form onSubmit={submit} className="mt-6 max-w-lg">
            <TextInput
              label="Your work email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="border-black/20 bg-transparent"
            />
            <label className="mt-4 flex items-start gap-3 text-xs leading-5 opacity-75">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              I agree to be contacted about this proposal. This is an explicit
              request for a conversation.
            </label>
            <button
              disabled={subscribe.isPending}
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--preview-ink)] px-5 text-sm font-semibold text-[var(--preview-paper)] disabled:opacity-60"
            >
              {subscribe.isPending ? "Sending…" : "Start the conversation"}
              <Check className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>
      <footer className="flex items-center justify-between border-t border-black/10 px-6 py-6 text-xs opacity-60 sm:px-12">
        <span>{company.name}</span>
        <Link href="/" className="inline-flex items-center gap-2">
          <ArrowLeft className="h-3 w-3" />
          Built with Leadloom
        </Link>
      </footer>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
