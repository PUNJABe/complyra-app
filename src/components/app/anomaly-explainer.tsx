"use client";

import { useState } from "react";

interface ExplanationFactor {
  factor: string;
  points: number;
  description: string;
}

interface AnomalyExplainerProps {
  merchantName: string;
  amount: number;
  reason: string;
  severity: "high" | "medium" | "low";
  factors: ExplanationFactor[];
}

export function AnomalyExplainer({ merchantName, amount, reason, severity, factors }: AnomalyExplainerProps) {
  const [expanded, setExpanded] = useState(false);
  const totalScore = factors.reduce((sum, f) => sum + f.points, 0);

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="rounded-lg border border-ink/20 bg-canvas px-3 py-2 text-xs font-medium text-ink/75 transition hover:border-ink/45 hover:bg-white"
      >
        {expanded ? "Hide Explanation" : "Why was this flagged?"}
      </button>

      {expanded && (
        <div className="rounded-lg border border-ink/15 bg-white/50 p-4 text-sm space-y-3">
          <div>
            <p className="font-semibold text-ink/80">Risk Score: {totalScore}</p>
            <p className="text-xs text-ink/60 mt-1">{reason}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase text-ink/55">Factors Contributing to Flag:</p>
            {factors.map((factor, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <div className="flex-shrink-0 w-8 h-6 rounded bg-gradient-to-r from-rose-100 to-rose-50 flex items-center justify-center font-semibold text-rose-700">
                  +{factor.points}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-ink/80">{factor.factor}</p>
                  <p className="text-ink/60">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded bg-canvas/70 p-2 text-xs text-ink/70">
            <p className="font-medium text-ink/75">What to do:</p>
            <p className="mt-1">
              {severity === "high" && "Review and approve or reject. High-risk transactions need manager attention."}
              {severity === "medium" && "Consider if this aligns with your policies. Can be approved with awareness."}
              {severity === "low" && "Low risk - can be auto-approved or quickly reviewed."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
