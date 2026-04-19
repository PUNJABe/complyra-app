"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CurrencyToggle } from "./currency-toggle";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/copilot", label: "Copilot" },
  { href: "/dashboard/investigator", label: "Investigator" },
  { href: "/dashboard/insights", label: "Insights" },
  { href: "/dashboard/chat", label: "Chat" },
  { href: "/dashboard/policy", label: "Policy" },
  { href: "/dashboard/policy-builder", label: "Policy Builder" },
  { href: "/dashboard/integrations", label: "Integrations" },
  { href: "/onboarding", label: "Onboarding" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-7xl px-6 pb-10 pt-6 md:px-10">
      <header className="mb-6 rounded-2xl border border-ink/10 bg-white/80 p-4 backdrop-blur-md md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">Complyra</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Finance Workspace</h1>
            <p className="text-sm text-ink/65">Smart platform that ensures financial rules are followed</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-ink text-canvas"
                        : "border border-ink/20 bg-white text-ink/75 hover:border-ink/45"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <CurrencyToggle />
              <ThemeToggle />
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="rounded-full border border-ink/20 bg-white px-4 py-2 text-sm font-medium text-ink/75 transition hover:border-ink/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
