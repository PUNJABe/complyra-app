"use client";

import { useEffect, useState } from "react";

import { SpendGraphCard } from "@/components/app/spend-graph";
import type { InvestigationPayload } from "@/lib/types";
import { useFormatMoney } from "@/lib/use-format-money";

export default function InvestigatorPage() {
  const [data, setData] = useState<InvestigationPayload | null>(null);
  const [error, setError] = useState("");
  const formatMoney = useFormatMoney();

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/investigation", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load investigation data.");
        setData((await response.json()) as InvestigationPayload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected investigation error.");
      }
    };

    run();
  }, []);

  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!data) return <p className="text-sm text-ink/70">Loading investigation layer...</p>;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-2">
        {data.clusters.map((cluster) => (
          <article key={cluster.id} className="rounded-2xl border border-ink/10 bg-white/82 p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold">{cluster.title}</h3>
              <span className="rounded-full border border-ink/20 bg-canvas px-2 py-1 text-xs font-semibold text-ink/75">Risk {cluster.riskScore}</span>
            </div>
            <p className="mt-2 text-sm text-ink/75">{cluster.pattern}</p>
            <p className="mt-3 text-sm text-ink/70">Employees: {cluster.employees.join(", ")}</p>
            <p className="text-sm text-ink/70">Merchants: {cluster.merchants.join(", ")}</p>
            <p className="mt-2 text-sm font-semibold text-ink/80">Exposure {formatMoney(cluster.totalAmount)}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/82 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Auto-created Investigation Cases</h3>
            <p className="mt-1 text-sm text-ink/65">Cases generated automatically from explainable AI, anomaly spikes, and forecast risk.</p>
          </div>
          <span className="rounded-full border border-ink/20 bg-canvas px-3 py-1 text-xs font-semibold text-ink/70">
            {data.cases.length} open threads
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.cases.map((item) => (
            <article key={item.id} className="rounded-2xl border border-ink/10 bg-canvas/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-sm font-semibold leading-5">{item.title}</h4>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.status === "open" ? "bg-rose-100 text-rose-700" : item.status === "triaged" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-ink/55">Source: {item.source}</p>
              <p className="mt-2 text-sm text-ink/75">{item.reason}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-ink/65">
                <span>Owner: {item.owner}</span>
                <span>Score {item.riskScore}</span>
              </div>
              <p className="mt-2 text-xs text-ink/55">Created {new Date(item.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </section>

      <SpendGraphCard graph={data.graph} />

      <section className="rounded-2xl border border-ink/10 bg-white/82 p-5">
        <h3 className="text-base font-semibold">Employee-Vendor Anomaly Scores</h3>
        <p className="mt-1 text-sm text-ink/65">Scored using per-pair monthly baselines with z-score and trend deltas.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-ink/55">
                <th className="pb-3 font-medium">Employee</th>
                <th className="pb-3 font-medium">Merchant</th>
                <th className="pb-3 text-right font-medium">Baseline</th>
                <th className="pb-3 text-right font-medium">Current</th>
                <th className="pb-3 text-right font-medium">Trend</th>
                <th className="pb-3 text-right font-medium">Z</th>
                <th className="pb-3 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {data.anomalies.map((item) => (
                <tr key={item.id} className="border-b border-ink/8 last:border-b-0">
                  <td className="py-2.5">{item.employee}</td>
                  <td className="py-2.5">{item.merchant}</td>
                  <td className="py-2.5 text-right">{formatMoney(item.baselineMonthlySpend)}</td>
                  <td className="py-2.5 text-right">{formatMoney(item.currentMonthlySpend)}</td>
                  <td className="py-2.5 text-right">{item.trendDeltaPct}%</td>
                  <td className="py-2.5 text-right">{item.zScore}</td>
                  <td className="py-2.5 text-right font-semibold">{item.anomalyScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
