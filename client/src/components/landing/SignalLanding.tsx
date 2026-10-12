import {
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  CheckCheck,
  ChevronRight,
  Fingerprint,
  Flag,
  Globe2,
  Layers3,
  Link2,
  Mail,
  Pause,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { marketing } from "@shared/marketing";
import { proposedPlans } from "@shared/pricing";
import { startLogin } from "@/const";
import { api } from "@/components/leadloom-types";
import { SignalField } from "./SignalField";
import { TailorPitchWordmark } from "@/components/TailorPitchWordmark";
import "./signal.css";

const icons = [Fingerprint, Target, Search, SlidersHorizontal, Layers3, Mail];

function Wordmark() {
  return <TailorPitchWordmark className="signal-wordmark" />;
}

function SignupForm() {
  const id = useId();
  const signup = api.public.signup.useMutation();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent || signup.isPending) return;
    try {
      await signup.mutateAsync({ email, consent: true, website });
      setDone(true);
      setEmail("");
      setConsent(false);
    } catch {
      /* The mutation error is displayed beside the form. */
    }
  }
  if (done)
    return (
      <div className="signal-success" role="status">
        <CheckCheck size={28} />
        <h3>You’re on the list.</h3>
        <p>
          We’ll email you about access and product updates. No subscription has
          started.
        </p>
      </div>
    );
  return (
    <form
      className="signal-signup"
      onSubmit={submit}
      aria-label="Early-access signup"
    >
      <label htmlFor={`${id}-email`}>Work email</label>
      <div className="signal-input-row">
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          aria-describedby={signup.error ? `${id}-error` : undefined}
        />
        <button
          className="signal-button"
          disabled={signup.isPending}
          type="submit"
        >
          {signup.isPending ? "Joining…" : marketing.primaryCta}
          <ArrowRight size={16} />
        </button>
      </div>
      <label className="signal-consent">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={e => setConsent(e.target.checked)}
        />
        <span>
          I agree to occasional TailorPitch updates. Unsubscribe anytime.{" "}
          <Link href="/privacy">Privacy</Link>.
        </span>
      </label>
      <div className="signal-honeypot" aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={e => setWebsite(e.target.value)}
        />
      </div>
      {signup.error && (
        <p className="signal-error" id={`${id}-error`} role="alert">
          {signup.error.message ||
            "We couldn’t save your email. Please try again."}
        </p>
      )}
      <p className="signal-form-note">
        Email list only. Workspace access is separate. No card or subscription.
      </p>
    </form>
  );
}

function OfferPanel() {
  return (
    <div className="signal-offer-panel">
      <div className="signal-url">
        <Globe2 size={14} />
        your-company.com
        <ArrowUpRight size={13} />
      </div>
      <div className="signal-panel-meta">
        <Sparkles size={12} /> WEBSITE ANALYSIS
      </div>
      <h4>Your offer, understood.</h4>
      <p>Release evidence that stays connected to every software change.</p>
      <div className="signal-brand-chips">
        <span>Clear & direct voice</span>
        <span>Your brand</span>
      </div>
    </div>
  );
}
function IcpPanel() {
  return (
    <div className="signal-icp-panel">
      <div className="signal-panel-meta">
        <Target size={13} /> SUGGESTED CUSTOMER PROFILE
      </div>
      <h4>Teams your offer fits.</h4>
      <dl>
        <div>
          <dt>Industry</dt>
          <dd>B2B software</dd>
        </div>
        <div>
          <dt>Buyer</dt>
          <dd>Platform leaders</dd>
        </div>
        <div>
          <dt>Signal</dt>
          <dd>Engineering hiring</dd>
        </div>
      </dl>
      <span className="signal-small-note">Review and refine before saving</span>
    </div>
  );
}
function ProspectPanel() {
  return (
    <div className="signal-prospect-panel">
      <div className="signal-company">
        <span className="signal-company-mark">N</span>
        <div>
          <strong>Northstar</strong>
          <span>Example software company</span>
        </div>
        <span className="signal-badge">Research ready</span>
      </div>
      <div className="signal-fit">
        <div>
          <span>Industry fit</span>
          <span>
            <Check size={12} /> Matches
          </span>
        </div>
        <div>
          <span>Engineering hiring</span>
          <span>
            <Check size={12} /> Source found
          </span>
        </div>
        <div>
          <span>Company size</span>
          <span className="signal-unknown">Unknown</span>
        </div>
      </div>
      <div className="signal-source-link">
        <Link2 size={12} />
        northstar.example / careers
      </div>
      <div className="signal-select">
        <CheckCheck size={14} />
        You choose who gets a pitch.
      </div>
    </div>
  );
}
function PitchPanel() {
  return (
    <div className="signal-pitch-panel">
      <div className="signal-browser-bar">
        <span>
          <i />
          <i />
          <i />
        </span>
        <span>
          <Layers3 size={11} /> Personal page preview
        </span>
      </div>
      <div className="signal-page-inner">
        <div className="signal-page-brand">
          <span>
            <span aria-hidden="true">✳</span> YOUR COMPANY
          </span>
          <small>FOR NORTHSTAR</small>
        </div>
        <div className="signal-page-composition">
          <img
            className="signal-architecture"
            src="/images/signal-architecture.jpg"
            alt=""
            width="1254"
            height="1254"
          />
          <div className="signal-page-copy">
            <h4>
              A clearer trail
              <br /> for every release.
            </h4>
            <div className="signal-proposal-detail">
              <Building2 size={17} />
              <div>
                <strong>Your context</strong>
                <p>
                  A growing platform team.
                  <br /> More changes to keep track of.
                </p>
              </div>
            </div>
            <div className="signal-proposal-detail">
              <Layers3 size={17} />
              <div>
                <strong>Our approach</strong>
                <p>
                  Keep release evidence
                  <br /> connected to the work.
                </p>
              </div>
            </div>
            <div className="signal-proposal-detail">
              <Flag size={17} />
              <div>
                <strong>A place to start</strong>
                <p>
                  A focused pilot.
                  <br /> One team, one shared goal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function OutreachPanel({ full = false }: { full?: boolean }) {
  return (
    <div className={`signal-outreach-panel ${full ? "is-full" : ""}`}>
      <div>
        <Mail size={15} />
        <span>A first message in your voice</span>
        <span className="signal-draft">DRAFT</span>
      </div>
      {full && (
        <>
          <p className="signal-mail-subject">
            A starting point for your platform team
          </p>
          <p>Hi there,</p>
          <p>
            I saw that Northstar is hiring platform engineers. If keeping
            release evidence together is becoming harder as the team grows, I
            put together a proposed starting point for one team.
          </p>
          <span className="signal-mail-link">
            <Link2 size={13} />
            Your personalized page link
          </span>
          <p>Would this be useful to explore?</p>
        </>
      )}
      <p>
        {full
          ? "Review the exact message before sending."
          : "Research → personal page → a relevant introduction."}
      </p>
    </div>
  );
}

function DiscoveryPreview() {
  return (
    <div className="signal-discovery-preview">
      <div className="signal-card signal-source-stack">
        {[
          {
            icon: Search,
            name: "Connected discovery",
            detail: "Apify · Gojiberry · Manus",
          },
          {
            icon: Link2,
            name: "Website or GitHub",
            detail: "Bring a company link",
          },
          {
            icon: Plus,
            name: "Add a lead manually",
            detail: "Start with what you know",
          },
        ].map(({ icon: Icon, name, detail }) => (
          <div className="signal-source-tile" key={name}>
            <Icon size={18} strokeWidth={1.4} />
            <div>
              <strong>{name}</strong>
              <span>{detail}</span>
            </div>
            <ChevronRight size={12} />
          </div>
        ))}
      </div>
      <div className="signal-card signal-candidate-list">
        <strong>Your shortlist</strong>
        {["Northstar", "Arcwell", "Forma", "Meridian"].map((name, i) => (
          <div className="signal-candidate" key={name}>
            <span>
              <Building2 size={12} />
            </span>
            <div>
              <span>{name}</span>
              <i style={{ width: `${58 - i * 7}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DraftPreview() {
  return (
    <div className="signal-card signal-draft-card">
      <div className="signal-draft-heading">
        <Mail size={18} strokeWidth={1.4} />
        <strong>A message in your voice</strong>
      </div>
      <div className="signal-draft-body">
        <p>Hi there —</p>
        <p>
          I saw Northstar is growing its platform team. I put together a
          starting point for keeping release evidence connected as you scale.
        </p>
        <p>Would this be useful to explore?</p>
      </div>
      <div className="signal-draft-link">
        <Link2 size={16} />
        <span>Personal page link</span>
        <ArrowUpRight size={14} />
      </div>
      <div className="signal-review-message">
        <Send size={16} />
        <span>Review before sending</span>
      </div>
    </div>
  );
}

function PipelineOverview() {
  const [mobilePanel, setMobilePanel] = useState(0);
  const [paused, setPaused] = useState(false);
  const stages = [
    {
      number: "01",
      name: "Find",
      description: "Bring in leads from your chosen sources.",
      className: "signal-discovery-stage",
      preview: <DiscoveryPreview />,
    },
    {
      number: "02",
      name: "Qualify",
      description: "Understand the fit before you make a move.",
      className: "signal-qualification-stage",
      preview: (
        <div className="signal-card signal-qualification-card">
          <h4>Why this company fits</h4>
          <ProspectPanel />
        </div>
      ),
    },
    {
      number: "03",
      name: "Personal page",
      description: "A tailored proposal for the leads you choose.",
      className: "signal-page-stage",
      preview: (
        <div className="signal-card signal-output-card">
          <PitchPanel />
        </div>
      ),
    },
    {
      number: "04",
      name: "Outreach",
      description: "A personal first message, ready for your review.",
      className: "signal-outreach-stage",
      preview: <DraftPreview />,
    },
  ];
  return (
    <div className="signal-overview">
      <div
        className="signal-foundation"
        aria-label="Business setup before lead sourcing"
      >
        <span className="signal-foundation-intro">
          FIRST, SET UP YOUR BUSINESS
        </span>
        <div>
          <Globe2 size={15} />
          <span>Analyze your offer</span>
        </div>
        <ArrowRight className="signal-foundation-arrow" size={15} />
        <div>
          <Target size={15} />
          <span>Define your ideal customers</span>
        </div>
      </div>
      <p className="signal-pipeline-intro">
        THEN, YOUR FOUR-STEP LEAD PIPELINE
      </p>
      <div
        className="signal-mobile-switch"
        role="group"
        aria-label="Workflow preview"
      >
        {stages.map((stage, i) => (
          <button
            key={stage.number}
            type="button"
            aria-pressed={mobilePanel === i}
            onClick={() => setMobilePanel(i)}
          >
            {stage.name}
          </button>
        ))}
      </div>
      <div className="signal-scene">
        <SignalField paused={paused} />
        {stages.map((stage, i) => (
          <div
            className={`signal-scene-column ${stage.className}`}
            data-mobile-active={mobilePanel === i}
            key={stage.number}
          >
            <div className="signal-column-heading">
              <span>{stage.number}</span>
              <div>
                <h3>{stage.name}</h3>
                <p>{stage.description}</p>
              </div>
            </div>
            {stage.preview}
          </div>
        ))}
      </div>
      <div className="signal-overview-bottom">
        <span>Illustrative workflow · fictional companies</span>
        <button
          type="button"
          className="signal-motion-control"
          onClick={() => setPaused(!paused)}
          aria-pressed={paused}
        >
          {paused ? <Play size={12} /> : <Pause size={12} />}
          {paused ? "Play animation" : "Pause animation"}
        </button>
      </div>
    </div>
  );
}

function SourcePreview() {
  const [source, setSource] = useState(0);
  const sources = [
    {
      name: "Connected discovery",
      icon: Search,
      title: "Let your sources bring in candidates.",
      detail:
        "Use included Apify sourcing, or connect Gojiberry or Manus with your own authorized account. Set your profile, instructions and daily pace.",
      sample: "Discovery source",
      value: "Your connected provider",
    },
    {
      name: "Website or GitHub",
      icon: Link2,
      title: "Already have a company in mind?",
      detail:
        "Add a public company website or GitHub link. Research its context and assess the fit against your selected profile.",
      sample: "Company link",
      value: "https://northstar.example",
    },
    {
      name: "Manual entry",
      icon: Plus,
      title: "Bring a lead you found yourself.",
      detail:
        "Add the company and the details you know. Keep it in the same workspace for research and qualification.",
      sample: "Company name",
      value: "Northstar",
    },
  ];
  const selected = sources[source];
  return (
    <div className="signal-source-preview">
      <div
        className="signal-source-options"
        role="group"
        aria-label="Example lead intake methods"
      >
        {sources.map((s, i) => (
          <button
            key={s.name}
            type="button"
            aria-pressed={source === i}
            onClick={() => setSource(i)}
          >
            <s.icon size={15} />
            {s.name}
            <ChevronRight size={13} />
          </button>
        ))}
      </div>
      <div className="signal-source-detail">
        <h4>{selected.title}</h4>
        <p>{selected.detail}</p>
        <div className="signal-example-field">
          <span>{selected.sample}</span>
          <strong>{selected.value}</strong>
        </div>
        <small>Example only · no provider is connected here</small>
      </div>
    </div>
  );
}

function FlowExplorer() {
  const [step, setStep] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function onKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (index + 1) % 6;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index + 5) % 6;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 5;
    else return;
    event.preventDefault();
    setStep(next);
    buttons.current[next]?.focus();
  }
  const current = marketing.steps[step];
  const Icon = icons[step];
  return (
    <section
      id="the-work"
      className="signal-section signal-shell"
      aria-labelledby="workflow-title"
    >
      <div className="signal-section-heading">
        <span className="signal-eyebrow">THE COMPLETE WORKFLOW</span>
        <h2 id="workflow-title">
          Your offer. Their context. A better conversation.
        </h2>
        <p>
          From understanding your business to preparing a personal pitch. Every
          step builds on the one before it.
        </p>
      </div>
      <div
        className="signal-step-tabs"
        role="tablist"
        aria-label="The six steps of TailorPitch"
      >
        {marketing.steps.map((s, i) => (
          <button
            key={s.id}
            ref={el => {
              buttons.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`step-${s.id}`}
            aria-controls="signal-step-panel"
            aria-selected={step === i}
            tabIndex={step === i ? 0 : -1}
            onKeyDown={e => onKey(e, i)}
            onClick={() => setStep(i)}
          >
            <span>0{i + 1}</span>
            {s.label}
          </button>
        ))}
      </div>
      <div
        className="signal-explorer"
        id="signal-step-panel"
        role="tabpanel"
        aria-labelledby={`step-${current.id}`}
        tabIndex={0}
      >
        <div className="signal-explorer-copy" key={current.id}>
          <Icon size={25} strokeWidth={1.4} />
          <span className="signal-eyebrow">STEP 0{step + 1} / 06</span>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
          <div className="signal-output-label">
            <CheckCheck size={16} />
            <span>{current.output}</span>
          </div>
          <button
            type="button"
            className="signal-text-button"
            onClick={() => {
              const next = (step + 1) % 6;
              setStep(next);
              buttons.current[next]?.focus({ preventScroll: true });
            }}
          >
            {step === 5 ? "Back to the beginning" : "Next step"}
            <ArrowRight size={15} />
          </button>
        </div>
        <div className={`signal-explorer-preview is-${current.id}`}>
          <div className="signal-example-label">ILLUSTRATIVE EXAMPLE</div>
          {step === 0 && <OfferPanel />}
          {step === 1 && <IcpPanel />}
          {step === 2 && <SourcePreview />}
          {step === 3 && <ProspectPanel />}
          {step === 4 && <PitchPanel />}
          {step === 5 && <OutreachPanel full />}
        </div>
      </div>
    </section>
  );
}

export default function SignalLanding() {
  const dialog = useRef<HTMLDialogElement>(null);
  const join = () => {
    dialog.current?.showModal();
    dialog.current
      ?.querySelector<HTMLInputElement>('input[type="email"]')
      ?.focus({ preventScroll: true });
  };
  return (
    <div className="signal-landing">
      <a className="signal-skip" href="#main-content">
        Skip to content
      </a>
      <header className="signal-header">
        <div className="signal-shell signal-header-inner">
          <Link href="/" aria-label="TailorPitch home">
            <Wordmark />
          </Link>
          <nav aria-label="Primary navigation">
            <a href="#the-work">How it works</a>
            <a href="#your-sources">Your sources</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="signal-header-actions">
            <button
              type="button"
              className="signal-login"
              onClick={() => startLogin()}
            >
              Log in
              <ArrowUpRight size={12} />
            </button>
          </div>
        </div>
      </header>
      <main id="main-content">
        <section
          className="signal-hero signal-shell"
          aria-labelledby="hero-title"
        >
          <div className="signal-hero-copy">
            <div className="signal-hero-kicker">
              <span className="signal-live-dot" />
              {marketing.audience}
            </div>
            <h1 id="hero-title" aria-label={marketing.headline.join(" ")}>
              {marketing.headline[0]}
              <br /> {marketing.headline[1]}
            </h1>
            <p className="signal-hero-description">{marketing.description}</p>
            <div className="signal-hero-actions">
              <button type="button" className="signal-button" onClick={join}>
                {marketing.primaryCta}
                <ArrowRight size={17} />
              </button>
              <a className="signal-secondary" href="#the-work">
                {marketing.secondaryCta}
                <ArrowDown size={15} />
              </a>
            </div>
            <p className="signal-hero-note">
              Early-access email list · No card required
            </p>
          </div>
          <PipelineOverview />
        </section>
        <FlowExplorer />
        <section
          id="your-sources"
          className="signal-sources-section"
          aria-labelledby="sources-title"
        >
          <div className="signal-shell signal-sources-layout">
            <div>
              <span className="signal-eyebrow">YOUR SOURCES. YOUR PACE.</span>
              <h2 id="sources-title">
                Start where your
                <br /> best leads come from.
              </h2>
              <p>
                Let connected tools discover companies, bring a link, or add a
                lead yourself. Every path leads to the same research and
                qualification workflow.
              </p>
              <p className="signal-source-fees">
                Apify sourcing is included. Optional Gojiberry and Manus
                connections use your own accounts; their fees are separate.
              </p>
            </div>
            <div className="signal-intake-list">
              <div>
                <Search size={21} />
                <div>
                  <h3>Connected discovery</h3>
                  <p>Apify · Gojiberry · Manus</p>
                </div>
                <ArrowUpRight size={16} />
              </div>
              <div>
                <Link2 size={21} />
                <div>
                  <h3>A website or GitHub link</h3>
                  <p>Research a company you already have in mind.</p>
                </div>
                <ArrowUpRight size={16} />
              </div>
              <div>
                <Plus size={21} />
                <div>
                  <h3>Leads you add yourself</h3>
                  <p>Your own finds, in the same workspace.</p>
                </div>
                <ArrowUpRight size={16} />
              </div>
              <div className="signal-pace">
                <Pause size={13} />
                Set a daily limit. Pause sourcing when you need to.
              </div>
            </div>
          </div>
        </section>
        <section
          className="signal-founder signal-shell"
          id="proof-pilot"
          aria-label="The approach behind TailorPitch"
        >
          <span className="signal-eyebrow">THE REASON WE’RE BUILDING THIS</span>
          <blockquote>
            “We don't need another thousand names. We need a clear reason to
            speak to the right team.”
          </blockquote>
          <div className="signal-founder-bottom">
            <p>
              <strong>Leonid Bugaev</strong>
              <span>Owner, Proof</span>
            </p>
            <details>
              <summary>
                More on the approach <Plus size={12} />
              </summary>
              <blockquote>
                “The pitch should feel like Proof. The context should make it
                clear why this team, and why this conversation.”
              </blockquote>
              <p>Leonid Bugaev · Owner, Proof</p>
            </details>
          </div>
        </section>
        <section
          id="pricing"
          className="signal-section signal-shell"
          aria-labelledby="pricing-title"
        >
          <div className="signal-section-heading signal-pricing-heading">
            <div>
              <span className="signal-eyebrow">PROPOSED MONTHLY PLANS</span>
              <h2 id="pricing-title">
                One workflow.
                <br /> <span>A manageable shortlist.</span>
              </h2>
            </div>
            <p>
              Research more companies. Make a personal approach to the ones you
              choose.
            </p>
          </div>
          <div className="signal-plans">
            {proposedPlans.map((p, i) => (
              <article
                className={`signal-plan ${i === 0 ? "is-featured" : ""}`}
                key={p.id}
              >
                <div className="signal-plan-top">
                  <h3>{p.name}</h3>
                  <span>
                    {i === 0
                      ? "A focused start"
                      : i === 1
                        ? "A growing pipeline"
                        : "More room to prospect"}
                  </span>
                </div>
                <div className="signal-plan-price">
                  ${p.price}
                  <span>/ month</span>
                </div>
                <div className="signal-allowances">
                  <p>
                    <strong>{p.researchedLeads}</strong> researched leads
                  </p>
                  <p>
                    <strong>{p.personalizedPages}</strong> personalized pages
                  </p>
                </div>
                <button
                  type="button"
                  className={i === 0 ? "signal-button" : "signal-secondary"}
                  onClick={join}
                >
                  {marketing.primaryCta}
                  <ArrowRight size={15} />
                </button>
              </article>
            ))}
          </div>
          <div className="signal-plan-included">
            <span>THE WHOLE WORKFLOW IN EVERY PROPOSED PLAN</span>
            <p>
              <Check size={13} />
              Offer & ICP setup
            </p>
            <p>
              <Check size={13} />
              Source-backed research
            </p>
            <p>
              <Check size={13} />
              Editable pages
            </p>
            <p>
              <Check size={13} />
              Outreach drafts
            </p>
          </div>
          <p className="signal-pricing-note">
            Proposed plans, not available to purchase yet. Final prices and
            allowances may change. Optional third-party fees are separate. No
            card. No payment today.
          </p>
          <details className="signal-credit-details">
            <summary>
              How the proposed allowances work <Plus size={13} />
            </summary>
            <p>
              Both research and page allowances are included, with separate
              allocations: 1 credit per researched lead and 10 per personalized
              page. Focus includes 100 research credits plus 100 page credits.
              Saved-draft editing and outreach drafts are proposed to be
              included; rollover and extra-credit pricing are not finalized.
            </p>
          </details>
        </section>
        <section
          className="signal-faq signal-shell"
          id="questions"
          aria-labelledby="faq-title"
        >
          <div>
            <span className="signal-eyebrow">A FEW THINGS TO KNOW</span>
            <h2 id="faq-title">
              Before you
              <br /> jump in.
            </h2>
          </div>
          <div>
            {marketing.faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Plus size={16} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          id="early-access"
          className="signal-access"
          aria-labelledby="access-title"
        >
          <div className="signal-shell signal-access-inner">
            <div>
              <span className="signal-eyebrow">
                YOUR NEXT CONVERSATION STARTS HERE
              </span>
              <h2 id="access-title">
                Build a pipeline
                <br /> with a personal touch.
              </h2>
              <p>
                From understanding your offer to preparing the pitch. Join the
                list for access announcements and product updates.
              </p>
            </div>
            <SignupForm />
          </div>
        </section>
      </main>
      <footer className="signal-footer signal-shell">
        <Link href="/" aria-label="TailorPitch home">
          <Wordmark />
        </Link>
        <span>Your offer. The right people. A relevant conversation.</span>
        <div>
          <Link href="/privacy">Privacy</Link>
          <small>© {new Date().getFullYear()} TailorPitch</small>
        </div>
      </footer>
      <dialog
        ref={dialog}
        className="signal-dialog"
        aria-labelledby="signup-title"
        onClick={e => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="signal-dialog-inner">
          <button
            type="button"
            className="signal-close"
            aria-label="Close signup"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
          <span className="signal-eyebrow">EARLY ACCESS</span>
          <h2 id="signup-title">Be part of what’s next.</h2>
          <p>
            Get access announcements and product updates. Joining the list
            doesn’t create a workspace or subscription.
          </p>
          <SignupForm />
        </div>
      </dialog>
    </div>
  );
}
