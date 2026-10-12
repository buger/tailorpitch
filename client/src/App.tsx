import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage, { PrivacyPage } from "./pages/LandingPage";
import PublicPage from "./pages/PublicPage";
import AppWorkspace from "./pages/AppWorkspace";

function Router() {
  return <Switch>
    <Route path="/" component={LandingPage} />
    <Route path="/privacy" component={PrivacyPage} />
    <Route path="/p/:token" component={PublicPage} />
    <Route path="/app" component={AppWorkspace} />
    <Route path="/app/leads" component={AppWorkspace} />
    <Route path="/app/leads/:id" component={AppWorkspace} />
    <Route path="/app/icps" component={AppWorkspace} />
    <Route path="/app/pages" component={AppWorkspace} />
    <Route path="/app/outreach" component={AppWorkspace} />
    <Route path="/app/inbox" component={AppWorkspace} />
    <Route path="/app/settings" component={AppWorkspace} />
    <Route path="/app/submissions" component={AppWorkspace} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
