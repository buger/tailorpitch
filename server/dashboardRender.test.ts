import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  pipeline: { data: undefined, isLoading: false, error: null } as any,
}));
vi.mock("../client/src/components/leadloom-types", () => ({
  api: {
    icps: {
      list: { useQuery: () => ({ data: [], isLoading: false, error: null }) },
    },
    pipeline: {
      get: { useQuery: () => state.pipeline },
      save: { useMutation: () => ({}) },
      toggle: { useMutation: () => ({}) },
      tick: { useMutation: () => ({}) },
      select: { useMutation: () => ({}) },
      registerSchedule: { useMutation: () => ({}) },
    },
  },
}));
vi.mock("../client/src/components/LeadloomUI", () => ({
  Button: ({ children }: any) => React.createElement("button", null, children),
  DrawerDialog: ({ children }: any) => children,
  EmptyState: ({ title, description }: any) =>
    React.createElement("section", null, title, description),
  MonoLabel: ({ children }: any) => children,
  SectionHeader: ({ title }: any) => title,
  StatCard: ({ value }: any) => String(value),
  StatusChip: ({ children }: any) => children,
  TextArea: () => null,
  TextInput: () => null,
  Toast: () => null,
}));
import { OverviewView } from "../client/src/pages/WorkspaceHome";
import { WorkspaceAgents } from "../client/src/pages/WorkspaceAgents";
const workspace: any = {
  role: "owner",
  company: {
    name: "Proof",
    website: "https://reqproof.com",
    brand: { logoUrl: "" },
    onboardingCompletedAt: null,
  },
  stats: { leads: 0, qualified: 0, pages: 0, outreach: 0 },
  recent: [],
};
function overview() {
  return renderToStaticMarkup(React.createElement(OverviewView, { workspace }));
}
beforeEach(() => {
  vi.stubGlobal("React", React);
  state.pipeline = { data: undefined, isLoading: false, error: null };
});
describe("dashboard pipeline response rendering", () => {
  it("renders the reported new-workspace pipeline:null without crashing", () => {
    state.pipeline.data = { pipeline: null };
    expect(overview()).toContain("No agent pipeline configured yet");
  });
  it("does not label absent data as a paused agent", () => {
    expect(overview()).toContain("Pipeline status unavailable");
    expect(overview()).not.toContain("Pipeline paused.");
  });
  it("shows a loading state before pipeline data arrives", () => {
    state.pipeline.isLoading = true;
    expect(overview()).toContain("Loading saved pipeline state");
  });
  it("shows a retryable failed status", () => {
    state.pipeline.error = new Error("provider unavailable");
    expect(overview()).toContain("Open agent controls to retry");
  });
  it.each([1, true])("renders an enabled saved pipeline (%s)", enabled => {
    state.pipeline.data = { pipeline: { enabled } };
    expect(overview()).toContain("Pipeline enabled.");
  });
  it.each([0, false])("renders a paused saved pipeline (%s)", enabled => {
    state.pipeline.data = { pipeline: { enabled } };
    expect(overview()).toContain("Pipeline paused.");
  });
  it("agent controls show a request error even without initialized config", () => {
    state.pipeline.error = new Error("Agent status unavailable");
    const html = renderToStaticMarkup(React.createElement(WorkspaceAgents));
    expect(html).toContain("Agent status unavailable");
    expect(html).toContain("Retry");
    expect(html).not.toContain("Opening agent workspace");
  });
  it("agent controls show missing data rather than an endless spinner", () => {
    const html = renderToStaticMarkup(React.createElement(WorkspaceAgents));
    expect(html).toContain("could not be loaded");
    expect(html).not.toContain("Opening agent workspace");
  });
});
