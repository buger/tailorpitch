import type { ReactNode } from "react";
import {
  Check,
  CircleAlert,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function LeadloomMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
    >
      <path
        d="M7 7h9v5h-4v8h8v-4h5v9H7V7Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M25 25h-9v-5h4v-8h-8v4H7V7h18v18Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LeadloomWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LeadloomMark className="text-terracotta" size={compact ? 20 : 23} />
      <span
        className={cn(
          "editorial-wordmark",
          compact ? "text-[23px]" : "text-[29px]"
        )}
      >
        TailorPitch
      </span>
    </div>
  );
}

export function MonoLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "accent";
}) {
  const tones = {
    neutral: "border-line bg-transparent text-ink-muted",
    good: "border-sage/40 bg-sage-soft text-sage-ink",
    warn: "border-amber-300 bg-amber-50 text-amber-800",
    bad: "border-red-300 bg-red-50 text-red-800",
    accent: "border-terracotta/30 bg-terracotta-pale text-terracotta",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[2px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em]",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary: "bg-ink text-paper hover:bg-ink/90",
    secondary: "border border-line bg-paper text-ink hover:border-ink/40",
    ghost: "text-ink-muted hover:bg-ink/[0.05] hover:text-ink",
    danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-[2px] px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextInput({
  label,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink">
        {label}
      </span>
      <input
        className={cn(
          "w-full rounded-sm border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/10",
          className
        )}
        {...props}
      />
      {hint && (
        <span className="mt-1 block text-[11px] leading-4 text-ink-muted">
          {hint}
        </span>
      )}
    </label>
  );
}

export function TextArea({
  label,
  hint,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink">
        {label}
      </span>
      <textarea
        className={cn(
          "min-h-28 w-full resize-y rounded-sm border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-terracotta focus:ring-2 focus:ring-terracotta/10",
          className
        )}
        {...props}
      />
      {hint && (
        <span className="mt-1 block text-[11px] leading-4 text-ink-muted">
          {hint}
        </span>
      )}
    </label>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      {" "}
      <div>
        {eyebrow && (
          <MonoLabel className="mb-2 block text-terracotta">
            {eyebrow}
          </MonoLabel>
        )}
        <h1 className="font-display text-4xl leading-[1.04] text-ink sm:text-[48px]">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string | number;
  note: string;
  tone?: "default" | "terracotta" | "sage";
}) {
  return (
    <div
      className={cn(
        "border-t border-line px-1 py-5",
        tone === "terracotta" && "border-terracotta/40",
        tone === "sage" && "border-sage/60"
      )}
    >
      <MonoLabel>{label}</MonoLabel>
      <p className="mt-5 font-display text-5xl leading-none text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{note}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Search,
  title,
  description,
  action,
}: {
  icon?: typeof Search;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-line bg-white px-6 py-14 text-center">
      <Icon className="mx-auto mb-4 h-6 w-6 text-ink-muted" strokeWidth={1.5} />
      <h2 className="font-display text-xl tracking-[-0.03em]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function LoadingState({
  label = "Loading workspace",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-48 items-center justify-center border border-line bg-white">
      <Loader2 className="mr-3 h-4 w-4 animate-spin text-terracotta" />
      <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </span>
    </div>
  );
}
export function ErrorState({
  message = "Something went wrong.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="border border-red-200 bg-red-50/70 p-6">
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
        <div>
          <h2 className="font-semibold text-red-900">
            Unable to load this view
          </h2>
          <p className="mt-1 text-sm leading-6 text-red-800">{message}</p>
          {onRetry && (
            <Button className="mt-4" variant="secondary" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  kind = "success",
  onDismiss,
}: {
  message: string;
  kind?: "success" | "error";
  onDismiss: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[100] flex max-w-sm items-center gap-3 border px-4 py-3 text-sm shadow-lg",
        kind === "success"
          ? "border-sage/40 bg-sage-soft text-sage-ink"
          : "border-red-200 bg-red-50 text-red-800"
      )}
      role="status"
    >
      <Check className="h-4 w-4 shrink-0" />
      <span>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss notification">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function DrawerDialog({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto border border-line bg-paper p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl tracking-[-0.04em]">
              {title}
            </h2>
            {description && (
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-sm p-2 text-ink-muted hover:bg-ink/[0.05]"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AccessRestricted({ email }: { email?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md border border-line bg-white p-8 sm:p-10">
        <LockKeyhole className="h-6 w-6 text-terracotta" />
        <MonoLabel className="mt-6 block">Pilot access</MonoLabel>
        <h1 className="mt-3 font-display text-4xl leading-none tracking-[-0.06em]">
          A considered workspace, not an open door.
        </h1>
        <p className="mt-5 text-sm leading-6 text-ink-muted">
          This Proof pilot is restricted to approved members. Ask the owner to
          approve your account at{" "}
          <a
            className="font-semibold text-terracotta underline"
            href="mailto:hello@reqproof.com"
          >
            hello@reqproof.com
          </a>
          .
        </p>
        {email && (
          <p className="mt-4 border-t border-line pt-4 font-mono text-[11px] text-ink-muted">
            Signed in as {email}
          </p>
        )}
      </div>
    </div>
  );
}

export function LoginGate({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="max-w-md text-center">
        <LeadloomWordmark />
        <MonoLabel className="mt-16 block text-terracotta">
          Private workspace
        </MonoLabel>
        <h1 className="mt-4 font-display text-5xl leading-[.96] tracking-[-0.07em]">
          Research first.
          <br />
          Reach out with a reason.
        </h1>
        <p className="mt-5 text-sm leading-6 text-ink-muted">
          Sign in with your approved Manus account to open the TailorPitch
          workspace.
        </p>
        <Button className="mt-8 w-full sm:w-auto" onClick={onLogin}>
          Sign in to TailorPitch
        </Button>
      </div>
    </div>
  );
}
