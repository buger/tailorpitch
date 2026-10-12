import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  GitBranch,
  Mail,
  Pause,
  Search,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import { startLogin } from "@/const";
import { api } from "@/components/leadloom-types";
import {
  Button,
  LeadloomWordmark,
  MonoLabel,
  Toast,
} from "@/components/LeadloomUI";
import { PitchGallery } from "@/components/landing/PitchGallery";
import { PitchWorkbench } from "@/components/landing/PitchWorkbench";
import { PricingLedger } from "@/components/landing/PricingLedger";
import { proposedPlans, type ProposedPlanId } from "@shared/pricing";
import { marketing } from "@shared/marketing";
import "@/components/landing/landing.css";
import "@/components/landing/refero.css";

const faqs = marketing.faqs;
export default function LandingPage() {
  const signup = api.public.signup.useMutation();
  const [email, setEmail] = useState(""),
    [consent, setConsent] = useState(false),
    [website, setWebsite] = useState("");
  const [interest, setInterest] = useState<ProposedPlanId | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    kind: "success" | "error";
  } | null>(null);
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  const registerInterest = (plan: ProposedPlanId) => {
    setInterest(plan);
    scrollTo("early-access");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent) {
      setToast({
        message: "Please agree to receive occasional TailorPitch updates.",
        kind: "error",
      });
      return;
    }
    try {
      await signup.mutateAsync({ email, consent: true, website });
      setEmail("");
      setConsent(false);
      setWebsite("");
      setToast({
        message:
          "You're on the early-access list. No subscription or charge was created.",
        kind: "success",
      });
    } catch (error) {
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "We could not save that email. Please try again.",
        kind: "error",
      });
    }
  };
  return (
    <div className="tp-landing">
      <header className="tp-header tp-shell">
        <Link href="/" aria-label="TailorPitch home">
          <LeadloomWordmark />
        </Link>
        <nav aria-label="Primary navigation">
          <a href="#the-work">How it works</a>
          <a href="#proof-pilot">From Proof</a>
          <a href="#pricing">Plans</a>
        </nav>
        <div className="tp-header-actions">
          <button type="button" onClick={() => startLogin()}>
            Log in <ArrowUpRight size={13} />
          </button>
          <button
            type="button"
            className="tp-small-cta"
            onClick={() => scrollTo("early-access")}
          >
            {marketing.primaryCta}
            <ArrowRight size={14} />
          </button>
        </div>
      </header>
      <main>
        <section className="tp-hero tp-shell" aria-labelledby="hero-title">
          <div className="tp-gallery-layout">
            <div className="tp-gallery-intro">
              <div className="tp-hero-kicker">
                <span>{marketing.audience}</span>
              </div>
              <h1 id="hero-title" aria-label={marketing.headline.join(" ")}>
                {marketing.headline.map(line => (
                  <span key={line}>{line}</span>
                ))}
              </h1>
              <div className="tp-hero-description">
                <p>{marketing.description}</p>
              </div>
              <div className="tp-hero-actions">
                <button
                  type="button"
                  className="tp-cta"
                  onClick={() => scrollTo("early-access")}
                >
                  {marketing.primaryCta} <ArrowRight size={17} />
                </button>
                <button
                  type="button"
                  className="tp-text-cta"
                  onClick={() => scrollTo("the-work")}
                >
                  {marketing.secondaryCta} <span aria-hidden="true">↓</span>
                </button>
              </div>
              <div className="tp-hero-offer">
                <strong>{marketing.offer}</strong>
                <p className="tp-hero-fineprint">{marketing.priceNote}</p>
              </div>
            </div>
            <PitchGallery onExplore={() => scrollTo("the-work")} />
          </div>
          <div className="tp-flow-rail">
            <span>THE PERSONAL PITCH SYSTEM / YOUR PACE</span>
            <ol>
              <li>
                <span>01</span> Find
              </li>
              <li>
                <span>02</span> Qualify
              </li>
              <li>
                <span>03</span> Your choice
              </li>
              <li>
                <span>04</span> Page
              </li>
              <li>
                <span>05</span> Outreach
              </li>
            </ol>
          </div>
        </section>

        <section className="tp-not-a-list" aria-labelledby="list-title">
          <div className="tp-shell tp-contrast-layout">
            <div className="tp-contrast-left">
              <span className="tp-index">01 / WHY THE LIST ISN’T ENOUGH</span>
              <h2 id="list-title">
                Names don’t
                <br />
                <em>start conversations.</em>
              </h2>
              <div className="tp-mess" aria-label="Manual prospecting tasks">
                <span>Find a company.</span>
                <span>Research in 12 tabs.</span>
                <span>Build a page from scratch.</span>
                <span>Send the same pitch again.</span>
              </div>
              <p>
                A contact list still leaves you with the hard part:
                understanding the account and making your offer relevant. More
                names don’t fix an interchangeable pitch.
              </p>
            </div>
            <div className="tp-contrast-right">
              <span className="tp-index">THE BETTER ALTERNATIVE</span>
              <h2>
                Fewer accounts.
                <br />
                <em>A stronger reason.</em>
              </h2>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <h3>Know who fits</h3>
                    <p>
                      Compare each account with your ideal customer profile.
                    </p>
                  </div>
                  <Check size={18} />
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>Know why now</h3>
                    <p>
                      Review the public signals and source links. See what is
                      still unknown.
                    </p>
                  </div>
                  <Check size={18} />
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>Make your offer theirs</h3>
                    <p>
                      Give the account a page that connects your offer to their
                      context.
                    </p>
                  </div>
                  <Check size={18} />
                </li>
                <li>
                  <span>04</span>
                  <div>
                    <h3>Start with something relevant</h3>
                    <p>
                      Review a first message in your voice—not another blank
                      text box.
                    </p>
                  </div>
                  <Check size={18} />
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section
          id="the-work"
          className="tp-example tp-shell"
          aria-labelledby="example-title"
        >
          <div className="tp-section-intro">
            <span className="tp-index">02 / THE PERSONAL PITCH SYSTEM</span>
            <h2 id="example-title">
              One account. One reason.
              <br />
              <em>One personal pitch.</em>
            </h2>
            <p>
              Watch the handoff: a public signal becomes a research brief, the
              account you select gets its own page, and the first message uses
              the same context. Less rebuilding the story between tools.
            </p>
          </div>
          <div className="tp-workbench-wrap">
            <div className="tp-workbench-caption">
              <span>CLICK THROUGH THE WORK—NOT A LIVE AGENT RUN</span>
              <span className="tp-handwritten">
                See why this account. Then see the pitch. ↘
              </span>
            </div>
            <PitchWorkbench />
          </div>
          <div className="tp-integrations">
            <span>CONNECT THE TOOLS THAT DO THE WORK</span>
            <div>
              <span>
                <Search size={15} />
                Apify
              </span>
              <span>
                <Sparkles size={15} />
                Gojiberry
              </span>
              <span>
                <GitBranch size={15} />
                Manus tasks
              </span>
              <span>
                <Mail size={15} />
                Gmail / IMAP
              </span>
            </div>
            <small>Your accounts. Provider fees separate.</small>
          </div>
          <div className="tp-inline-next">
            <p>Want this workflow for your offer?</p>
            <button
              type="button"
              className="tp-text-cta"
              onClick={() => scrollTo("early-access")}
            >
              {marketing.primaryCta} <ArrowRight size={14} />
            </button>
          </div>
        </section>
        <section
          id="proof-pilot"
          className="tp-proof tp-shell"
          aria-labelledby="proof-title"
        >
          <div className="tp-proof-intro">
            <div className="tp-proof-identity">
              <img
                src="https://reqproof.com/assets/brand/proof-mark.svg"
                alt="Proof mark"
              />
              <span className="font-display">Proof</span>
              <span className="tp-index">03 / FROM THE OWNER OF PROOF</span>
            </div>
            <h2 id="proof-title">
              An owner’s standard
              <br />
              <em>for outreach.</em>
            </h2>
            <p>
              Proof’s owner, Leonid Bugaev, puts the goal simply: understand the
              team, make the offer relevant, and keep the company’s voice. That
              is the standard behind every part of the workflow.
            </p>
          </div>
          <div className="tp-quote-layout">
            <figure>
              <span className="tp-quote-mark" aria-hidden="true">
                “
              </span>
              <blockquote>
                We don't need another thousand names. We need a clear reason to
                speak to the right team.
              </blockquote>
              <figcaption>
                <strong>Leonid Bugaev</strong>
                <span>Owner, Proof</span>
              </figcaption>
            </figure>
            <figure>
              <span className="tp-quote-mark" aria-hidden="true">
                “
              </span>
              <blockquote>
                The pitch should feel like Proof. The context should make it
                clear why this team, and why this conversation.
              </blockquote>
              <figcaption>
                <strong>Leonid Bugaev</strong>
                <span>Owner, Proof</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="tp-method tp-shell" aria-labelledby="method-title">
          <div className="tp-section-intro">
            <span className="tp-index">
              04 / LESS SETUP. LESS STARTING OVER.
            </span>
            <h2 id="method-title">
              Start with your site.
              <br />
              <em>Keep your judgment.</em>
            </h2>
          </div>
          <div className="tp-method-row">
            <div className="tp-method-number">01</div>
            <div className="tp-method-copy">
              <h3>
                Skip the blank brief.
                <br />
                Share your website.
              </h3>
              <p>
                Review the offer, real copy examples, logo and customer profiles
                suggested from your website. Add your voice and design
                references once. Change them here or in Settings whenever you
                need.
              </p>
            </div>
            <div className="tp-source-slip">
              <span className="tp-index">
                YOUR BRAND / NOT A GENERIC TEMPLATE
              </span>
              <div className="tp-source-url">
                your-company.com <ArrowUpRight size={14} />
              </div>
              <div className="tp-slip-evidence">
                <span>Offer & actual copy</span>
                <span>Logo & style clues</span>
                <span>Suggested ICPs</span>
              </div>
              <p>
                Found on your site.
                <br />
                <strong>Approved by you.</strong>
              </p>
            </div>
          </div>
          <div className="tp-method-row">
            <div className="tp-method-number">02</div>
            <div className="tp-method-copy">
              <h3>
                Trade the contact dump
                <br />
                for a daily shortlist.
              </h3>
              <p>
                Set the profile and discovery pace. Connected agents find and
                qualify candidates in small steps. Or add a website or GitHub
                link yourself. Pause sourcing or syncing independently—your
                queue should fit your capacity.
              </p>
            </div>
            <div className="tp-pace-slip">
              <span className="tp-index">EXAMPLE PACE / NOT A LIVE RUN</span>
              <div className="tp-pace-days">
                {["M", "T", "W", "T", "F"].map((day, i) => (
                  <div key={i}>
                    <span>{day}</span>
                    <div>
                      {Array.from({ length: i === 3 ? 0 : 3 }).map((_, j) => (
                        <i key={j} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="tp-pace-footer">
                <span>A queue you can actually review</span>
                <span>
                  <Pause size={13} /> Pause anytime
                </span>
              </div>
            </div>
          </div>
          <div className="tp-method-row">
            <div className="tp-method-number">03</div>
            <div className="tp-method-copy">
              <h3>
                Pick the account.
                <br />
                Review the pitch.
              </h3>
              <p>
                Choose a researched lead to generate its landing page and first
                message. Edit the details, publish the page when ready, and
                review the exact email before sending. LinkedIn and X drafts
                stay ready for manual outreach.
              </p>
            </div>
            <div className="tp-approval-slip">
              <span className="tp-index">
                YOUR NAME IS ON IT. YOUR APPROVAL MATTERS.
              </span>
              <h4>
                Agents prepare.
                <br />
                <em>You approve.</em>
              </h4>
              <span className="tp-approval-stamp">
                PAGE → DRAFT → YOUR CALL
              </span>
            </div>
          </div>
        </section>

        <PricingLedger onInterest={registerInterest} />

        <section className="tp-faq tp-shell" aria-labelledby="faq-title">
          <div>
            <span className="tp-index">06 / BEFORE YOU JOIN</span>
            <h2 id="faq-title">
              Less guesswork.
              <br />
              <em>Clear expectations.</em>
            </h2>
          </div>
          <div>
            {faqs.map(([question, answer], i) => (
              <details key={question}>
                <summary>
                  <span className="tp-faq-index">0{i + 1}</span>
                  {question}
                  <span className="tp-faq-plus">+</span>
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          id="early-access"
          className="tp-access"
          aria-labelledby="access-title"
        >
          <div className="tp-shell tp-access-layout">
            <div>
              <span className="tp-index">07 / THE NEXT STEP IS SMALL</span>
              <h2 id="access-title">
                Stop starting
                <br />
                <em>every pitch from zero.</em>
              </h2>
              <p>
                Your next step is one email—not another project. Join the
                early-access list for access announcements and product updates.
                No setup to finish today.
              </p>
              <span className="tp-access-note">
                No card. No payment today. No messages sent without your review.
              </span>
            </div>
            <form onSubmit={submit}>
              <div className="tp-interest-note">
                {interest
                  ? `Your interest: ${proposedPlans.find(p => p.id === interest)?.name} · proposed plan`
                  : "Your next pitch starts with the right account."}
              </div>
              <label htmlFor="early-access-email">Work email</label>
              <div className="tp-signup-row">
                <input
                  id="early-access-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
                <button
                  className="tp-cta"
                  type="submit"
                  disabled={signup.isPending}
                >
                  {signup.isPending ? "Joining…" : marketing.primaryCta}
                  <ArrowRight size={15} />
                </button>
              </div>
              <label className="tp-consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={e => setConsent(e.target.checked)}
                />
                <span>
                  I agree to receive occasional TailorPitch updates. You can
                  unsubscribe anytime. <Link href="/privacy">Privacy</Link>.
                </span>
              </label>
              <div className="tp-honeypot" aria-hidden="true">
                <label htmlFor="early-access-website">Website</label>
                <input
                  id="early-access-website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                />
              </div>
              <p className="tp-signup-note">
                Email list only. Workspace access is separate. No subscription
                starts. Unsubscribe anytime.
              </p>
            </form>
          </div>
        </section>
      </main>
      <footer className="tp-footer tp-shell">
        <LeadloomWordmark />
        <span>The right account. A relevant pitch. Your voice.</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <button type="button" onClick={() => startLogin()}>
            Log in ↗
          </button>
          <small>© {new Date().getFullYear()} TailorPitch</small>
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
