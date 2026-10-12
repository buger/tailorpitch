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
        <span className="tp-index">04 / THE OFFER</span>
        <h2 id="pricing-title">
          Less busywork.
          <br />
          <em>More room to sell.</em>
        </h2>
        <p>
          Start with a focused pipeline. Spend your attention on the right
          accounts, not another list you will never finish.
        </p>
      </div>
      <div className="tp-price-layout">
        <div
          className="tp-plan-ledger"
          role="group"
          aria-label="Proposed plans"
        >
          <div className="tp-ledger-top">
            <span>MONTHLY PLAN / PROPOSAL</span>
            <span>No billing enabled</span>
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
            Illustrative prices and allowances. Not available to purchase. Final
            pricing may change.
          </p>
        </div>
        <div className="tp-allocation" key={plan.id}>
          <div className="tp-allocation-head">
            <span className="tp-index">YOUR PROPOSED MONTHLY ALLOCATION</span>
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
            Both allowances included: up to {plan.researchedLeads} researched
            leads <strong>and</strong> {plan.personalizedPages} personalized
            pages. Separate proposed allocations—not either/or.
          </p>
          <ul className="tp-plan-inclusions">
            <li>
              <Check size={14} /> Company voice & visual references
            </li>
            <li>
              <Check size={14} /> Editable pages & outreach drafts
            </li>
            <li>
              <Check size={14} /> Adjustable sourcing pace & pause controls
            </li>
          </ul>
          <button
            type="button"
            className="tp-cta"
            onClick={() => onInterest(plan.id)}
          >
            Register interest in {plan.name}
            <ArrowRight size={16} />
          </button>
          <span className="tp-no-charge">
            Early-access list only. No card. No charge.
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
        <h3>Know what the work costs.</h3>
        <p>
          A planning example, not a live balance. Editing saved drafts and
          preparing outreach drafts are proposed to be included. Rollover and
          extra-credit pricing are not finalized.
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
