import type { CSSProperties } from "react";
import type { Brand, PageContent } from "@shared/domain";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PagePreview({
  content,
  brand,
  companyName,
  leadName,
  preview = false,
}: {
  content: PageContent;
  brand: Brand;
  companyName: string;
  leadName?: string;
  preview?: boolean;
}) {
  const style = {
    "--preview-paper": brand.backgroundColor,
    "--preview-ink": brand.primaryColor,
    "--preview-accent": brand.accentColor,
    background: brand.backgroundColor,
    color: brand.primaryColor,
  } as CSSProperties;
  const editorial = content.layout === "editorial";
  const bold = content.layout === "bold";
  const heading = editorial ? "font-serif" : "font-display";
  const ctaStyle: CSSProperties = {
    background: brand.primaryColor,
    color: brand.backgroundColor,
  };
  const Cta = () => (
    <a
      href={brand.bookingUrl}
      target="_blank"
      rel="noreferrer"
      style={ctaStyle}
      className={cn(
        "inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80",
        editorial ? "rounded-full" : "rounded-sm"
      )}
    >
      {content.ctaText}
      <ArrowUpRight className="h-4 w-4" />
    </a>
  );
  return (
    <article
      style={style}
      className={cn(
        "overflow-hidden border border-black/10",
        preview ? "rounded-sm" : "min-h-screen"
      )}
    >
      <header className="flex items-center justify-between gap-5 border-b border-black/10 px-6 py-5 sm:px-12">
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={`${companyName} logo`}
              className="h-9 max-w-28 object-contain"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center border border-current font-semibold">
              {companyName.slice(0, 1)}
            </span>
          )}
          <span className="font-semibold tracking-[-.02em]">{companyName}</span>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[.14em] opacity-60">
          A proposal, not an endorsement
        </span>
      </header>
      <div
        className={cn(
          "mx-auto px-6 py-14 sm:px-12",
          content.layout === "minimal"
            ? "max-w-3xl sm:py-16"
            : "max-w-6xl sm:py-24"
        )}
      >
        <div
          className={cn(bold && "border-l-4 pl-6 sm:pl-10")}
          style={bold ? { borderColor: brand.accentColor } : undefined}
        >
          <p className="font-mono text-[10px] uppercase tracking-[.18em] opacity-65">
            {content.eyebrow}
          </p>
          <h1
            className={cn(
              "mt-5 max-w-4xl leading-[.98] tracking-[-.055em]",
              heading,
              bold
                ? "text-5xl font-semibold sm:text-7xl"
                : "text-4xl sm:text-6xl"
            )}
          >
            {content.headline}
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 opacity-75 sm:text-lg">
            {content.subheadline}
          </p>
          <div className="mt-9">
            <Cta />
          </div>
        </div>
        <section
          className={cn(
            "mt-20 gap-10 border-t border-black/15 pt-10",
            editorial && "grid md:grid-cols-[.65fr_1fr]"
          )}
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[.18em] opacity-60">
              01 / context
            </p>
            <h2 className={cn("mt-4 text-3xl tracking-[-.04em]", heading)}>
              {content.contextTitle}
            </h2>
          </div>
          <p
            className={cn(
              "max-w-2xl text-sm leading-7 opacity-75",
              !editorial && "mt-5"
            )}
          >
            {content.contextBody}
          </p>
        </section>
        <section
          className={cn(
            "mt-14 gap-4",
            content.layout === "minimal" ? "space-y-4" : "grid sm:grid-cols-2"
          )}
        >
          {content.benefits.map((benefit, i) => (
            <div
              key={i}
              className={cn("border border-black/15 p-6", bold && "border-t-4")}
              style={bold ? { borderTopColor: brand.accentColor } : undefined}
            >
              <span className="font-mono text-[10px] opacity-60">0{i + 1}</span>
              <h3 className={cn("mt-7 text-2xl tracking-[-.03em]", heading)}>
                {benefit.title}
              </h3>
              <p className="mt-3 text-sm leading-6 opacity-75">
                {benefit.body}
              </p>
            </div>
          ))}
        </section>
        <section className="mt-16 border-y border-black/15 py-10">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] opacity-60">
            A proposed pilot
          </p>
          <h2 className={cn("mt-4 text-3xl tracking-[-.04em]", heading)}>
            {content.pilotTitle}
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 opacity-75">
            {content.pilotBody}
          </p>
        </section>
        <section className="mt-16">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] opacity-60">
            How we might work together
          </p>
          <div
            className={cn(
              "mt-6 border-t border-black/15",
              content.layout !== "minimal" && "grid sm:grid-cols-2"
            )}
          >
            {content.steps.map((step, i) => (
              <div className="border-b border-black/15 py-6 sm:pr-8" key={i}>
                <span className="font-mono text-xs opacity-60">0{i + 1}</span>
                <h3 className="mt-5 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 opacity-75">{step.body}</p>
              </div>
            ))}
          </div>
        </section>
        <section
          className="mt-20 border-l-4 px-6 py-8 sm:px-10"
          style={{
            borderColor: brand.accentColor,
            background: `${brand.primaryColor}08`,
          }}
        >
          <h2
            className={cn(
              "max-w-xl text-3xl leading-tight tracking-[-.04em] sm:text-4xl",
              heading
            )}
          >
            {content.closing}
          </h2>
          <p className="mt-4 text-sm opacity-70">
            {leadName
              ? `Prepared for ${leadName} by ${companyName}.`
              : `Prepared by ${companyName}.`}
          </p>
          <div className="mt-7">
            <Cta />
          </div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-3 pt-10 text-[10px] uppercase tracking-[.1em] opacity-60">
          <span>{companyName}</span>
          <span>
            {preview ? "Private draft preview" : "Individual proposal"} · No
            prospect endorsement implied
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
