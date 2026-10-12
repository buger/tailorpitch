import { startLogin } from "@/const";
import { useState } from "react";
import { loginErrorMessage } from "@shared/authMessages";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { api } from "@/components/leadloom-types";
import {
  AccessRestricted,
  ErrorState,
  LoginGate,
  LoadingState,
} from "@/components/LeadloomUI";
import { LeadloomShell } from "@/components/LeadloomShell";
import { IcpView, OverviewView } from "@/pages/WorkspaceHome";
import { LeadDetailView, LeadsView } from "@/pages/WorkspaceLeads";
import {
  InboxView,
  OutreachView,
  PagesView,
  SubmissionsView,
} from "@/pages/WorkspaceContent";
import { AgentsView } from "./WorkspaceAgents";
import { SettingsView } from "./WorkspaceSettings";
import { CompanyOnboarding } from "./CompanyOnboarding";

export default function AppWorkspace() {
  const auth = useAuth();
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string>();
  const switchAccount = async () => {
    setSwitching(true);
    setSwitchError(undefined);
    try {
      await auth.logout();
      window.location.href = "/app";
    } catch {
      setSwitchError("We could not sign out. Please try again.");
      setSwitching(false);
    }
  };
  const [location] = useLocation();
  const workspace = api.workspace.get.useQuery(undefined, {
    enabled: Boolean(auth.user),
    retry: false,
  });
  if (auth.loading) return <LoadingState label="Checking your session" />;
  if (!auth.user)
    return (
      <LoginGate
        onLogin={() => startLogin()}
        error={
          loginErrorMessage(
            new URLSearchParams(window.location.search).get("login_error")
          ) || auth.error?.message
        }
      />
    );
  if (workspace.isLoading)
    return <LoadingState label="Opening company workspace" />;
  if (workspace.error?.data?.code === "FORBIDDEN")
    return (
      <AccessRestricted
        email={auth.user.email || undefined}
        onSwitchAccount={() => void switchAccount()}
        pending={switching}
        error={switchError}
      />
    );
  if (workspace.error || !workspace.data)
    return (
      <ErrorState
        message={
          workspace.error?.message ||
          "The company workspace could not be opened."
        }
        onRetry={() => void workspace.refetch()}
      />
    );
  let view = <OverviewView workspace={workspace.data} />;
  if (location === "/app/onboarding")
    view = <CompanyOnboarding workspace={workspace.data} />;
  else if (location === "/app/agents") view = <AgentsView />;
  else if (location === "/app/icps") view = <IcpView />;
  else if (location === "/app/leads") view = <LeadsView />;
  else if (location.startsWith("/app/leads/"))
    view = <LeadDetailView workspace={workspace.data} />;
  else if (location === "/app/pages")
    view = <PagesView workspace={workspace.data} />;
  else if (location === "/app/outreach") view = <OutreachView />;
  else if (location === "/app/inbox") view = <InboxView />;
  else if (location === "/app/settings")
    view = <SettingsView workspace={workspace.data} />;
  else if (location === "/app/submissions") view = <SubmissionsView />;
  return (
    <LeadloomShell
      workspace={workspace.data}
      user={auth.user}
      onLogout={() => void auth.logout()}
    >
      {view}
    </LeadloomShell>
  );
}
