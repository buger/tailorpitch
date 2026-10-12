import type { ReactNode } from "react";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  FileText,
  Inbox,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { Workspace } from "./leadloom-types";
import {
  LeadloomMark,
  LeadloomWordmark,
  MonoLabel,
  StatusChip,
} from "./LeadloomUI";

const nav = [
  { href: "/app", label: "Overview", icon: BarChart3 },
  { href: "/app/agents", label: "Agents & pipeline", icon: Sparkles },
  { href: "/app/icps", label: "Profiles", icon: Sparkles },
  { href: "/app/leads", label: "Leads", icon: Users },
  { href: "/app/pages", label: "Pages", icon: FileText },
  { href: "/app/outreach", label: "Outreach", icon: BookOpen },
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/submissions", label: "Submissions", icon: BarChart3 },
];

export function LeadloomShell({
  children,
  workspace,
  user,
  onLogout,
}: {
  children: ReactNode;
  workspace: Workspace;
  user: { name?: string | null; email?: string | null };
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const current =
    nav.find(item => item.href === location) ??
    (location === "/app/settings"
      ? { label: "Settings" }
      : location === "/app/onboarding"
        ? { label: "Company onboarding" }
        : nav[0]);
  const go = (href: string) => {
    setLocation(href);
    setOpen(false);
  };
  return (
    <div className="workspace-layout min-h-screen bg-paper text-ink lg:flex">
      <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-paper px-5 lg:hidden">
        <LeadloomWordmark compact />
        <button
          className="p-2"
          onClick={() => setOpen(v => !v)}
          aria-label="Toggle navigation"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div
          className="fixed inset-0 z-20 bg-ink/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-line bg-paper transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
      >
        <div className="flex h-20 items-center border-b border-line px-6">
          <LeadloomWordmark />
        </div>
        <div className="flex-1 px-4 py-7">
          <MonoLabel className="mb-3 block px-3">Workspace</MonoLabel>
          <nav className="space-y-1">
            {nav.map((item, index) => {
              const active =
                location === item.href ||
                (item.href === "/app/leads" &&
                  location.startsWith("/app/leads/"));
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => go(item.href)}
                  className={`flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition ${active ? "border-l-2 border-terracotta bg-ink/[.035] text-ink" : "border-l-2 border-transparent text-ink-muted hover:bg-ink/[0.035] hover:text-ink"}`}
                >
                  <span
                    className={`w-5 shrink-0 font-mono text-[9px] ${active ? "text-terracotta" : "text-ink-muted/60"}`}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.label}</span>
                  {item.href === "/app/leads" && workspace.stats.leads > 0 && (
                    <span
                      className={`ml-auto font-mono text-[10px] ${active ? "text-terracotta" : "text-ink-muted"}`}
                    >
                      {workspace.stats.leads}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="my-7 border-t border-line" />
          <MonoLabel className="mb-3 block px-3">Company</MonoLabel>
          <button
            onClick={() => go("/app/onboarding")}
            className={`flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left text-sm ${location === "/app/onboarding" ? "border-terracotta bg-ink/[.035] text-ink" : "border-transparent text-ink-muted hover:bg-ink/[.035] hover:text-ink"}`}
          >
            <span className="w-[17px] font-mono text-xs">↗</span>Website
            onboarding
          </button>
          <button
            onClick={() => go("/app/settings")}
            className={`flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm ${location === "/app/settings" ? "border-l-2 border-terracotta bg-ink/[.035] text-ink" : "border-l-2 border-transparent text-ink-muted hover:bg-ink/[0.035] hover:text-ink"}`}
          >
            <Settings className="h-[17px] w-[17px]" strokeWidth={1.7} />
            Settings
          </button>
        </div>
        <div className="border-t border-line p-4">
          <div className="mb-4 flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-xs font-medium text-ink">
              {(user.name || user.email || "P").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">
                {user.name || "Proof pilot"}
              </p>
              <p className="truncate text-[11px] text-ink-muted">
                {user.email}
              </p>
            </div>
          </div>
          <button
            className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-xs text-ink-muted hover:bg-ink/[0.05] hover:text-ink"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
      <main className="workspace-surface min-w-0 flex-1">
        <div className="hidden h-20 items-center justify-between border-b border-line px-8 lg:flex">
          <div>
            <MonoLabel>
              {workspace.company.name} / {current.label}
            </MonoLabel>
          </div>
          <div className="flex items-center gap-4">
            <StatusChip tone={workspace.role === "owner" ? "good" : "neutral"}>
              {workspace.role}
            </StatusChip>
            <div className="flex items-center gap-2 text-xs text-ink-muted">
              <LeadloomMark size={16} />
              {workspace.company.name}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          {children}
        </div>
      </main>
    </div>
  );
}
