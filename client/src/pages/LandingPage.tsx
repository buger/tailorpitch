import { Link } from "wouter";
import { LeadloomWordmark, MonoLabel } from "@/components/LeadloomUI";
export { default } from "@/components/landing/SignalLanding";

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-4xl items-center justify-between border-b border-line px-5 py-5 sm:px-8">
        <Link href="/">
          <LeadloomWordmark />
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-ink-muted hover:text-ink"
        >
          Back to home
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <MonoLabel className="text-terracotta">
          Privacy / public signup
        </MonoLabel>
        <h1 className="mt-5 font-display text-6xl leading-[.9] tracking-[-.07em]">
          A small list.
          <br />
          Handled carefully.
        </h1>
        <p className="mt-8 text-base leading-7 text-ink-muted">
          This page explains how TailorPitch handles the email address you
          provide for early access.
        </p>
        <div className="mt-14 space-y-10 border-t border-line pt-10 text-sm leading-7">
          <section>
            <h2 className="font-display text-2xl tracking-[-.04em]">
              What we collect
            </h2>
            <p className="mt-3 text-ink-muted">
              We collect your email address, the consent record and the time you
              submitted it. The public waitlist form includes a hidden website
              field to keep automated submissions out; we do not use it to
              profile you.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl tracking-[-.04em]">
              Why we collect it
            </h2>
            <p className="mt-3 text-ink-muted">
              We use the email only to respond about TailorPitch early access
              and related product updates. We do not sell the list or add you to
              a different marketing list without asking.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl tracking-[-.04em]">
              Personalized-page forms and analytics
            </h2>
            <p className="mt-3 text-ink-muted">
              When you submit a personalized-page form, your email and consent
              are saved for the company that created the proposal. Published
              pages count anonymous tab-session opens, not unique people. Repeat
              refreshes in one tab are deduplicated; signed-in previews and
              recognized crawlers are excluded. No IP address, fingerprint or
              visitor identity is stored by page analytics. Browser privacy
              tools may prevent tracking.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl tracking-[-.04em]">
              Your choices
            </h2>
            <p className="mt-3 text-ink-muted">
              You can ask us to correct or remove your waitlist record by
              emailing{" "}
              <a
                href="mailto:hello@reqproof.com"
                className="text-terracotta underline"
              >
                hello@reqproof.com
              </a>
              . Every update email will include an unsubscribe option.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
