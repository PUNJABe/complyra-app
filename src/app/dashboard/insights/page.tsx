"use client";

import { useEffect, useMemo, useState } from "react";

import { DepartmentLeaderboard } from "@/components/app/department-leaderboard";
import { CostOptimizationWidget } from "@/components/app/cost-optimization-widget";
import { AuditComplianceReport } from "@/components/app/audit-compliance-report";
import { exportToPDF } from "@/lib/export-utils";
import type {
  ComplianceCheckPayload,
  DepartmentScore,
  WorkspaceContextPayload,
} from "@/lib/types";
import { useFormatMoney } from "@/lib/use-format-money";

const mockDepartments: DepartmentScore[] = [
  { name: "Engineering", compliance: 94, violations: 2, totalTransactions: 156, trend: "up" },
  { name: "Marketing", compliance: 87, violations: 6, totalTransactions: 142, trend: "stable" },
  { name: "Sales", compliance: 91, violations: 3, totalTransactions: 128, trend: "up" },
  { name: "Operations", compliance: 76, violations: 12, totalTransactions: 198, trend: "down" },
  { name: "Finance", compliance: 98, violations: 1, totalTransactions: 89, trend: "stable" },
];

const mockOptimizations = [
  {
    id: "1",
    title: "Consolidate Travel Vendors",
    description: "Switch primary travel booking to corporate rate provider",
    currentSpend: 24500,
    potentialSavings: 3675,
    savingsPercentage: 15,
    category: "Travel",
    priority: "high" as const,
  },
  {
    id: "2",
    title: "Negotiate SaaS Renewal",
    description: "Aggregate usage across teams for volume discount",
    currentSpend: 18900,
    potentialSavings: 5670,
    savingsPercentage: 30,
    category: "Software",
    priority: "high" as const,
  },
  {
    id: "3",
    title: "Switch Meal Service Provider",
    description: "Use preferred catering vendor for 20% savings",
    currentSpend: 8400,
    potentialSavings: 1680,
    savingsPercentage: 20,
    category: "Meals",
    priority: "medium" as const,
  },
];

const mockComplianceMetrics = [
  {
    name: "Policy Adherence",
    status: "compliant" as const,
    percentage: 94,
    description: "94% of transactions comply with spending policies",
  },
  {
    name: "Approval Rate",
    status: "compliant" as const,
    percentage: 98,
    description: "98% of flagged items properly reviewed and approved",
  },
  {
    name: "Documentation",
    status: "warning" as const,
    percentage: 81,
    description: "Some receipts missing - 81% of transactions fully documented",
  },
  {
    name: "Audit Trail",
    status: "compliant" as const,
    percentage: 100,
    description: "100% of transactions have complete audit trail",
  },
];

export default function InsightsPage() {
  const [workspace, setWorkspace] = useState<WorkspaceContextPayload | null>(null);
  const [compliance, setCompliance] = useState<ComplianceCheckPayload | null>(null);
  const [error, setError] = useState("");
  const formatMoney = useFormatMoney();
  const taxSavingAmount = formatMoney(15000);

  useEffect(() => {
    const run = async () => {
      try {
        const [workspaceResponse, complianceResponse] = await Promise.all([
          fetch("/api/workspace", { cache: "no-store" }),
          fetch("/api/compliance", { cache: "no-store" }),
        ]);

        if (!workspaceResponse.ok) throw new Error("Failed to load workspace context.");
        if (!complianceResponse.ok) throw new Error("Failed to load compliance checks.");

        setWorkspace((await workspaceResponse.json()) as WorkspaceContextPayload);
        setCompliance((await complianceResponse.json()) as ComplianceCheckPayload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected insights error.");
      }
    };

    void run();
  }, []);

  const selectedClient = useMemo(() => {
    if (!workspace) return null;
    return workspace.clients.find((client) => client.id === workspace.activeClientId) ?? workspace.clients[0] ?? null;
  }, [workspace]);

  const exportClientDashboard = () => {
    if (!compliance || !workspace) return;
    const rows = compliance.topRisks.map((item) => ({
      Severity: item.severity,
      Type: item.kind,
      Merchant: item.merchant,
      Amount: formatMoney(item.amount),
      Reason: item.reason,
    }));

    exportToPDF(
      `${selectedClient?.name ?? workspace.workspaceName} - Compliance Snapshot`,
      rows.length ? rows : [{ Severity: "N/A", Type: "N/A", Merchant: "N/A", Amount: "N/A", Reason: "No risks found" }],
      "Client-ready report generated from Complyra insights"
    );
  };

  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!workspace || !compliance) return <p className="text-sm text-ink/70">Loading insights...</p>;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-white/85 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">Advanced Features</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {workspace.mode === "personal" ? "Personal Insights" : "CA Intelligence Hub"}
        </h2>
        <p className="mt-1 text-sm text-ink/70">
          {workspace.mode === "personal"
            ? "Track your spending behavior, improve savings, and stay prepared for tax season."
            : "Auto compliance checker, AI pre-audit, filing calendar, client dashboard export, and audit trail."}
        </p>
      </section>

      {workspace.mode === "business" ? (
        <>
          <section className="grid gap-4 lg:grid-cols-4">
            <article className="rounded-2xl border border-ink/10 bg-white/82 p-4">
              <p className="text-xs text-ink/55">Auto Compliance Risks</p>
              <p className="mt-1 text-3xl font-semibold">{compliance.summary.riskyCount}</p>
            </article>
            <article className="rounded-2xl border border-ink/10 bg-white/82 p-4">
              <p className="text-xs text-ink/55">Missing Invoices</p>
              <p className="mt-1 text-3xl font-semibold">{compliance.summary.missingInvoices}</p>
            </article>
            <article className="rounded-2xl border border-ink/10 bg-white/82 p-4">
              <p className="text-xs text-ink/55">GST Mismatch</p>
              <p className="mt-1 text-3xl font-semibold">{compliance.summary.gstMismatches}</p>
            </article>
            <article className="rounded-2xl border border-ink/10 bg-white/82 p-4">
              <p className="text-xs text-ink/55">Suspicious Entries</p>
              <p className="mt-1 text-3xl font-semibold">{compliance.summary.suspiciousEntries}</p>
            </article>
          </section>

          <section className="rounded-2xl border border-ink/10 bg-white/82 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Smart Audit Assistant</h3>
                <p className="mt-1 text-sm text-ink/65">Top 10 risky transactions for AI pre-audit review.</p>
              </div>
              <button
                type="button"
                onClick={exportClientDashboard}
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-canvas"
              >
                Export Client Dashboard PDF
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-ink/55">
                    <th className="pb-2 font-medium">Severity</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Merchant</th>
                    <th className="pb-2 font-medium">Evidence</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {compliance.topRisks.map((risk) => (
                    <tr key={risk.id} className="border-b border-ink/8 last:border-b-0">
                      <td className="py-2.5">{risk.severity}</td>
                      <td className="py-2.5">{risk.kind}</td>
                      <td className="py-2.5">{risk.merchant}</td>
                      <td className="py-2.5 text-ink/65">{risk.evidence}</td>
                      <td className="py-2.5 text-right font-semibold">{formatMoney(risk.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
              <h3 className="text-base font-semibold">Filing Calendar + Automation</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink/75">
                {workspace.deadlines.map((deadline) => (
                  <li key={deadline.id} className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span>{deadline.kind} due {deadline.dueDate}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${deadline.status === "overdue" ? "bg-rose-100 text-rose-700" : deadline.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {deadline.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
              <h3 className="text-base font-semibold">Audit Trail System</h3>
              <ul className="mt-3 space-y-2 text-sm text-ink/75">
                {workspace.auditTrail.slice(0, 6).map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">
                    <p className="font-medium">{entry.action}</p>
                    <p className="text-xs text-ink/65">{entry.details}</p>
                    <p className="text-xs text-ink/55">{new Date(entry.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <DepartmentLeaderboard data={mockDepartments} />
            <AuditComplianceReport
              period="Q1 2026"
              metrics={mockComplianceMetrics}
              totalTransactions={713}
              flaggedTransactions={43}
              complianceRate={94}
            />
          </section>

          <CostOptimizationWidget optimizations={mockOptimizations} />
        </>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
            <h3 className="text-base font-semibold">Personal Expense AI</h3>
            <p className="mt-2 text-sm text-ink/70">Your top spend pressure is in subscriptions and travel this month.</p>
            <ul className="mt-3 space-y-2 text-sm text-ink/75">
              <li className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">Subscriptions are 28% above your 90-day average.</li>
              <li className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">Transport spending rose 16% month-over-month.</li>
              <li className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">Food delivery remains stable and within your target band.</li>
            </ul>
          </article>

          <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
            <h3 className="text-base font-semibold">Tax Saving Suggestions</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink/75">
              <li className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">Investing in ELSS could improve your projected tax outcome by up to {taxSavingAmount}.</li>
              <li className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">Set a monthly SIP reminder before payroll credit date.</li>
              <li className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">Use filing checklist to avoid missing ITR documents.</li>
            </ul>
          </article>
        </section>
      )}
    </div>
  );
}
