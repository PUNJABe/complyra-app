"use client";

import { useState } from "react";
import { generateReport } from "@/lib/export-utils";

interface ComplianceMetric {
  name: string;
  status: "compliant" | "warning" | "non-compliant";
  percentage: number;
  description: string;
}

interface AuditReportProps {
  period: string;
  metrics: ComplianceMetric[];
  totalTransactions: number;
  flaggedTransactions: number;
  complianceRate: number;
}

export function AuditComplianceReport({ period, metrics, totalTransactions, flaggedTransactions, complianceRate }: AuditReportProps) {
  const [showDetails, setShowDetails] = useState(false);

  const exportReport = () => {
    const reportData = [
      {
        "Audit Period": period,
        "Total Transactions": totalTransactions,
        "Flagged Transactions": flaggedTransactions,
        "Overall Compliance Rate": `${complianceRate}%`,
        "Report Generated": new Date().toLocaleString(),
      },
      ...metrics.map((m) => ({
        "Compliance Area": m.name,
        Status: m.status.toUpperCase(),
        "Compliance %": `${m.percentage}%`,
        Details: m.description,
      })),
    ];

    generateReport("Compliance Audit Report", reportData, `compliance-audit-${period}`);
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/80 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">📋 Audit Compliance Report</h2>
          <p className="text-xs text-ink/60 mt-1">Period: {period}</p>
        </div>
        <button
          onClick={exportReport}
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas transition hover:bg-ink/90"
        >
          📥 Export Report
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-4">
        <div className="rounded-lg border border-ink/10 bg-canvas/50 p-3">
          <p className="text-xs text-ink/60 uppercase tracking-wide">Compliance Rate</p>
          <p className={`text-3xl font-bold mt-1 ${complianceRate >= 90 ? "text-green-600" : complianceRate >= 75 ? "text-amber-600" : "text-rose-600"}`}>
            {complianceRate}%
          </p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-canvas/50 p-3">
          <p className="text-xs text-ink/60 uppercase tracking-wide">Transactions</p>
          <p className="text-3xl font-bold mt-1 text-ink/80">{totalTransactions}</p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-canvas/50 p-3">
          <p className="text-xs text-ink/60 uppercase tracking-wide">Flagged</p>
          <p className="text-3xl font-bold mt-1 text-rose-600">{flaggedTransactions}</p>
        </div>
      </div>

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-sm font-medium text-ink/75 hover:text-ink/90 mb-3"
      >
        {showDetails ? "Hide Details" : "Show Compliance Breakdown"}
      </button>

      {showDetails && (
        <div className="space-y-2 border-t border-ink/10 pt-4">
          {metrics.map((metric) => (
            <div key={metric.name} className="rounded-lg border border-ink/10 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-ink/80">{metric.name}</p>
                <p
                  className={`text-sm font-bold ${
                    metric.status === "compliant"
                      ? "text-green-600"
                      : metric.status === "warning"
                        ? "text-amber-600"
                        : "text-rose-600"
                  }`}
                >
                  {metric.percentage}%
                </p>
              </div>
              <div className="w-full bg-canvas/70 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition ${
                    metric.status === "compliant"
                      ? "bg-green-500"
                      : metric.status === "warning"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                  }`}
                  style={{ width: `${metric.percentage}%` }}
                />
              </div>
              <p className="text-xs text-ink/60 mt-2">{metric.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
