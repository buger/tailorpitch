import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  FileText,
  Globe2,
  Info,
  Layers3,
  Linkedin,
  LockKeyhole,
  Mail,
  MousePointer2,
  PenLine,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";
import "./workbench.css";

const STAGES = [
  { id: "find", label: "Find", note: "signal", number: "01" },
  { id: "qualify", label: "Qualify", note: "brief", number: "02" },
  { id: "select", label: "Select", note: "approval", number: "03" },
  { id: "page", label: "Page", note: "page", number: "04" },
  { id: "outreach", label: "Outreach", note: "draft", number: "05" },
] as const;

type StageId = (typeof STAGES)[number]["id"];
type OutreachChannel = "email" | "linkedin" | "x";

export interface PitchWorkbenchProps {
  /** Called after the local demo is reset; no product data is changed. */
  onReplay?: () => void;
}

const stageDescriptions: Record<StageId, string> = {
  find: "Start with a public signal so the pitch has a real reason behind it.",
  qualify:
    "See the fit, sources and unanswered questions without rebuilding the research.",
  select: "Choose the account worth a personal page. Skip the rest.",
  page: "Turn the approved context into a page that connects your offer to this account.",
  outreach:
    "Start with a relevant first message, not a blank screen. Nothing is sent here.",
};

const checksByStage: Record<StageId, string[]> = {
  find: [
    "Signal is observable in the example source",
    "Company identity is clearly fictional",
    "No outreach has been created",
  ],
  qualify: [
    "Reason stays tied to the observed signal",
    "Unknowns remain visible to the owner",
    "Fit is illustrative, not measured",
  ],
  select: [
    "Owner can choose the lead locally",
    "Approval is explicit and reversible",
    "No lead record is written by this demo",
  ],
  page: [
    "Page uses approved context only",
    "Draft remains private and editable",
    "No page is generated or published",
  ],
  outreach: [
    "Channel copy is editable before review",
    "Recipient and provider are unspecified",
    "Nothing is sent from this workbench",
  ],
};

const sourceSnippets = [
  {
    label: "Example evidence 01",
    source: "northstar.example / careers",
    quote: "Hiring platform engineers",
  },
  {
    label: "Example evidence 02",
    source: "northstar.example / engineering",
    quote: "Release evidence needs to scale with changes",
  },
];

function StageIcon({ stage }: { stage: StageId }) {
  if (stage === "find") return <Search aria-hidden="true" />;
  if (stage === "qualify") return <FileText aria-hidden="true" />;
  if (stage === "select") return <MousePointer2 aria-hidden="true" />;
  if (stage === "page") return <Layers3 aria-hidden="true" />;
  return <Send aria-hidden="true" />;
}

function PaperLabel({ children }: { children: React.ReactNode }) {
  return <span className="pitch-workbench__paper-label">{children}</span>;
}

function SourceSnippet({
  label,
  source,
  quote,
}: (typeof sourceSnippets)[number]) {
  return (
    <div className="pitch-workbench__source-snippet">
      <div className="pitch-workbench__source-meta">
        <span>{label}</span>
        <span className="pitch-workbench__source-dot" aria-hidden="true" />
        <span>{source}</span>
      </div>
      <p>“{quote}”</p>
    </div>
  );
}

function FindStage() {
  return (
    <div className="pitch-workbench__stage-content pitch-workbench__stage-content--find">
      <div className="pitch-workbench__signal-sheet">
        <div className="pitch-workbench__sheet-head">
          <PaperLabel>Observed demo signal</PaperLabel>
          <span className="pitch-workbench__sheet-index">N / 014</span>
        </div>
        <div className="pitch-workbench__signal-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <h3>Hiring platform engineers</h3>
        <p className="pitch-workbench__sheet-copy">
          A public hiring post gives you something specific to investigate. Keep
          the source beside the lead instead of guessing their intent.
        </p>
        <div className="pitch-workbench__signal-foot">
          <span>
            <Globe2 aria-hidden="true" /> northstar.example
          </span>
          <span className="pitch-workbench__status-dot">
            <Circle aria-hidden="true" /> captured locally
          </span>
        </div>
      </div>
      <div className="pitch-workbench__source-stack">
        {sourceSnippets.map(snippet => (
          <SourceSnippet key={snippet.label} {...snippet} />
        ))}
      </div>
    </div>
  );
}

function QualifyStage() {
  return (
    <div className="pitch-workbench__stage-content pitch-workbench__stage-content--qualify">
      <div className="pitch-workbench__brief-sheet">
        <div className="pitch-workbench__sheet-head">
          <PaperLabel>Source-grounded brief</PaperLabel>
          <span className="pitch-workbench__status-chip pitch-workbench__status-chip--olive">
            in review
          </span>
        </div>
        <div className="pitch-workbench__brief-grid">
          <div className="pitch-workbench__brief-block pitch-workbench__brief-block--wide">
            <span className="pitch-workbench__field-label">Working reason</span>
            <p>Release evidence needs to scale with changes.</p>
          </div>
          <div className="pitch-workbench__brief-block">
            <span className="pitch-workbench__field-label">Profile</span>
            <p>B2B devtools</p>
          </div>
          <div className="pitch-workbench__brief-block">
            <span className="pitch-workbench__field-label">Fit</span>
            <p>
              <strong>82</strong> <em>illustrative</em>
            </p>
          </div>
        </div>
        <div className="pitch-workbench__unknowns">
          <span className="pitch-workbench__field-label">Still unknown</span>
          <span className="pitch-workbench__unknown-pill">team size</span>
          <span className="pitch-workbench__unknown-pill">
            current workflow
          </span>
          <span className="pitch-workbench__unknown-pill">owner</span>
        </div>
        <p className="pitch-workbench__not-measured">
          <Info aria-hidden="true" /> Fit is illustrative 82, not a measured
          score or claim about Northstar Labs.
        </p>
      </div>
      <div className="pitch-workbench__qualify-note">
        <span className="pitch-workbench__qualify-note-mark" aria-hidden="true">
          02
        </span>
        <p>
          Get a reason to consider the account—and the gaps you still need to
          check. A score should guide your review, not replace it.
        </p>
      </div>
    </div>
  );
}

function SelectStage({
  selected,
  onToggle,
}: {
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="pitch-workbench__stage-content pitch-workbench__stage-content--select">
      <div className="pitch-workbench__selection-sheet">
        <div className="pitch-workbench__sheet-head">
          <PaperLabel>Owner selection</PaperLabel>
          <span className="pitch-workbench__sheet-index">
            one lead / one choice
          </span>
        </div>
        <div className="pitch-workbench__candidate-row">
          <div className="pitch-workbench__candidate-avatar" aria-hidden="true">
            NL
          </div>
          <div>
            <h3>Northstar Labs</h3>
            <p>B2B devtools · northstar.example</p>
          </div>
          <span className="pitch-workbench__candidate-state">
            {selected ? "approved" : "review"}
          </span>
        </div>
        <div className="pitch-workbench__fit-row">
          <div>
            <span className="pitch-workbench__field-label">
              Illustrative fit
            </span>
            <strong>82</strong>
          </div>
          <div className="pitch-workbench__fit-bar" aria-hidden="true">
            <span style={{ width: "82%" }} />
          </div>
          <span className="pitch-workbench__fit-note">not measured</span>
        </div>
        <div className="pitch-workbench__selection-reason">
          <span className="pitch-workbench__field-label">
            Reason to consider
          </span>
          <p>Release evidence needs to scale with changes.</p>
        </div>
        <button
          type="button"
          className={`pitch-workbench__approve-button${selected ? " is-selected" : ""}`}
          aria-pressed={selected}
          onClick={onToggle}
        >
          {selected ? (
            <Check aria-hidden="true" />
          ) : (
            <MousePointer2 aria-hidden="true" />
          )}
          {selected ? "Demo lead approved" : "Approve demo lead"}
          <span>{selected ? "local only" : "for the next stage"}</span>
        </button>
      </div>
      <div className="pitch-workbench__selection-aside">
        <div className="pitch-workbench__selection-rule" aria-hidden="true" />
        <PaperLabel>Human boundary</PaperLabel>
        <p>
          Save the page work for accounts you actually want to pursue. Approving
          this fictional lead shows the next step; it does not change your
          database.
        </p>
      </div>
    </div>
  );
}

function PageStage({ selected }: { selected: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="pitch-workbench__stage-content pitch-workbench__stage-content--page">
      <div className="pitch-workbench__page-preview">
        <div className="pitch-workbench__page-topline">
          <span className="pitch-workbench__proof-mark">Proof</span>
          <span>Prepared for Northstar Labs</span>
          <span className="pitch-workbench__page-private">
            <LockKeyhole aria-hidden="true" /> private draft
          </span>
        </div>
        <div className="pitch-workbench__page-rule" />
        <div className="pitch-workbench__page-kicker">
          A considered starting point
        </div>
        <h3>
          Ship the change.
          <br />
          Keep the proof.
        </h3>
        <p>
          A lightweight way to keep release context close to the work as your
          platform team grows.
        </p>
        <div className="pitch-workbench__page-actions">
          <button
            type="button"
            disabled={!selected}
            onClick={() => setExpanded(value => !value)}
          >
            {selected
              ? expanded
                ? "Collapse page example"
                : "Expand page example"
              : "Approve lead to open"}
            <ArrowRight aria-hidden="true" />
          </button>
          <span>Illustrative page copy · not published</span>
        </div>
        {expanded && (
          <div
            className="pitch-workbench__page-expanded"
            style={{
              borderTop: "1px solid #ffffff30",
              marginTop: 20,
              paddingTop: 18,
            }}
          >
            <h4 style={{ fontFamily: "Georgia,serif", fontSize: 23 }}>
              A scoped place to start.
            </h4>
            <p>
              Review one release pathway, connect its intent to evidence, then
              decide whether the approach earns a broader pilot.
            </p>
            <p style={{ fontSize: 10 }}>
              Illustrative proposal only · No customer relationship or verified
              outcome.
            </p>
          </div>
        )}
        <div className="pitch-workbench__page-footer">
          <span>Proof / context proposal</span>
          <span>northstar.example</span>
        </div>
      </div>
      <div className="pitch-workbench__page-note">
        <PaperLabel>A pitch they can review</PaperLabel>
        <p>
          The page is a private proposal from Proof. It is not an endorsement by
          the prospect and cannot be published from this demo.
        </p>
      </div>
    </div>
  );
}

const outreachCopy: Record<
  OutreachChannel,
  { label: string; icon: React.ReactNode; subject?: string; body: string }
> = {
  email: {
    label: "Email",
    icon: <Mail aria-hidden="true" />,
    subject: "A thought on your evidence trail",
    body: "Hi Northstar team — noticed you’re hiring platform engineers. When release context grows with the system, proof can become the slowest part of a review. We sketched a small way to keep evidence close to the change. Worth comparing notes?",
  },
  linkedin: {
    label: "LinkedIn",
    icon: <Linkedin aria-hidden="true" />,
    body: "Saw Northstar is hiring platform engineers. We’re exploring how devtools teams keep release evidence useful as the system changes. I put together a small context-first idea — open to a quick look?",
  },
  x: {
    label: "X",
    icon: (
      <span aria-hidden="true" className="pitch-workbench__x-glyph">
        X
      </span>
    ),
    body: "Northstar is scaling its platform team — a good moment to keep the proof close to each change. We drafted a small idea for the handoff between shipping and review.",
  },
};

function OutreachStage() {
  const [channel, setChannel] = useState<OutreachChannel>("email");
  const draft = outreachCopy[channel];

  return (
    <div className="pitch-workbench__stage-content pitch-workbench__stage-content--outreach">
      <div className="pitch-workbench__outreach-sheet">
        <div className="pitch-workbench__sheet-head">
          <PaperLabel>Outreach draft</PaperLabel>
          <span className="pitch-workbench__status-chip pitch-workbench__status-chip--rust">
            not sent
          </span>
        </div>
        <div
          className="pitch-workbench__channel-tabs"
          role="tablist"
          aria-label="Draft channel"
        >
          {(Object.keys(outreachCopy) as OutreachChannel[]).map(item => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={channel === item}
              className={channel === item ? "is-active" : ""}
              onClick={() => setChannel(item)}
            >
              {outreachCopy[item].icon}
              {outreachCopy[item].label}
            </button>
          ))}
        </div>
        <div className="pitch-workbench__draft-meta">
          <span>To: contact not specified</span>
          <span>Provider: not connected</span>
        </div>
        {draft.subject ? (
          <div className="pitch-workbench__draft-subject">
            <span>Subject</span>
            <strong>{draft.subject}</strong>
          </div>
        ) : null}
        <p className="pitch-workbench__draft-body">{draft.body}</p>
        <div className="pitch-workbench__draft-bottom">
          <PenLine aria-hidden="true" />
          <span>Editable example copy · review before any action</span>
        </div>
      </div>
      <div className="pitch-workbench__outreach-note">
        <span className="pitch-workbench__outreach-line" aria-hidden="true" />
        <PaperLabel>You control the send</PaperLabel>
        <p>
          No recipient, provider or send action is attached to this illustrative
          draft.
        </p>
      </div>
    </div>
  );
}

function Dossier({ activeStage }: { activeStage: StageId }) {
  const activeIndex = STAGES.findIndex(stage => stage.id === activeStage);

  return (
    <aside className="pitch-workbench__dossier" aria-label="Lead dossier">
      <div className="pitch-workbench__dossier-heading">
        <PaperLabel>Lead dossier</PaperLabel>
        <span className="pitch-workbench__folio-number">TP / 014</span>
      </div>
      <div className="pitch-workbench__dossier-person">
        <div className="pitch-workbench__dossier-avatar" aria-hidden="true">
          NL
        </div>
        <div>
          <h3>Northstar Labs</h3>
          <p>B2B devtools</p>
        </div>
      </div>
      <div className="pitch-workbench__dossier-site">
        <Globe2 aria-hidden="true" />
        <span>northstar.example</span>
        <span className="pitch-workbench__fictional-mark">fictional</span>
      </div>
      <div className="pitch-workbench__dossier-sources">
        <span className="pitch-workbench__field-label">Source snippets</span>
        <strong>2</strong>
        <span>held beside the brief</span>
      </div>
      <div className="pitch-workbench__inspector">
        <div className="pitch-workbench__inspector-head">
          <span className="pitch-workbench__field-label">Stage inspector</span>
          <span>local demo</span>
        </div>
        <ol>
          {STAGES.map((stage, index) => {
            const isCurrent = stage.id === activeStage;
            const isHeld = index < activeIndex;
            return (
              <li key={stage.id} className={isCurrent ? "is-current" : ""}>
                <span
                  className={`pitch-workbench__stage-marker${isHeld ? " is-held" : ""}`}
                >
                  {isHeld ? (
                    <Check aria-hidden="true" />
                  ) : (
                    <span>{stage.number}</span>
                  )}
                </span>
                <span>
                  <strong>{stage.label}</strong>
                  <em>{stage.note}</em>
                </span>
                {isCurrent ? <CircleCheck aria-hidden="true" /> : null}
              </li>
            );
          })}
        </ol>
      </div>
      <p className="pitch-workbench__dossier-footnote">
        <ShieldCheck aria-hidden="true" /> Example evidence, not a live lead.
      </p>
    </aside>
  );
}

function MarginSlip({ activeStage }: { activeStage: StageId }) {
  const stage = STAGES.find(item => item.id === activeStage) ?? STAGES[0];

  return (
    <aside
      className="pitch-workbench__margin"
      aria-label={`${stage.label} annotations`}
    >
      <div className="pitch-workbench__pin" aria-hidden="true" />
      <div className="pitch-workbench__margin-slip">
        <div className="pitch-workbench__margin-head">
          <PaperLabel>Margin note</PaperLabel>
          <span>{stage.number}</span>
        </div>
        <h3>Why this step matters</h3>
        <ul>
          {checksByStage[activeStage].map(check => (
            <li key={check}>
              <Check aria-hidden="true" />
              <span>{check}</span>
            </li>
          ))}
        </ul>
        <div className="pitch-workbench__approval-note">
          <LockKeyhole aria-hidden="true" />
          <span>
            <strong>Approval boundary</strong>
            human choice stays visible
          </span>
        </div>
      </div>
    </aside>
  );
}

export function PitchWorkbench({ onReplay }: PitchWorkbenchProps) {
  const [activeStage, setActiveStage] = useState<StageId>("page");
  const [selectedLead, setSelectedLead] = useState(true);
  const activeIndex = STAGES.findIndex(stage => stage.id === activeStage);
  const activeMeta = STAGES[activeIndex] ?? STAGES[0];

  const goToStage = (index: number) => {
    const next = STAGES[index];
    if (next) setActiveStage(next.id);
  };

  const goNext = () => {
    if ((activeStage === "select" || activeStage === "page") && !selectedLead)
      return;
    if (activeIndex < STAGES.length - 1) goToStage(activeIndex + 1);
  };

  const replay = () => {
    setActiveStage("find");
    setSelectedLead(false);
    onReplay?.();
  };

  return (
    <section
      id="pitch-workbench"
      className="pitch-workbench"
      aria-labelledby="pitch-workbench-title"
    >
      <div className="pitch-workbench__grain" aria-hidden="true" />
      <div className="pitch-workbench__topline">
        <div className="pitch-workbench__title-mark">
          <span
            className="pitch-workbench__title-mark-thread"
            aria-hidden="true"
          />
          <span id="pitch-workbench-title">From research to their pitch</span>
        </div>
        <div className="pitch-workbench__demo-flag">
          <span className="pitch-workbench__live-dot" aria-hidden="true" />
          Illustrative demo · fictional lead
        </div>
      </div>

      <div className="pitch-workbench__tabs-wrap">
        <div
          className="pitch-workbench__tabs"
          role="tablist"
          aria-label="Tailoring stages"
        >
          {STAGES.map((stage, index) => {
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`pitch-stage-${stage.id}`}
                className={isActive ? "is-active" : ""}
                onClick={() => setActiveStage(stage.id)}
              >
                <span className="pitch-workbench__tab-number">
                  {stage.number}
                </span>
                <span>{stage.label}</span>
                <small>{stage.note}</small>
                {index < STAGES.length - 1 ? (
                  <span
                    className="pitch-workbench__tab-connector"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pitch-workbench__body">
        <Dossier activeStage={activeStage} />
        <main
          id={`pitch-stage-${activeStage}`}
          className="pitch-workbench__stage"
          role="tabpanel"
          aria-label={`${activeMeta.label} stage`}
        >
          <div className="pitch-workbench__stage-heading">
            <div>
              <span className="pitch-workbench__stage-kicker">
                {activeMeta.number} / {activeMeta.label}
              </span>
              <h2>
                {activeStage === "find" && "Find a reason to reach out."}
                {activeStage === "qualify" && "Know why the account fits."}
                {activeStage === "select" && "Pick who gets a personal pitch."}
                {activeStage === "page" &&
                  "Show how your offer fits their world."}
                {activeStage === "outreach" &&
                  "Open with a reason—not a template."}
              </h2>
            </div>
            <span className="pitch-workbench__stage-note">
              {activeMeta.note} → next layer
            </span>
          </div>

          {activeStage === "find" ? <FindStage /> : null}
          {activeStage === "qualify" ? <QualifyStage /> : null}
          {activeStage === "select" ? (
            <SelectStage
              selected={selectedLead}
              onToggle={() => setSelectedLead(value => !value)}
            />
          ) : null}
          {activeStage === "page" ? (
            <PageStage selected={selectedLead} />
          ) : null}
          {activeStage === "outreach" ? <OutreachStage /> : null}
        </main>
        <MarginSlip activeStage={activeStage} />
      </div>

      <div className="pitch-workbench__controls">
        <div className="pitch-workbench__control-copy">
          <span>{stageDescriptions[activeStage]}</span>
          <small>Local stage switch · no network calls</small>
        </div>
        <div className="pitch-workbench__control-actions">
          <button
            type="button"
            className="pitch-workbench__control-button pitch-workbench__control-button--quiet"
            onClick={() => goToStage(activeIndex - 1)}
            disabled={activeIndex === 0}
          >
            <ChevronLeft aria-hidden="true" /> Previous
          </button>
          {activeIndex === STAGES.length - 1 ? (
            <button
              type="button"
              className="pitch-workbench__control-button"
              onClick={replay}
            >
              <ArrowLeft aria-hidden="true" /> Replay example
            </button>
          ) : (
            <button
              type="button"
              className="pitch-workbench__control-button"
              onClick={goNext}
              disabled={
                (activeStage === "select" || activeStage === "page") &&
                !selectedLead
              }
            >
              {activeStage === "select" && !selectedLead
                ? "Approve lead to continue"
                : "Next stage"}
              <ChevronRight aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default PitchWorkbench;
