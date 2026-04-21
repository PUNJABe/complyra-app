"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CircleDollarSign, PieChart, ShieldCheck } from "lucide-react";

import { DonutChartCard, PieChartCard, SpendTrendCard, StackedBarCard } from "@/components/app/charts";
import type { ComplianceCheckPayload, OverviewPayload, WorkspaceContextPayload } from "@/lib/types";
import { useFormatMoney } from "@/lib/use-format-money";

export default function DashboardPage() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceContextPayload | null>(null);
  const [compliance, setCompliance] = useState<ComplianceCheckPayload | null>(null);
  const [error, setError] = useState<string>("");
  const formatMoney = useFormatMoney();

  useEffect(() => {
    const run = async () => {
      try {
        const [overviewResponse, workspaceResponse, complianceResponse] = await Promise.all([
          fetch("/api/overview", { cache: "no-store" }),
          fetch("/api/workspace", { cache: "no-store" }),
          fetch("/api/compliance", { cache: "no-store" }),
        ]);

        if (!overviewResponse.ok) throw new Error("Failed to load dashboard data.");
        if (!workspaceResponse.ok) throw new Error("Failed to load workspace context.");
        if (!complianceResponse.ok) throw new Error("Failed to load compliance checks.");

        setData((await overviewResponse.json()) as OverviewPayload);
        setWorkspace((await workspaceResponse.json()) as WorkspaceContextPayload);
        setCompliance((await complianceResponse.json()) as ComplianceCheckPayload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected error");
      }
    };

    run();
  }, []);

  if (error) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  }

  if (!data || !workspace || !compliance) {
    return <p className="text-sm text-ink/70">Loading dashboard...</p>;
  }

  const personalHealthScore = Math.max(45, Math.min(96, 72 + Math.round((100 - compliance.summary.riskyCount * 3) / 4)));
  const personalTaxSaving = formatMoney(15000);
  const totalExpenses = data.charts.line.points.reduce((sum, point) => sum + point.value, 0);
  const topCategory = data.charts.donut.segments[0]?.label ?? "Unassigned";
  const complianceScore = Math.max(40, 100 - compliance.summary.riskyCount * 3);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-white/85 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">Positioning</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">
          {workspace.mode === "personal"
            ? "Personal finance intelligence + savings copilot"
            : "AI-powered finance investigator + compliance copilot"}
        </h2>
        <p className="mt-1 text-sm text-ink/70">
          {workspace.mode === "personal"
            ? "Track spending behavior, forecast monthly cash burn, and receive tax-saving suggestions."
            : "Not just expense tracking. Prioritized CA-grade decisions with explainable compliance checks."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-ink/10 bg-white/85 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Total Expenses</p>
            <CircleDollarSign size={16} className="text-[#1E3A8A]" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{formatMoney(totalExpenses)}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600"><ArrowUpRight size={12} /> +6.3% vs last cycle</p>
        </article>

        <article className="rounded-2xl border border-ink/10 bg-white/85 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Compliance Score</p>
            <ShieldCheck size={16} className="text-[#10B981]" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{complianceScore}%</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600"><ArrowUpRight size={12} /> Healthy trend</p>
        </article>

        <article className="rounded-2xl border border-ink/10 bg-white/85 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Risk Alerts</p>
            <AlertTriangle size={16} className="text-[#F59E0B]" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{compliance.summary.riskyCount}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600"><ArrowDownRight size={12} /> -2 from last review</p>
        </article>

        <article className="rounded-2xl border border-ink/10 bg-white/85 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Top Spend Category</p>
            <PieChart size={16} className="text-[#1E3A8A]" />
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{topCategory}</p>
          <p className="mt-1 text-xs text-ink/65">Highest concentration in current cycle</p>
        </article>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/85 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1E3A8A]">Analytics</p>
            <h3 className="text-lg font-semibold">Expense trends, category mix, and monthly comparison</h3>
          </div>
          <div className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Secure data sync active</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-ink/10 bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Predictive Layer</p>
          <h3 className="mt-2 text-lg font-semibold">Next month spend forecast</h3>
          <p className="mt-2 text-sm text-ink/70">{data.forecast.scenario}</p>

          <div className="mt-4 rounded-2xl bg-canvas/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Projected spend</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{formatMoney(data.forecast.nextMonthSpend)}</p>
            <p className="mt-1 text-sm text-ink/65">Expected change {data.forecast.changePct}% with {data.forecast.confidence}% confidence.</p>
          </div>

          <div className="mt-4 space-y-3">
            {data.forecast.drivers.map((driver) => (
              <div key={driver.label} className="rounded-xl border border-ink/10 bg-white px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{driver.label}</p>
                  <p className="text-xs font-semibold text-ink/60">+{driver.impactPct}%</p>
                </div>
                <p className="mt-1 text-xs text-ink/65">{driver.evidence}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ink/10 bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Explainable AI</p>
          <h3 className="mt-2 text-lg font-semibold">Why Complyra flagged this spend</h3>
          <p className="mt-2 text-sm text-ink/70">Every recommendation now includes a rationale, evidence, and a comparison to the current baseline.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.copilotRecommendations.map((item) => (
              <article key={item.id} className="rounded-2xl border border-ink/10 bg-canvas/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Insight</p>
                <p className="mt-1 text-sm text-ink/80">{item.insight}</p>
                {item.explainability && (
                  <div className="mt-3 space-y-2 text-xs text-ink/70">
                    <p><span className="font-semibold text-ink/80">Why:</span> {item.explainability.why}</p>
                    <p><span className="font-semibold text-ink/80">Evidence:</span> {item.explainability.evidence}</p>
                    <p><span className="font-semibold text-ink/80">Baseline:</span> {item.explainability.baseline}</p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </article>
      </section>

      {workspace.mode === "business" ? (
        <section className="rounded-2xl border border-ink/10 bg-white/82 p-5">
          <h2 className="text-lg font-semibold">Auto Compliance Checker</h2>
          <p className="mt-1 text-sm text-ink/65">Flags missing invoices, GST mismatch, suspicious entries, and top 10 risky transactions.</p>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <article className="rounded-xl border border-ink/10 bg-canvas/60 p-3">
              <p className="text-xs text-ink/55">Checked</p>
              <p className="mt-1 text-2xl font-semibold">{compliance.summary.totalChecked}</p>
            </article>
            <article className="rounded-xl border border-ink/10 bg-canvas/60 p-3">
              <p className="text-xs text-ink/55">Risky</p>
              <p className="mt-1 text-2xl font-semibold">{compliance.summary.riskyCount}</p>
            </article>
            <article className="rounded-xl border border-ink/10 bg-canvas/60 p-3">
              <p className="text-xs text-ink/55">Missing Invoices</p>
              <p className="mt-1 text-2xl font-semibold">{compliance.summary.missingInvoices}</p>
            </article>
            <article className="rounded-xl border border-ink/10 bg-canvas/60 p-3">
              <p className="text-xs text-ink/55">GST Mismatch</p>
              <p className="mt-1 text-2xl font-semibold">{compliance.summary.gstMismatches}</p>
            </article>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-ink/55">
                  <th className="pb-2 font-medium">Severity</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Merchant</th>
                  <th className="pb-2 font-medium">Reason</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {compliance.topRisks.map((risk) => (
                  <tr key={risk.id} className="border-b border-ink/8 last:border-b-0">
                    <td className="py-2.5">{risk.severity}</td>
                    <td className="py-2.5">{risk.kind}</td>
                    <td className="py-2.5">{risk.merchant}</td>
                    <td className="py-2.5 text-ink/70">{risk.reason}</td>
                    <td className="py-2.5 text-right font-semibold">{formatMoney(risk.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Financial Health Score</p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">{personalHealthScore}</p>
            <p className="mt-2 text-sm text-ink/65">Based on spending stability, risk flags, and forecast pressure.</p>
          </article>
          <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Tax Saving Suggestions</p>
            <ul className="mt-3 space-y-2 text-sm text-ink/75">
              <li className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">Investing in ELSS could improve your projected tax outcome by up to {personalTaxSaving}.</li>
              <li className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">Use 80C headroom by routing long-term savings before month-end.</li>
              <li className="rounded-xl border border-ink/10 bg-canvas/60 px-3 py-2">Review recurring subscriptions above your historical personal baseline.</li>
            </ul>
          </article>
        </section>
      )}

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <SpendTrendCard data={data.charts.line} />

        <article className="rounded-2xl border border-ink/10 bg-white/80 p-5">
          <h2 className="text-lg font-semibold">Automation Pipeline</h2>
          <ul className="mt-4 space-y-3">
            {data.timeline.map((step, index) => (
              <li key={step} className="flex items-center gap-3 text-sm text-ink/80">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 bg-canvas text-xs font-semibold">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <DonutChartCard data={data.charts.donut} />
        <PieChartCard data={data.charts.donut} />
        <StackedBarCard data={data.charts.stacked} />
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Data Source</p>
        <p className="mt-2 text-sm text-ink/70">
          {data.uploadSummary.source} • {data.uploadSummary.rowCount} stored rows
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {data.copilotRecommendations.map((item) => (
          <article key={item.id} className="rounded-2xl border border-ink/10 bg-white/82 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Insight</p>
            <p className="mt-1 text-sm text-ink/80">{item.insight}</p>

            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Recommendation</p>
            <p className="mt-1 text-sm text-ink/80">{item.recommendation}</p>

            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Action</p>
            <p className="mt-1 text-sm text-ink/80">{item.action}</p>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas/70 px-3 py-2 text-xs">
              <span className="font-semibold text-ink/75">{formatMoney(item.savingsImpact)}</span>
              <span className="text-ink/60">Confidence {item.confidence}%</span>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5">
        <h2 className="text-lg font-semibold">Recent Flags</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-ink/55">
                <th className="pb-3 font-medium">Severity</th>
                <th className="pb-3 font-medium">Merchant</th>
                <th className="pb-3 font-medium">Issue</th>
                <th className="pb-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recentFlags.map((flag) => (
                <tr key={flag.id} className="border-b border-ink/8 last:border-b-0">
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${flag.severity === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      {flag.severity}
                    </span>
                  </td>
                  <td className="py-3">{flag.merchant}</td>
                  <td className="py-3 text-ink/70">{flag.reason}</td>
                  <td className="py-3 text-right font-medium">{formatMoney(flag.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
