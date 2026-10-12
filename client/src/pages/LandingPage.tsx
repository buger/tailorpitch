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
import { PitchWorkbench } from "@/components/landing/PitchWorkbench";
import { PricingLedger } from "@/components/landing/PricingLedger";
import { proposedPlans, type ProposedPlanId } from "@shared/pricing";
import "@/components/landing/landing.css";

const faqs = [
  [
    "Is this available to buy?",
    "Not yet. These are proposed monthly plans, not a checkout. Requesting early access adds you to the consented email list. No payment details are collected and no subscription starts.",
  ],
  [
    "What does a credit cover?",
    "The proposed model reserves 1 research credit per researched lead and 10 page credits per personalized page. Focus includes 100 research credits plus 100 page credits, so its 100 researched leads and 10 pages can both be included. Editing saved drafts and preparing outreach drafts are proposed to be included. Credit rollover and extra-credit prices are not finalized.",
  ],
  [
    "Will agents send messages without me?",
    "No. Choose which leads deserve a page, edit the drafts and review the final message before sending. Email can use Gmail or IMAP with SMTP. LinkedIn and X currently provide drafts for manual outreach; automatic social delivery is not enabled.",
  ],
  [
    "Can I control how fast leads arrive?",
    "Yes. Set a daily pace and pause or resume discovery and synchronization independently. Small provider runs feed the pipeline over time rather than dumping a huge batch into your workspace.",
  ],
  [
    "Can it sound and look like my company?",
    "Start with your website. Review real copy snippets, discovered logos, style clues and suggested ICPs. Add your design references, writing voice and instructions. Edit them during onboarding or later in Settings.",
  ],
  [
    "Do I need every integration?",
    "No. You can start with a website or GitHub link and review a researched lead. Apify, Gojiberry and Manus task adapters support connected workflows; they need your authorized accounts. Provider subscriptions or usage charges are separate and are not included in these proposed prices.",
  ],
];
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
    document
      .getElementById(id)
      ?.scrollIntoView({
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
          <a href="#the-work">The work</a>
          <a href="#proof-pilot">For Proof</a>
          <a href="#pricing">Pricing</a>
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
            Request access
            <ArrowRight size={14} />
          </button>
        </div>
      </header>
      <main>
        <section className="tp-hero tp-shell" aria-labelledby="hero-title">
          <div className="tp-hero-kicker">
            <span className="tp-dot" />
            <span>A RESEARCH TEAM. A CREATIVE TEAM. YOUR NEXT PITCH.</span>
          </div>
          <h1 id="hero-title">
            The right lead.
            <br />
            <span className="tp-hero-bottom">
              A pitch <em>just for them.</em>
              <span className="tp-star" aria-hidden="true">
                ✳
              </span>
            </span>
          </h1>
          <div className="tp-hero-description">
            <span className="tp-margin-note">
              01—100
              <br />
              NOT 10,000
            </span>
            <p>
              Find leads that fit. Get the research done. Turn the best ones
              into a personal landing page and outreach draft—without doing it
              all yourself.
            </p>
            <span className="tp-margin-note tp-note-right">
              LESS TAB-HOPPING.
              <br />
              MORE RELEVANCE.
            </span>
          </div>
          <div className="tp-hero-actions">
            <button
              type="button"
              className="tp-cta"
              onClick={() => scrollTo("early-access")}
            >
              Build my next pitch <ArrowRight size={17} />
            </button>
            <button
              type="button"
              className="tp-text-cta"
              onClick={() => scrollTo("the-work")}
            >
              See one take shape <span aria-hidden="true">↓</span>
            </button>
          </div>
          <p className="tp-hero-fineprint">
            Early access · Proposed plans from $99/month · No payment today
          </p>
          <div id="the-work" className="tp-workbench-wrap">
            <div className="tp-workbench-caption">
              <span>FROM A SIGNAL TO SOMETHING WORTH SENDING</span>
              <span className="tp-handwritten">
                Try the steps. Make the call. ↘
              </span>
            </div>
            <PitchWorkbench />
          </div>
          <div className="tp-integrations">
            <span>YOUR WORK. CONNECTED.</span>
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
            <small>Connect your own authorized accounts</small>
          </div>
        </section>

        <section className="tp-not-a-list" aria-labelledby="list-title">
          <div className="tp-shell tp-contrast-layout">
            <div className="tp-contrast-left">
              <span className="tp-index">01 / THE OLD WAY</span>
              <h2 id="list-title">
                Another list.
                <br />
                <em>Another long week.</em>
              </h2>
              <div className="tp-mess" aria-label="Manual prospecting tasks">
                <span>Find a name.</span>
                <span>Open 12 tabs.</span>
                <span>Write from scratch.</span>
                <span>Copy. Paste. Hope.</span>
              </div>
              <p>
                You don't need more names.
                <br />
                You need a reason to start a conversation.
              </p>
            </div>
            <div className="tp-contrast-right">
              <span className="tp-index">02 / THE BETTER BRIEF</span>
              <h2>
                A small queue.
                <br />
                <em>Ready for your judgment.</em>
              </h2>
              <ol>
                <li>
                  <span>01</span>
                  <div>
                    <h3>A lead that fits</h3>
                    <p>Matched to your ICP, with gaps clearly marked.</p>
                  </div>
                  <Check size={18} />
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <h3>The reason behind the fit</h3>
                    <p>Research and source links, not confident guesses.</p>
                  </div>
                  <Check size={18} />
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <h3>A page that makes the case</h3>
                    <p>Your offer, your voice, their context.</p>
                  </div>
                  <Check size={18} />
                </li>
                <li>
                  <span>04</span>
                  <div>
                    <h3>A draft you can stand behind</h3>
                    <p>Email, LinkedIn or X. You decide what goes out.</p>
                  </div>
                  <Check size={18} />
                </li>
              </ol>
            </div>
          </div>
        </section>

        <section className="tp-method tp-shell" aria-labelledby="method-title">
          <div className="tp-section-intro">
            <span className="tp-index">03 / BUILT AROUND YOUR BUSINESS</span>
            <h2 id="method-title">
              You bring the offer.
              <br />
              <em>Agents bring the groundwork.</em>
            </h2>
          </div>
          <div className="tp-method-row">
            <div className="tp-method-number">01</div>
            <div className="tp-method-copy">
              <h3>
                Start with your site.
                <br />
                Not a blank form.
              </h3>
              <p>
                Share your website. Review real copy, discovered logos and
                suggested customer profiles. Add the design references and voice
                that make it yours.
              </p>
            </div>
            <div className="tp-source-slip">
              <span className="tp-index">ONBOARDING / REVIEW FIRST</span>
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
                <strong>Changed by you.</strong>
              </p>
            </div>
          </div>
          <div className="tp-method-row">
            <div className="tp-method-number">02</div>
            <div className="tp-method-copy">
              <h3>
                Set the pace.
                <br />
                Keep the steering wheel.
              </h3>
              <p>
                Run small discovery steps, qualify from evidence, and pick the
                leads worth pursuing. Pause sourcing or synchronization whenever
                you need to.
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
                <span>Small daily queue</span>
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
                Make the pitch specific.
                <br />
                Keep the send human.
              </h3>
              <p>
                Generate a page around the lead's context. Edit it, publish when
                ready, then review the outreach draft and exact recipient. No
                surprise sends.
              </p>
            </div>
            <div className="tp-approval-slip">
              <span className="tp-index">THE FINAL STEP IS YOURS</span>
              <h4>
                Ready for
                <br />
                <em>your review.</em>
              </h4>
              <span className="tp-approval-stamp">
                PAGE → DRAFT → YOUR CALL
              </span>
            </div>
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
              <span className="tp-index">OWNER'S PILOT WORKSPACE</span>
            </div>
            <h2 id="proof-title">
              Built for considered outreach.
              <br />
              <em>Starting with Proof.</em>
            </h2>
            <p>
              The pilot connects Proof's offer, evidence-first voice and visual
              references to the prospecting workflow. The quotes below are
              generated draft positioning for Proof's approval—not verified
              customer statements.
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
                <strong>Draft for Proof approval</strong>
                <span>Not a verified testimonial</span>
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
                <strong>Draft for Proof approval</strong>
                <span>Not a verified testimonial</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <PricingLedger onInterest={registerInterest} />

        <section className="tp-faq tp-shell" aria-labelledby="faq-title">
          <div>
            <span className="tp-index">
              05 / THE SMALL PRINT, IN PLAIN LANGUAGE
            </span>
            <h2 id="faq-title">
              Good questions.
              <br />
              <em>Clear answers.</em>
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
              <span className="tp-index">
                YOUR NEXT GOOD CONVERSATION STARTS HERE
              </span>
              <h2 id="access-title">
                Less prospecting.
                <br />
                <em>More personal.</em>
              </h2>
              <p>
                Get on the early-access list. Bring your website.
                <br />
                We'll help you give the next pitch a reason.
              </p>
              <span className="tp-access-note">
                No card. No automatic outreach. No billing enabled.
              </span>
            </div>
            <form onSubmit={submit}>
              <div className="tp-interest-note">
                {interest
                  ? `Your interest: ${proposedPlans.find(p => p.id === interest)?.name} · indicative pricing only`
                  : "A considered pipeline. Not another contact dump."}
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
                  {signup.isPending ? "Joining…" : "Request early access"}
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
                Requesting access does not enroll you in a plan.
              </p>
            </form>
          </div>
        </section>
      </main>
      <footer className="tp-footer tp-shell">
        <LeadloomWordmark />
        <span>Find the right fit. Make it personal.</span>
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
