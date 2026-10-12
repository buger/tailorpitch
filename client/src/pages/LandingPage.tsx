import { useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { startLogin } from "@/const";
import { api } from "@/components/leadloom-types";
import {
  Button,
  LeadloomWordmark,
  MonoLabel,
  Toast,
} from "@/components/LeadloomUI";

const HERO_IMAGE_URL =
  "/manus-storage/async-images/mjYLHFOjsOmIEZwCkJwM5R/image-1.webp";

const pipeline = [
  {
    number: "01",
    title: "Source",
    body: "Start with the places and signals your team already trusts.",
  },
  {
    number: "02",
    title: "Qualify",
    body: "Keep evidence, unknowns and fit in the same frame.",
  },
  {
    number: "03",
    title: "Select",
    body: "A person chooses which reason is worth pursuing.",
  },
  {
    number: "04",
    title: "Page",
    body: "Shape the context into a considered proposal draft.",
  },
  {
    number: "05",
    title: "Outreach draft",
    body: "Prepare a relevant first note. Review before anything moves.",
  },
];

const principles = [
  {
    number: "01",
    title: "Evidence stays nearby.",
    body: "A reason to reach out is stronger when the source is still in view.",
  },
  {
    number: "02",
    title: "The choice stays human.",
    body: "TailorPitch can help with context; your team decides what earns attention.",
  },
  {
    number: "03",
    title: "A draft remains a draft.",
    body: "Pages and messages are proposals until someone approves the next step.",
  },
];

export default function LandingPage() {
  const signup = api.public.signup.useMutation();
  const [heroUnavailable, setHeroUnavailable] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [toast, setToast] = useState<{
    message: string;
    kind: "success" | "error";
  } | null>(null);

  const scrollToSignup = () =>
    document
      .getElementById("early-access")
      ?.scrollIntoView({ behavior: "smooth" });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent) {
      setToast({
        message: "Please agree to receive the occasional TailorPitch note.",
        kind: "error",
      });
      return;
    }

    try {
      await signup.mutateAsync({ email, consent: true, website });
      setEmail("");
      setWebsite("");
      setConsent(false);
      setToast({
        message: "You're on the list. We'll be in touch.",
        kind: "success",
      });
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "We couldn't save that email. Try again.",
        kind: "error",
      });
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-paper text-ink">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between border-b border-line px-5 py-5 sm:px-8 lg:px-12">
        <LeadloomWordmark />
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 text-xs font-semibold text-ink-muted sm:flex"
        >
          <a href="#how-it-works" className="transition-colors hover:text-ink">
            How it works
          </a>
          <a href="#why" className="transition-colors hover:text-ink">
            Why TailorPitch
          </a>
          <Link href="/privacy" className="transition-colors hover:text-ink">
            Privacy
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <button
            className="hidden text-xs font-semibold text-ink-muted transition-colors hover:text-ink sm:block"
            onClick={() => startLogin()}
          >
            Log in
          </button>
          <Button className="min-h-9 px-3 text-xs" onClick={scrollToSignup}>
            Request access <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <main>
        <section
          aria-labelledby="hero-title"
          className="relative mx-auto max-w-[1440px] px-5 pb-20 pt-16 sm:px-8 sm:pb-28 sm:pt-24 lg:px-12 lg:pb-36 lg:pt-32"
        >
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-20">
            <div className="relative z-10 max-w-2xl">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="text-xl leading-none text-[#8a341f]"
                >
                  ✳
                </span>
                <MonoLabel className="text-[#8a341f]">
                  TailorPitch / considered prospecting
                </MonoLabel>
              </div>
              <h1
                id="hero-title"
                className="mt-8 max-w-[680px] font-display text-[clamp(2.6rem,6vw,6.4rem)] font-normal leading-[.92] tracking-[-.055em]"
              >
                Less chasing.
                <br />
                <span className="ml-[5%] text-ink">More reasons.</span>
              </h1>
              <p className="mt-10 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
                Find the right fit, then give the reason a shape. TailorPitch
                helps teams move from a researched company signal to a
                human-reviewed first conversation.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-4">
                <Button onClick={scrollToSignup}>
                  Request early access <ArrowRight className="h-4 w-4" />
                </Button>
                <button
                  className="group inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
                  onClick={() => startLogin()}
                >
                  Log in to workspace
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </button>
              </div>
              <p className="mt-12 max-w-sm border-t border-line pt-4 text-xs leading-5 text-ink-muted">
                A quieter route from signal to send — with a clear person at the
                boundary.
              </p>
            </div>

            <figure className="relative lg:pl-3">
              <div
                aria-hidden="true"
                className="absolute -left-8 top-12 hidden h-px w-28 -rotate-[23deg] origin-right bg-[#8a341f]/70 lg:block"
              />
              <div
                aria-hidden="true"
                className="absolute -left-10 top-[4.25rem] hidden h-2.5 w-2.5 rounded-full bg-[#8a341f] lg:block"
              />
              <div className="relative aspect-[4/3] overflow-hidden border border-ink/15 bg-[#ded9cf]">
                {heroUnavailable ? (
                  <div className="flex h-full items-center justify-center bg-paper px-8 text-center">
                    <div>
                      <span className="font-display text-5xl text-ink">
                        A reason, held lightly.
                      </span>
                      <p className="mt-5 text-xs text-ink-muted">
                        The atmospheric illustration is currently unavailable.
                      </p>
                    </div>
                  </div>
                ) : (
                  <img
                    onError={() => setHeroUnavailable(true)}
                    src={HERO_IMAGE_URL}
                    alt="Atmospheric limestone sphere with a fine red thread"
                    className="h-full w-full object-cover"
                  />
                )}
                <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-ink/10" />
              </div>
              <figcaption className="mt-4 flex flex-col gap-1 border-t border-line pt-3 text-[10px] leading-4 text-ink-muted sm:flex-row sm:items-center sm:justify-between">
                <span className="font-mono uppercase tracking-[.14em]">
                  01 / A reason, held lightly
                </span>
                <span>AI-generated illustration</span>
              </figcaption>
            </figure>
          </div>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute bottom-8 right-[28%] hidden h-28 w-52 text-[#8a341f]/60 lg:block"
            viewBox="0 0 208 112"
            fill="none"
          >
            <path
              d="M2 86C54 85 55 20 112 27c25 3 35 24 31 43-5 25-44 35-69 23"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle cx="74" cy="29" r="3" fill="currentColor" />
          </svg>
        </section>

        <section
          id="how-it-works"
          aria-labelledby="workflow-title"
          className="border-y border-line bg-paper"
        >
          <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-[.66fr_1.34fr] lg:gap-20">
              <div>
                <MonoLabel className="text-[#8a341f]">
                  The path / illustrative only
                </MonoLabel>
                <h2
                  id="workflow-title"
                  className="mt-5 max-w-md font-display text-5xl font-normal leading-[.9] tracking-[-.07em] sm:text-6xl"
                >
                  A reason can travel a long way.
                </h2>
              </div>
              <div>
                <p className="max-w-xl text-sm leading-6 text-ink-muted">
                  The workflow below illustrates the steps, not a live agent run
                  or a customer pipeline. Each stage keeps sources, uncertainty
                  and your next decision in view.
                </p>
                <ol className="mt-10 grid border-y border-line sm:grid-cols-5">
                  {pipeline.map((stage, index) => (
                    <li
                      key={stage.number}
                      className="relative border-b border-line py-5 last:border-b-0 sm:border-b-0 sm:border-l sm:px-4 sm:py-5 sm:first:border-l-0 sm:first:pl-0 sm:last:pr-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[10px] tracking-[.12em] text-[#8a341f]">
                          {stage.number}
                        </span>
                        {index < pipeline.length - 1 && (
                          <span
                            aria-hidden="true"
                            className="font-mono text-xs text-ink/35 sm:hidden"
                          >
                            →
                          </span>
                        )}
                      </div>
                      <h3 className="mt-8 font-display text-2xl font-normal leading-none tracking-[-.05em]">
                        {stage.title}
                      </h3>
                      <p className="mt-3 max-w-[13rem] text-xs leading-5 text-ink-muted">
                        {stage.body}
                      </p>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex flex-col gap-2 border-l-2 border-[#8a341f] pl-4 text-xs leading-5 text-ink-muted sm:flex-row sm:items-baseline sm:gap-4">
                  <span className="font-mono uppercase tracking-[.12em] text-[#8a341f]">
                    Human approval boundary
                  </span>
                  <span>
                    Select before generating pages. Review the exact message
                    before sending.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="why"
          aria-labelledby="why-title"
          className="bg-ink text-paper"
        >
          <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
            <div className="grid gap-14 lg:grid-cols-[.78fr_1.22fr] lg:gap-24">
              <div>
                <MonoLabel className="text-paper/50">
                  The difference / 02
                </MonoLabel>
                <h2
                  id="why-title"
                  className="mt-5 max-w-lg font-display text-5xl font-normal leading-[.88] tracking-[-.07em] sm:text-7xl"
                >
                  Find the right fit. Keep the reason.
                </h2>
                <p className="mt-8 max-w-sm text-sm leading-6 text-paper/60">
                  Relevance is not a flourish added at the end. It is the thread
                  you keep hold of from first signal to first note.
                </p>
              </div>
              <ol className="border-t border-paper/20">
                {principles.map(principle => (
                  <li
                    key={principle.number}
                    className="grid gap-4 border-b border-paper/20 py-6 sm:grid-cols-[4rem_1fr] sm:gap-6 sm:py-8"
                  >
                    <span className="font-mono text-[10px] tracking-[.12em] text-[#8a341f]">
                      {principle.number}
                    </span>
                    <div>
                      <h3 className="font-display text-3xl font-normal leading-none tracking-[-.05em] sm:text-4xl">
                        {principle.title}
                      </h3>
                      <p className="mt-3 max-w-lg text-sm leading-6 text-paper/60">
                        {principle.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          id="early-access"
          aria-labelledby="access-title"
          className="border-t border-line bg-ink text-paper"
        >
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.8fr_1.2fr] lg:items-end lg:gap-20 lg:px-12">
            <div>
              <MonoLabel className="text-paper/50">
                The first conversation / 03
              </MonoLabel>
              <h2
                id="access-title"
                className="mt-5 max-w-xl font-display text-5xl font-normal leading-[.9] tracking-[-.07em] sm:text-6xl"
              >
                Start with a better reason.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-paper/60">
                Join the early access list for notes on building a more
                considered prospecting motion.
              </p>
            </div>
            <form onSubmit={submit} className="max-w-xl" noValidate={false}>
              <label
                className="block text-sm font-semibold"
                htmlFor="early-access-email"
              >
                Work email
              </label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  id="early-access-email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  className="min-h-12 flex-1 rounded-sm border border-paper/30 bg-paper/10 px-4 text-sm text-paper placeholder:text-paper/45 outline-none transition focus:border-paper focus:ring-2 focus:ring-paper/20"
                />
                <Button
                  type="submit"
                  disabled={signup.isPending}
                  aria-busy={signup.isPending}
                  className="min-h-12 bg-paper text-ink hover:bg-paper/90"
                >
                  {signup.isPending ? "Joining…" : "Join the list"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <label
                className="mt-4 flex items-start gap-3 text-xs leading-5 text-paper/65"
                htmlFor="early-access-consent"
              >
                <input
                  id="early-access-consent"
                  name="consent"
                  type="checkbox"
                  checked={consent}
                  onChange={event => setConsent(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-paper"
                />
                <span>
                  I agree to receive occasional TailorPitch updates. You can
                  unsubscribe anytime.{" "}
                  <Link
                    href="/privacy"
                    className="underline underline-offset-2 hover:text-paper"
                  >
                    Privacy
                  </Link>
                  .
                </span>
              </label>
              <div
                className="absolute -left-[10000px] h-px w-px overflow-hidden"
                aria-hidden="true"
              >
                <label htmlFor="early-access-website">Website</label>
                <input
                  id="early-access-website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={event => setWebsite(event.target.value)}
                />
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1440px] flex-col gap-4 border-t border-line px-5 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <LeadloomWordmark compact />
        <div className="flex items-center gap-5">
          <span>© {new Date().getFullYear()} TailorPitch</span>
          <Link href="/privacy" className="transition-colors hover:text-ink">
            Privacy
          </Link>
          <button
            onClick={() => startLogin()}
            className="transition-colors hover:text-ink"
          >
            Log in
          </button>
        </div>
      </footer>

      {toast && (
        <Toast
          message={toast.message}
          kind={toast.kind}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

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
