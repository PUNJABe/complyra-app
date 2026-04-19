"use client";

import { useEffect, useState } from "react";
import { Fragment } from "react";

import type { PolicyPayload } from "@/lib/types";
import { useFormatMoney } from "@/lib/use-format-money";

export default function DashboardPolicyPage() {
  const [data, setData] = useState<PolicyPayload | null>(null);
  const [error, setError] = useState("");
  const formatMoney = useFormatMoney();

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/policy", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load policy data.");
        const payload = (await response.json()) as PolicyPayload;
        setData(payload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected policy error.");
      }
    };

    run();
  }, []);

  if (error) {
    return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  }

  if (!data) {
    return <p className="text-sm text-ink/70">Loading policy engine...</p>;
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Total Findings</p>
          <p className="mt-2 text-3xl font-semibold">{data.summary.totalFindings}</p>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">High Severity</p>
          <p className="mt-2 text-3xl font-semibold">{data.summary.highSeverity}</p>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Medium Severity</p>
          <p className="mt-2 text-3xl font-semibold">{data.summary.mediumSeverity}</p>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Top Exposure</p>
          <p className="mt-2 text-3xl font-semibold">{formatMoney(data.summary.exposure)}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/82 p-5">
        <h2 className="text-lg font-semibold">Findings Queue</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-ink/55">
                <th className="pb-3 font-medium">Severity</th>
                <th className="pb-3 font-medium">Issue</th>
                <th className="pb-3 font-medium">Merchant</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.findings.map((item) => (
                <Fragment key={item.id}>
                  <tr className="border-b border-ink/8">
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.severity === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                        {item.severity}
                      </span>
                    </td>
                    <td className="py-3 text-ink/80">{item.issue}</td>
                    <td className="py-3">{item.merchant}</td>
                    <td className="py-3">{item.date}</td>
                    <td className="py-3 text-right font-medium">{formatMoney(item.amount)}</td>
                  </tr>
                  <tr className="border-b border-ink/8 last:border-b-0">
                    <td colSpan={5} className="pb-4 pt-2">
                      <div className="grid gap-2 rounded-xl bg-canvas/70 p-3 text-xs text-ink/70 md:grid-cols-2">
                        <p><span className="font-semibold text-ink/80">Why:</span> {item.explainability.whyFlagged}</p>
                        <p><span className="font-semibold text-ink/80">Evidence:</span> {item.explainability.evidence}</p>
                        <p><span className="font-semibold text-ink/80">Rule:</span> {item.explainability.ruleTriggered}</p>
                        <p><span className="font-semibold text-ink/80">Impact:</span> {item.explainability.impact}</p>
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
