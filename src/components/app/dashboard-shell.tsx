"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  FileBarChart2,
  FolderUp,
  Gauge,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  ClipboardList,
  LogOut,
} from "lucide-react";
import type { WorkspaceContextPayload, WorkspaceMode } from "@/lib/types";
import { CurrencyToggle } from "./currency-toggle";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/upload", label: "Upload Data", icon: FolderUp },
  { href: "/dashboard/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/dashboard/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/dashboard/insights", label: "AI Insights", icon: Sparkles },
  { href: "/dashboard/audit-logs", label: "Audit Logs", icon: ClipboardList },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workspace, setWorkspace] = useState<WorkspaceContextPayload | null>(null);
  const [riskSummary, setRiskSummary] = useState<{ riskyCount: number; missingInvoices: number } | null>(null);
  const [newClient, setNewClient] = useState("");

  const loadWorkspace = async () => {
    const [workspaceResponse, complianceResponse] = await Promise.all([
      fetch("/api/workspace", { cache: "no-store" }),
      fetch("/api/compliance", { cache: "no-store" }),
    ]);
    if (workspaceResponse.ok) {
      setWorkspace((await workspaceResponse.json()) as WorkspaceContextPayload);
    }
    if (complianceResponse.ok) {
      const payload = (await complianceResponse.json()) as {
        summary?: { riskyCount?: number; missingInvoices?: number };
      };
      setRiskSummary({
        riskyCount: payload.summary?.riskyCount ?? 0,
        missingInvoices: payload.summary?.missingInvoices ?? 0,
      });
    }
  };

  useEffect(() => {
    // Defer initial fetch so state updates are not performed synchronously in the effect body.
    const frame = window.requestAnimationFrame(() => {
      void loadWorkspace();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const updateMode = async (mode: WorkspaceMode) => {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (response.ok) {
      setWorkspace((await response.json()) as WorkspaceContextPayload);
      router.refresh();
    }
  };

  const switchClient = async (clientId: string) => {
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activeClientId: clientId }),
    });
    if (response.ok) {
      setWorkspace((await response.json()) as WorkspaceContextPayload);
      router.refresh();
    }
  };

  const addClient = async () => {
    const trimmed = newClient.trim();
    if (!trimmed) return;
    const response = await fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addClient: { name: trimmed } }),
    });
    if (response.ok) {
      setWorkspace((await response.json()) as WorkspaceContextPayload);
      setNewClient("");
      router.refresh();
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <div className="grid min-h-screen grid-cols-1 gap-4 p-4 md:grid-cols-[auto_minmax(0,1fr)_320px]">
      <aside
        className={`rounded-3xl border border-ink/10 bg-white/85 p-3 backdrop-blur-md transition-all duration-300 ${
          sidebarCollapsed ? "w-[82px]" : "w-[250px]"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className={`flex items-center gap-2 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E3A8A] text-white">CR</div>
            {!sidebarCollapsed && (
              <div>
                <p className="text-sm font-semibold text-ink">Complyra</p>
                <p className="text-[11px] text-ink/60">Secure Finance OS</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((current) => !current)}
            className="rounded-lg border border-ink/15 bg-canvas/70 p-2 text-ink/70 transition hover:border-ink/30"
            aria-label="Toggle sidebar"
          >
            <Menu size={16} />
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#1E3A8A] text-white"
                    : "text-ink/75 hover:bg-canvas hover:text-ink"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={16} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className={`mt-4 flex w-full items-center gap-2 rounded-xl border border-ink/15 px-3 py-2.5 text-sm font-medium text-ink/70 transition hover:border-ink/30 ${sidebarCollapsed ? "justify-center" : ""}`}
        >
          <LogOut size={15} />
          {!sidebarCollapsed && <span>{loggingOut ? "Signing out..." : "Sign out"}</span>}
        </button>
      </aside>

      <main className="min-w-0">
        <header className="mb-4 rounded-3xl border border-ink/10 bg-white/88 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Secure Session Active</p>
              <h1 className="text-xl font-semibold text-ink md:text-2xl">Finance Command Center</h1>
              <p className="text-sm text-ink/65">
                {workspace?.mode === "personal"
                  ? "Personal mode: savings and tax optimization"
                  : "Company mode: policy enforcement and audit readiness"}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck size={14} />
                Encrypted
              </div>
              <div className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <Bell size={14} />
                {riskSummary?.riskyCount ?? 0} Risks
              </div>

              <div className="rounded-full border border-ink/15 bg-canvas/70 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => updateMode("personal")}
                  className={`rounded-full px-3 py-1 ${workspace?.mode === "personal" ? "bg-[#1E3A8A] text-white" : "text-ink/70"}`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => updateMode("business")}
                  className={`rounded-full px-3 py-1 ${workspace?.mode !== "personal" ? "bg-[#1E3A8A] text-white" : "text-ink/70"}`}
                >
                  Company
                </button>
              </div>

            {workspace?.mode === "business" && (
              <>
                <select
                  value={workspace.activeClientId ?? ""}
                  onChange={(event) => void switchClient(event.target.value)}
                  className="rounded-full border border-ink/20 bg-white px-3 py-2 text-sm text-ink/80"
                >
                  {workspace.clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <input
                  value={newClient}
                  onChange={(event) => setNewClient(event.target.value)}
                  placeholder="Add client"
                  className="w-36 rounded-full border border-ink/20 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addClient}
                  className="rounded-full border border-ink/20 bg-white px-3 py-2 text-sm font-medium text-ink/80"
                >
                  Add
                </button>
              </>
            )}
            <CurrencyToggle />
              <ThemeToggle />
          </div>
        </div>
      </header>

        <section className="rounded-3xl border border-ink/10 bg-white/86 p-4 md:p-5">{children}</section>
      </main>

      <aside className="hidden rounded-3xl border border-ink/10 bg-white/88 p-4 backdrop-blur-md md:block">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#1E3A8A]" />
          <p className="text-sm font-semibold">AI Insights</p>
        </div>
        <div className="mt-3 space-y-3">
          <article className="rounded-2xl border border-ink/10 bg-canvas/70 p-3">
            <p className="text-xs text-ink/55">Trend</p>
            <p className="mt-1 text-sm font-medium text-ink/80">Travel expenses increased by 23% this month.</p>
          </article>
          <article className="rounded-2xl border border-ink/10 bg-canvas/70 p-3">
            <p className="text-xs text-ink/55">Compliance</p>
            <p className="mt-1 text-sm font-medium text-ink/80">{riskSummary?.riskyCount ?? 0} transactions need policy review.</p>
          </article>
          <article className="rounded-2xl border border-ink/10 bg-canvas/70 p-3">
            <p className="text-xs text-ink/55">Missing Docs</p>
            <p className="mt-1 text-sm font-medium text-ink/80">{riskSummary?.missingInvoices ?? 0} receipts are missing invoices.</p>
          </article>

          <div className="rounded-2xl border border-[#1E3A8A]/20 bg-[#1E3A8A]/5 p-3">
            <p className="text-xs font-semibold text-[#1E3A8A]">One-click summary</p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/reports")}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-3 py-2 text-xs font-semibold text-white"
            >
              <Gauge size={14} />
              Generate CA-ready report
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
