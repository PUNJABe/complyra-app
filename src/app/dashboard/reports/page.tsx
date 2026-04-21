"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import type { PolicyPayload } from "@/lib/types";
import { exportToPDF, generateReport } from "@/lib/export-utils";
import { useFormatMoney } from "@/lib/use-format-money";

type SeverityFilter = "all" | "high" | "medium";

export default function ReportsPage() {
  const [data, setData] = useState<PolicyPayload | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [sortByAmountDesc, setSortByAmountDesc] = useState(true);
  const [error, setError] = useState("");
  const formatMoney = useFormatMoney();

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/policy", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load reports data.");
        setData((await response.json()) as PolicyPayload);

        await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "report_viewed",
            details: "Reports dashboard opened.",
            resource: "reports",
          }),
        });
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected reports error.");
      }
    };

    void run();
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const filtered = data.findings.filter((item) => {
      const matchesSeverity = filter === "all" || item.severity === filter;
      const text = `${item.merchant} ${item.issue} ${item.explainability.evidence}`.toLowerCase();
      const matchesQuery = !query.trim() || text.includes(query.toLowerCase());
      return matchesSeverity && matchesQuery;
    });

    return filtered.sort((a, b) => (sortByAmountDesc ? b.amount - a.amount : a.amount - b.amount));
  }, [data, filter, query, sortByAmountDesc]);

  const exportPdf = () => {
    const reportRows = rows.map((item) => ({
      Severity: item.severity,
      Merchant: item.merchant,
      Issue: item.issue,
      Amount: formatMoney(item.amount),
      Rule: item.explainability.ruleTriggered,
    }));

    exportToPDF(
      "Complyra Risk Report",
      reportRows.length ? reportRows : [{ Severity: "N/A", Merchant: "N/A", Issue: "No data", Amount: "N/A", Rule: "N/A" }],
      "Generated from Reports"
    );

    void fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "report_export_pdf",
        details: `Exported PDF report with ${rows.length} rows.`,
        resource: "reports",
      }),
    });
  };

  const exportExcel = () => {
    generateReport(
      "Complyra Risk Report",
      rows.map((item) => ({
        Severity: item.severity,
        Merchant: item.merchant,
        Issue: item.issue,
        Amount: item.amount,
        Rule: item.explainability.ruleTriggered,
        Impact: item.explainability.impact,
      })),
      "complyra-risk-report"
    );

    void fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "report_export_excel",
        details: `Exported Excel report with ${rows.length} rows.`,
        resource: "reports",
      }),
    });
  };

  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!data) return <div className="space-y-3"><div className="h-12 animate-pulse rounded-xl bg-canvas" /><div className="h-64 animate-pulse rounded-xl bg-canvas" /></div>;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-canvas/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1E3A8A]">Reports</p>
        <h2 className="mt-2 text-2xl font-semibold">Transaction Reports</h2>
        <p className="mt-1 text-sm text-ink/70">Search, filter, sort, and export CA-ready reports.</p>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/10 bg-white/85 p-4">
        <div className="flex items-center gap-2 rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm">
          <Search size={15} className="text-ink/55" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search merchant, issue, evidence"
            className="w-64 bg-transparent outline-none"
          />
        </div>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value as SeverityFilter)}
          className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All severities</option>
          <option value="high">High only</option>
          <option value="medium">Medium only</option>
        </select>

        <button
          type="button"
          onClick={() => setSortByAmountDesc((current) => !current)}
          className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        >
          Sort by amount {sortByAmountDesc ? "↓" : "↑"}
        </button>

        <button type="button" onClick={exportPdf} className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-3 py-2 text-sm font-semibold text-white">
          <Download size={14} /> Export PDF
        </button>
        <button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-semibold text-ink">
          <Download size={14} /> Export Excel
        </button>
      </section>

      <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white/88">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-canvas/60 text-ink/65">
            <tr>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Merchant</th>
              <th className="px-4 py-3 font-medium">Issue</th>
              <th className="px-4 py-3 font-medium">Rule</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.id}
                title={`${item.explainability.evidence} | Impact: ${item.explainability.impact}`}
                className={`border-t border-ink/8 transition hover:bg-canvas/70 ${item.severity === "high" ? "bg-rose-50/60" : ""}`}
              >
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.severity === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                    {item.severity}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-ink/85">{item.merchant}</td>
                <td className="px-4 py-3 text-ink/75">{item.issue}</td>
                <td className="px-4 py-3 text-ink/65">{item.explainability.ruleTriggered}</td>
                <td className="px-4 py-3 text-right font-semibold text-ink/85">{formatMoney(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
