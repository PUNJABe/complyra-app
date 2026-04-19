"use client";

import { useEffect, useState } from "react";

import { DonutChartCard, LineChartCard, StackedBarCard } from "@/components/app/charts";
import type { OverviewPayload } from "@/lib/types";
import { useFormatMoney } from "@/lib/use-format-money";
import { extractMoneyValue, isMoneyValue } from "@/lib/parse-money";

export default function DashboardPage() {
  const [data, setData] = useState<OverviewPayload | null>(null);
  const [error, setError] = useState<string>("");
  const formatMoney = useFormatMoney();

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/overview", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load dashboard data.");
        const payload = (await response.json()) as OverviewPayload;
        setData(payload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected error");
      }
    };

    run();
  }, []);

  if (error) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-ink/70">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-white/85 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">Positioning</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">AI-powered finance investigator + compliance copilot</h2>
        <p className="mt-1 text-sm text-ink/70">Not just expense tracking. Prioritized decisions with evidence-backed action recommendations.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {data.kpis.map((kpi) => {
          let displayValue = kpi.value;
          
          // Only convert if it's a money value
          if (isMoneyValue(kpi.value)) {
            const numericValue = extractMoneyValue(kpi.value);
            displayValue = formatMoney(numericValue);
          }
          
          return (
            <article key={kpi.label} className="rounded-2xl border border-ink/10 bg-white/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">{kpi.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{displayValue}</p>
              <p className="mt-1 text-sm text-ink/65">{kpi.hint}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <LineChartCard data={data.charts.line} />

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

      <section className="grid gap-4 lg:grid-cols-2">
        <DonutChartCard data={data.charts.donut} />
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
              <span className="font-semibold text-ink/75">{item.savingsImpact}</span>
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
