import { useState, type CSSProperties } from "react";
import type { Brand, PageContent } from "@shared/domain";
import {
  ArrowUpRight,
  ArrowDown,
  ArrowRight,
  Check,
  Plus,
  Minus,
} from "lucide-react";
import "./personalized-page.css";

export function PagePreview({
  content,
  brand,
  companyName,
  leadName,
  preview = false,
  ctaHref,
}: {
  content: PageContent;
  brand: Brand;
  companyName: string;
  leadName?: string;
  preview?: boolean;
  ctaHref?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [prospectLogoFailed, setProspectLogoFailed] = useState(false);
  const prospect = content.prospectBrand;
  const workflow = content.workflow;
  const style = {
    "--pp-paper": brand.backgroundColor,
    "--pp-ink": brand.primaryColor,
    "--pp-accent": brand.accentColor,
  } as CSSProperties;
  const label = content.ctaText
    .replace(/\s*[—–-]?\s*https?:\/\/\S+/g, "")
    .trim();
  const Cta = ({ secondary = false }: { secondary?: boolean }) => (
    <a
      className={`pp-cta ${secondary ? "pp-cta-secondary" : ""}`}
      href={ctaHref ?? brand.bookingUrl}
      target={ctaHref ? undefined : "_blank"}
      rel="noreferrer"
    >
      {label}
      <ArrowUpRight size={17} />
    </a>
  );
  const logo =
    brand.logoUrl.startsWith("/manus-storage/") &&
    !preview &&
    typeof window !== "undefined"
      ? `${brand.logoUrl}?page=${encodeURIComponent(window.location.pathname.split("/").pop() || "")}`
      : brand.logoUrl;
  return (
    <article
      className={`pp-page pp-${content.layout} ${workflow ? "pp-has-workflow" : ""} ${preview ? "pp-preview" : ""}`}
      style={style}
    >
      <header className="pp-header">
        <a className="pp-brand" href="#proposal">
          {logo ? (
            <img
              src={logo}
              alt={`${companyName} logo`}
              onError={e => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <span>{companyName}</span>
          <span className="pp-brand-star" aria-hidden="true">
            ✳
          </span>
        </a>
        <span className="pp-recipient">
          Prepared for {leadName || "your team"}
        </span>
        <a className="pp-header-link" href="#pilot">
          The first step <ArrowUpRight size={14} />
        </a>
      </header>
      <section className="pp-hero pp-container" id="proposal">
        <div className="pp-hero-copy">
          {prospect && (
            <div
              className="pp-prospect-pair"
              aria-label={`Proposed ${companyName} workflow for ${prospect.name}`}
            >
              <span className="pp-seller-name">{companyName}</span>
              <ArrowRight size={18} />
              <span className="pp-prospect-name">
                {prospect.logoUrl && !prospectLogoFailed && (
                  <img
                    src={prospect.logoUrl}
                    alt={`${prospect.name} logo`}
                    onError={() => setProspectLogoFailed(true)}
                  />
                )}
                <strong>{prospect.name}</strong>
              </span>
              <span className="pp-proposal-tag">Proposed workflow</span>
            </div>
          )}
          <p className="pp-eyebrow">
            <span /> {content.eyebrow}
          </p>
          <h1>{content.headline}</h1>
          {workflow && (
            <a className="pp-mobile-fit" href="#workflow-fit">
              <span className="pp-index">The proposed connection</span>
              <strong>{workflow.integrationTitle}</strong>
              <ArrowDown size={14} />
            </a>
          )}
          <p className="pp-subhead">{content.subheadline}</p>
          {workflow && (
            <div className="pp-work-removed">
              <span className="pp-index">
                Work this could take off your plate
              </span>
              <ul>
                {workflow.workRemoved.map((item, i) => (
                  <li key={i}>
                    <Check size={13} />
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="pp-hero-actions">
            <Cta />
            <a className="pp-text-link" href="#pilot">
              See the proposed scope <ArrowDown size={14} />
            </a>
          </div>
          <p className="pp-micro">
            A conversation first. Scope and terms agreed before work begins.
          </p>
        </div>
        <div className="pp-hero-aside">
          {content.heroImageUrl && !imageFailed ? (
            <figure className="pp-art">
              <img
                src={content.heroImageUrl}
                alt={
                  content.heroImageAlt ||
                  "A calm editorial illustration of a focused first engagement"
                }
                onError={() => setImageFailed(true)}
              />
            </figure>
          ) : (
            <div className="pp-art pp-art-fallback" aria-hidden="true">
              <div />
              <div />
              <div />
            </div>
          )}
          {workflow ? (
            <div className="pp-brief pp-integration-brief" id="workflow-fit">
              <div className="pp-brief-top">
                <span className="pp-eyebrow">How it would fit</span>
                <span className="pp-status">
                  <span />
                  For {prospect?.name || leadName || "your team"}
                </span>
              </div>
              <h2>{workflow.integrationTitle}</h2>
              <p className="pp-current-work">{workflow.currentWork}</p>
              <ol className="pp-flow">
                {workflow.proposedFlow.map((step, i) => (
                  <li key={i}>
                    <span className="pp-flow-number">0{i + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p>
                Proposed scope, not an installed integration. Confirm the actual
                setup in the first conversation.
              </p>
            </div>
          ) : (
            <div className="pp-brief">
              <div className="pp-brief-top">
                <span className="pp-eyebrow">The invitation</span>
                <span className="pp-status">
                  <span />
                  For {leadName || "your team"}
                </span>
              </div>
              <h2>{content.pilotTitle}</h2>
              <div className="pp-brief-line">
                <span>Start with</span>
                <span>
                  {content.steps[0]?.title || "A focused conversation"}
                </span>
              </div>
              <div className="pp-brief-line">
                <span>Your decision</span>
                <span>Proceed only if the scope fits</span>
              </div>
              <p>
                Prepared by {companyName}. A proposal, not a claim of an
                existing partnership.
              </p>
            </div>
          )}
        </div>
      </section>
      <div className="pp-container">
        <section id="context" className="pp-context">
          <div>
            <p className="pp-index">01 / The reason for this note</p>
            <h2>{content.contextTitle}</h2>
          </div>
          <p>{content.contextBody}</p>
        </section>
        <section className="pp-value">
          <div className="pp-section-intro">
            <p className="pp-index">02 / What you take away</p>
            <h2>
              A first step.
              <br />
              With something to show for it.
            </h2>
            <p>The proposed work is specific. So are the deliverables.</p>
          </div>
          <div className="pp-deliverables">
            {content.benefits.map((b, i) => (
              <div key={i} className="pp-deliverable">
                <span className="pp-deliverable-no">0{i + 1}</span>
                <div>
                  <h3>{b.title}</h3>
                  <p>{b.body}</p>
                </div>
                <Check size={18} />
              </div>
            ))}
          </div>
        </section>
        <section className="pp-pilot" id="pilot">
          <div className="pp-pilot-main">
            <p className="pp-index">03 / The offer</p>
            <h2>{content.pilotTitle}</h2>
            <p>{content.pilotBody}</p>
            <Cta secondary />
          </div>
          <aside>
            <span className="pp-index">Small start. Clear boundaries.</span>
            <div>
              <Check size={17} />
              <span>Agree the scope before implementation.</span>
            </div>
            <div>
              <Check size={17} />
              <span>Make the first decision in a conversation.</span>
            </div>
            <div>
              <Check size={17} />
              <span>No obligation to expand the engagement.</span>
            </div>
          </aside>
        </section>
        <section className="pp-steps">
          <div className="pp-section-intro">
            <p className="pp-index">04 / From interest to action</p>
            <h2>
              Know the next step.
              <br />
              Before you take it.
            </h2>
          </div>
          <div className="pp-steps-list">
            {content.steps.map((step, i) => (
              <details key={i} open={i === 0}>
                <summary>
                  <span>0{i + 1}</span>
                  <h3>{step.title.replace(/^\d+\.\s*/, "")}</h3>
                  <Plus className="pp-plus" size={17} />
                  <Minus className="pp-minus" size={17} />
                </summary>
                <p>{step.body}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="pp-closing">
          <div>
            <p className="pp-index">One conversation. A clearer decision.</p>
            <h2>{content.closing}</h2>
            <p>
              Prepared for {leadName || "your team"} by {companyName}.
            </p>
          </div>
          <Cta />
        </section>
        <footer className="pp-footer">
          <span>
            {companyName} / {leadName || "Individual proposal"}
          </span>
          <span>
            {preview ? "Private preview" : "Individual proposal"} · No prospect
            endorsement implied
          </span>
        </footer>
      </div>
    </article>
  );
}
export function BrandSnapshot({ brand }: { brand: Brand }) {
  return (
    <div className="flex items-center gap-2 text-[11px] text-ink-muted">
      {[brand.backgroundColor, brand.primaryColor, brand.accentColor].map(
        (color, i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-full border border-ink/20"
            style={{ background: color }}
          />
        )
      )}
      Brand snapshot
    </div>
  );
}
