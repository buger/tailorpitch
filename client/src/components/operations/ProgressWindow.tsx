import { Check, ChevronRight, CircleAlert, Minus, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { operationDefinitions, stepState } from "@shared/operations";
import type { OperationStatus } from "@shared/operations";
import type { OperationSession } from "./types";
import "./operations.css";

type ProgressWindowProps = {
  session: OperationSession;
  onMinimize: () => void;
  onRestore: () => void;
  onDismiss: () => void;
};

function formatElapsed(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function subjectHost(subject: string) {
  const value = subject.trim();
  try {
    const url = new URL(
      value.match(/^https?:\/\//i) ? value : `https://${value}`
    );
    const host = url.hostname.replace(/^www\./i, "");
    if (host) return host;
  } catch {
    // Keep non-URL subjects readable below.
  }
  if (value.length <= 54) return value;
  return `${value.slice(0, 51).trimEnd()}…`;
}

function statusLabel(status: OperationStatus, busy: boolean) {
  if (status === "succeeded" && !busy) return "Ready to review";
  if (status === "failed" && !busy) return "Could not finish";
  if (status === "interrupted") return "Waiting for an update";
  return "In progress";
}

function stepMarker(state: ReturnType<typeof stepState>, index: number) {
  if (state === "complete")
    return <Check aria-hidden="true" size={13} strokeWidth={2.4} />;
  if (state === "uncertain") return "?";
  if (state === "stopped")
    return <X aria-hidden="true" size={12} strokeWidth={2.1} />;
  return index + 1;
}

function taskStatus(session: OperationSession) {
  const status = statusLabel(session.status, session.busy);
  return session.status === "interrupted" && session.busy
    ? `${status} · original request still open`
    : status;
}

export function ProgressWindow({
  session,
  onMinimize,
  onRestore,
  onDismiss,
}: ProgressWindowProps) {
  const definition = operationDefinitions[session.kind];
  const activeIndex = Math.min(
    Math.max(0, session.stage),
    definition.steps.length - 1
  );
  const isTerminal =
    !session.busy &&
    (session.status === "succeeded" || session.status === "failed");
  const isFailure = session.status === "failed" && !session.busy;
  const currentStep = definition.steps[activeIndex];
  const liveAnnouncement =
    session.status === "succeeded" && !session.busy
      ? "The operation is ready to review."
      : session.status === "failed" && !session.busy
        ? "The operation could not finish."
        : session.status === "interrupted"
          ? "Live operation status is uncertain; the original request is still open."
          : `Step ${activeIndex + 1} of ${definition.steps.length}: ${currentStep}.`;

  if (session.minimized) {
    return (
      <div className="operation-window__minimized" role="status">
        <button
          type="button"
          className="operation-window__minimized-restore"
          onClick={onRestore}
          aria-label={`Restore ${definition.title}. ${taskStatus(session)}.`}
        >
          <span className="operation-window__minimized-mark" aria-hidden="true">
            {isFailure ? <CircleAlert size={15} /> : <span>↗</span>}
          </span>
          <span className="operation-window__minimized-copy">
            <span className="operation-window__minimized-title">
              {definition.title}
            </span>
            <span className="operation-window__minimized-status">
              {taskStatus(session)} · stage {activeIndex + 1}/
              {definition.steps.length}
            </span>
          </span>
          <ChevronRight
            className="operation-window__minimized-chevron"
            aria-hidden="true"
            size={18}
          />
        </button>
        {!session.busy && (
          <button
            type="button"
            className="operation-window__minimized-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss operation result"
          >
            <X aria-hidden="true" size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div data-operation-ui>
      <Dialog
        open
        onOpenChange={open => {
          if (open) return;
          if (session.busy) onMinimize();
          else onDismiss();
        }}
      >
        <DialogContent
          className="operation-dialog__content"
          showCloseButton={false}
          aria-describedby={undefined}
        >
          <div
            className={`operation-window operation-window--${session.status}`}
          >
            <aside
              className="operation-window__rail"
              aria-label="Operation steps"
            >
              <span className="operation-window__eyebrow">
                TailorPitch / workspace task
              </span>
              <h2>{definition.agent}</h2>
              <ol className="operation-window__steps">
                {definition.steps.map((step, index) => {
                  const state = stepState(session.stage, index, session.status);
                  return (
                    <li
                      key={step}
                      className={`operation-window__step operation-window__step--${state}`}
                    >
                      <span className="operation-window__step-marker">
                        {stepMarker(state, index)}
                      </span>
                      <span className="operation-window__step-label">
                        {step}
                      </span>
                    </li>
                  );
                })}
              </ol>
              <p className="operation-window__boundary">
                <strong>Drafting boundary</strong>
                {definition.boundary}
              </p>
            </aside>

            <section className="operation-window__panel">
              <div className="operation-window__topbar">
                <span className="operation-window__agent">
                  {taskStatus(session)}
                </span>
                {session.busy ? (
                  <button
                    type="button"
                    className="operation-window__control"
                    onClick={onMinimize}
                    aria-label="Minimize progress window. The request will keep running."
                  >
                    <Minus aria-hidden="true" size={14} />
                    Minimize
                  </button>
                ) : (
                  <button
                    type="button"
                    className="operation-window__control operation-window__control--close"
                    onClick={onDismiss}
                    aria-label="Dismiss operation result"
                  >
                    <X aria-hidden="true" size={14} />
                    Dismiss
                  </button>
                )}
              </div>

              <div className="operation-window__heading">
                <div className="operation-window__heading-copy">
                  <DialogTitle>{definition.title}</DialogTitle>
                  <p
                    className="operation-window__subject"
                    title={session.subject}
                  >
                    {subjectHost(session.subject)}
                  </p>
                </div>
                <div className="operation-window__motif" aria-hidden="true">
                  <span />
                </div>
              </div>

              <div className="operation-window__detail-panel">
                <span className="operation-window__detail-label">
                  {isFailure
                    ? "What happened"
                    : isTerminal
                      ? "Ready"
                      : "Current work"}
                </span>
                <p className="operation-window__detail">
                  {isFailure
                    ? session.errorMessage || "The request returned an error."
                    : isTerminal
                      ? definition.ready
                      : session.detail || currentStep}
                </p>
                <div
                  className="operation-window__meta"
                  aria-label="Operation timing"
                >
                  <span>{formatElapsed(session.elapsedSeconds)} elapsed</span>
                  <span>{definition.agent}</span>
                </div>
                <p className="operation-window__mobile-boundary">
                  {definition.boundary}
                </p>
                {session.status === "interrupted" && session.busy && (
                  <p className="operation-window__notice">
                    No recent server update. Completion is uncertain; no retry
                    has started.
                  </p>
                )}
                {session.liveUpdateUnavailable && session.busy && (
                  <p className="operation-window__notice">
                    Live updates unavailable. The original request may still be
                    running.
                  </p>
                )}
              </div>

              <div className="operation-window__footer">
                <p className="operation-window__state">
                  {isTerminal ? (
                    isFailure ? (
                      <>
                        <strong>This request could not finish.</strong>
                        <br />
                        Review the error before starting again.
                      </>
                    ) : (
                      <>
                        <strong>{definition.ready}</strong>
                        <br />
                        Review it before applying anything to your workspace.
                      </>
                    )
                  ) : (
                    <>
                      <strong>{currentStep}</strong>
                      <br />
                      Keep this tab open. Minimizing does not cancel the
                      request.
                    </>
                  )}
                </p>
                {isTerminal && (
                  <button
                    type="button"
                    className="operation-window__action"
                    onClick={onDismiss}
                  >
                    {isFailure ? "Back to action" : "Continue to review"}
                  </button>
                )}
              </div>
            </section>
          </div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {liveAnnouncement}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { formatElapsed, subjectHost };
