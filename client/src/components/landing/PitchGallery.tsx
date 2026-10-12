import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  LockKeyhole,
  Mail,
  Globe2,
} from "lucide-react";
export function PitchGallery({ onExplore }: { onExplore: () => void }) {
  const [view, setView] = useState<"page" | "outreach">("page");
  return (
    <div
      className="tp-gallery"
      aria-label="Illustrative personalized pitch gallery"
    >
      <div className="tp-gallery-meta">
        <span>THE DELIVERABLE / THEIR OWN PITCH</span>
        <span>FICTIONAL EXAMPLE</span>
      </div>
      <div className="tp-gallery-artifacts">
        <div className="tp-gallery-research">
          <div className="tp-gallery-folio">
            <span>RESEARCH BRIEF</span>
            <span>TP—014</span>
          </div>
          <div className="tp-gallery-account">
            <span>NL</span>
            <div>
              <strong>Northstar Labs</strong>
              <small>Fictional B2B devtools team</small>
            </div>
          </div>
          <p className="tp-gallery-source">
            <Globe2 size={11} />
            northstar.example / careers
          </p>
          <h3>Hiring platform engineers.</h3>
          <p>
            A reason to research.
            <br />
            Not a promise of intent.
          </p>
          <div className="tp-gallery-evidence">
            <Check size={13} />
            <span>Sources included. Gaps visible.</span>
          </div>
        </div>
        <div
          className={`tp-gallery-output ${view === "outreach" ? "is-message" : ""}`}
        >
          <div className="tp-gallery-window">
            <i />
            <i />
            <i />
            <span>
              {view === "page"
                ? "A PAGE JUST FOR THEM"
                : "A NOTE WORTH REVIEWING"}
            </span>
            <LockKeyhole size={10} />
          </div>
          {view === "page" ? (
            <div
              className="tp-gallery-page"
              role="tabpanel"
              aria-label="Personalized page example"
            >
              <div className="tp-gallery-proof">
                <span>
                  proof<span>*</span>
                </span>
                <small>FOR NORTHSTAR LABS</small>
              </div>
              <div className="tp-gallery-page-kicker">
                YOUR CONTEXT. OUR PROPOSED APPROACH.
              </div>
              <h3>
                Ship the change.
                <br />
                Keep the proof.
              </h3>
              <p>
                As your platform team grows, keep the intent and evidence close
                to every change.
              </p>
              <div className="tp-gallery-page-rule" />
              <div className="tp-gallery-case">
                <span>01</span>
                <div>
                  <strong>One change. A clearer trail.</strong>
                  <p>
                    A scoped place to compare the approach—not a claim of an
                    existing relationship.
                  </p>
                </div>
              </div>
              <button type="button" onClick={onExplore}>
                See how the pitch is built <ArrowUpRight size={14} />
              </button>
              <span className="tp-gallery-notice">
                Illustrative proposal · not a live page
              </span>
            </div>
          ) : (
            <div
              className="tp-gallery-email"
              role="tabpanel"
              aria-label="Outreach example"
            >
              <div className="tp-gallery-email-tag">
                <Mail size={13} />
                <span>OUTREACH DRAFT / NOT SENT</span>
              </div>
              <dl>
                <div>
                  <dt>To</dt>
                  <dd>Recipient not specified</dd>
                </div>
                <div>
                  <dt>Subject</dt>
                  <dd>A thought on your evidence trail</dd>
                </div>
              </dl>
              <p>Hi Northstar team—</p>
              <p>
                Noticed you're hiring platform engineers. We put together a
                small idea for keeping release evidence close to the change as
                your team grows.
              </p>
              <p>Worth comparing notes?</p>
              <button type="button" onClick={onExplore}>
                See how the draft is built <ArrowUpRight size={14} />
              </button>
              <span className="tp-gallery-notice">
                Fictional copy · no email is sent
              </span>
            </div>
          )}
        </div>
        <div className="tp-gallery-annotation">
          <ArrowDownRight size={27} />
          <span>
            Your offer.
            <br />
            Their reason.
          </span>
        </div>
      </div>
      <div
        className="tp-gallery-controls"
        role="tablist"
        aria-label="Pitch output examples"
      >
        <span>SEE THE OUTPUT</span>
        <button
          type="button"
          role="tab"
          aria-selected={view === "page"}
          onClick={() => setView("page")}
        >
          01 Page <ArrowUpRight size={12} />
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "outreach"}
          onClick={() => setView("outreach")}
        >
          02 Outreach <ArrowUpRight size={12} />
        </button>
      </div>
    </div>
  );
}
