import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { operationDefinitions, type OperationKind } from "../shared/operations";
import type { OperationSession } from "../client/src/components/operations/types";
vi.mock("../client/src/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => React.createElement("div", null, children),
  DialogContent: ({ children }: any) =>
    React.createElement("div", { role: "dialog" }, children),
  DialogTitle: ({ children }: any) => React.createElement("h2", null, children),
}));
import {
  ProgressWindow,
  formatElapsed,
} from "../client/src/components/operations/ProgressWindow";
beforeEach(() => {
  vi.stubGlobal("React", React);
});
const base: OperationSession = {
  id: "fixture",
  kind: "company_analysis",
  subject: "https://example.com",
  stage: 1,
  status: "running",
  detail: "Read three pages. Preparing suggestions.",
  startedAt: new Date(),
  completedAt: null,
  busy: true,
  minimized: false,
  errorMessage: null,
  liveUpdateUnavailable: false,
  elapsedSeconds: 65,
};
function html(change: Partial<OperationSession> = {}) {
  return renderToStaticMarkup(
    React.createElement(ProgressWindow, {
      session: { ...base, ...change },
      onMinimize: () => {},
      onRestore: () => {},
      onDismiss: () => {},
    })
  );
}
describe("shared progress window render states", () => {
  it.each(Object.keys(operationDefinitions) as OperationKind[])(
    "renders %s with all genuine stage labels and its review boundary",
    kind => {
      const result = html({ kind });
      expect(result).toContain(operationDefinitions[kind].title);
      for (const step of operationDefinitions[kind].steps)
        expect(result).toContain(step.replaceAll("&", "&amp;"));
      expect(result).toContain("Drafting boundary");
      expect(result).toContain("1:05");
      expect(result).not.toMatch(/\d+%|remaining seconds/);
    }
  );
  it("does not claim ready on a failed request", () => {
    const result = html({
      busy: false,
      status: "failed",
      errorMessage: "Source unavailable.",
    });
    expect(result).toContain("Source unavailable.");
    expect(result).toContain("Back to action");
    expect(result).not.toContain(operationDefinitions.company_analysis.ready);
    expect(result).not.toContain("Continue to review");
  });
  it("keeps a stale current stage uncertain and does not infer cancellation", () => {
    const result = html({ status: "interrupted" });
    expect(result).toContain("operation-window__step--uncertain");
    expect(result).toContain("No recent server update");
    expect(result).not.toContain("operation-window__step--stopped");
  });
  it("only offers a review-ready action after the original work resolved", () => {
    const result = html({ busy: false, status: "succeeded", stage: 3 });
    expect(result).toContain("Continue to review");
    expect(result.match(/operation-window__step--complete/g)).toHaveLength(4);
    expect(result).not.toContain("Back to action");
  });
  it("minimized progress can be restored but not dismissed as cancellation while running", () => {
    const result = html({ minimized: true });
    expect(result).toContain("Restore Analyzing your company website");
    expect(result).not.toContain("Dismiss operation result");
    expect(result).not.toContain("Cancel");
  });
  it("formats elapsed duration only, without a predicted finish time", () => {
    expect(formatElapsed(65)).toBe("1:05");
    expect(formatElapsed(-1)).toBe("0:00");
  });
});
