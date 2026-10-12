import { useState } from "react";
import { ArrowRight, Check, Plus } from "lucide-react";
import {
  proposedPlans,
  proposedUsage,
  type ProposedPlanId,
} from "@shared/pricing";

export function PricingLedger({
  onInterest,
}: {
  onInterest: (plan: ProposedPlanId) => void;
}) {
  const [selected, setSelected] = useState<ProposedPlanId>("focus");
  const plan = proposedPlans.find(p => p.id === selected)!;
  return (
    <section
      id="pricing"
      className="tp-pricing tp-shell"
      aria-labelledby="pricing-title"
    >
      <div className="tp-section-intro">
        <span className="tp-index">05 / YOUR PERSONAL PITCH PACKAGE</span>
        <h2 id="pricing-title">
          Your next 10 pitches.
          <br />
          <em>Built around the right 100 leads.</em>
        </h2>
        <p>
          The proposed $99 Focus plan pairs up to 100 researched leads with 10
          personalized landing pages. Research the shortlist. Make the accounts
          you choose feel understood. Need more? Pick the same workflow with a
          larger monthly allowance.
        </p>
      </div>
      <div className="tp-price-layout">
        <div
          className="tp-plan-ledger"
          role="group"
          aria-label="Proposed plans"
        >
          <div className="tp-ledger-top">
            <span>PROPOSED MONTHLY PLANS</span>
            <span>Early access · Not a checkout</span>
          </div>
          {proposedPlans.map((p, index) => (
            <button
              type="button"
              key={p.id}
              aria-pressed={selected === p.id}
              onClick={() => setSelected(p.id)}
              className={`tp-plan-row ${selected === p.id ? "is-selected" : ""}`}
            >
              <span className="tp-plan-index">0{index + 1}</span>
              <span className="tp-plan-name">
                {p.name}
                <small>
                  {p.researchedLeads} researched leads · {p.personalizedPages}{" "}
                  pages
                </small>
              </span>
              <span className="tp-plan-price">
                ${p.price}
                <small>/ month</small>
              </span>
              <Plus size={16} aria-hidden="true" />
            </button>
          ))}
          <p className="tp-price-footnote">
            Proposed pricing—not available to purchase yet. No card is
            collected. Final prices and allowances may change. Connected
            provider fees are separate.
          </p>
        </div>
        <div className="tp-allocation" key={plan.id}>
          <div className="tp-allocation-head">
            <span className="tp-index">
              {plan.name.toUpperCase()} / HERE’S WHAT YOU GET
            </span>
            <span className="tp-ticket-notch" aria-hidden="true">
              ✳
            </span>
          </div>
          <div className="tp-credit-number">
            {plan.credits.toLocaleString()}
            <span>credits</span>
          </div>
          <p className="tp-credit-intro">{plan.audience}</p>
          <div className="tp-credit-allocation">
            <div>
              <span>{plan.researchedLeads}</span>
              <p>research credits</p>
              <small>1 per researched lead</small>
            </div>
            <span className="tp-credit-plus">+</span>
            <div>
              <span>{plan.personalizedPages * 10}</span>
              <p>page credits</p>
              <small>10 per personalized page</small>
            </div>
          </div>
          <p className="tp-credit-note">
            Up to {plan.researchedLeads} researched leads <strong>and</strong>{" "}
            {plan.personalizedPages} personalized pages. Both allowances are
            included, with separate credit allocations. You don’t have to trade
            your research budget for your pages.
          </p>
          <ul className="tp-plan-inclusions">
            <li>
              <Check size={14} /> Research briefs with sources—not just contact
              names
            </li>
            <li>
              <Check size={14} /> Account-specific pages you can edit and
              publish
            </li>
            <li>
              <Check size={14} /> First-message drafts in your company’s voice
            </li>
            <li>
              <Check size={14} /> Website-led brand setup and suggested customer
              profiles
            </li>
            <li>
              <Check size={14} /> A paced discovery queue, with pause and review
              controls
            </li>
          </ul>
          <button
            type="button"
            className="tp-cta"
            onClick={() => onInterest(plan.id)}
          >
            Join early access · {plan.name}
            <ArrowRight size={16} />
          </button>
          <span className="tp-no-charge">
            Register interest only. No payment or subscription starts.
          </span>
        </div>
      </div>
      <CreditExample />
    </section>
  );
}
function CreditExample() {
  const [leads, setLeads] = useState(50),
    [pages, setPages] = useState(5);
  const used = proposedUsage(leads, pages);
  return (
    <div className="tp-credit-example">
      <div>
        <span className="tp-index">TRY THE MATH / FOCUS PLAN</span>
        <h3>See how your allowance works.</h3>
        <p>
          Move the sliders to plan your research and pages. This is an example,
          not a live balance. Saved-draft editing and outreach drafts are
          proposed to be included; rollover and extra-credit prices are not
          finalized.
        </p>
      </div>
      <div className="tp-credit-controls">
        <label>
          Researched leads <strong>{leads}</strong>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={leads}
            onChange={e => setLeads(Number(e.target.value))}
          />
        </label>
        <label>
          Personalized pages <strong>{pages}</strong>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={pages}
            onChange={e => setPages(Number(e.target.value))}
          />
        </label>
        <div
          className="tp-credit-meter"
          aria-label={`${used} of 200 proposed credits`}
        >
          <span style={{ width: `${used / 2}%` }} />
        </div>
        <p className="tp-credit-equation">
          {leads} × 1 + {pages} × 10 = <strong>{used} / 200 credits</strong>
        </p>
      </div>
    </div>
  );
}
