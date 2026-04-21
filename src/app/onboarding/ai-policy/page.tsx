"use client";

import { useState } from "react";
import { ArrowLeft, Check, Edit2 } from "lucide-react";
import Link from "next/link";

interface Budget {
  category: string;
  suggestedMonthly: number;
  baseAverage: number;
}

interface Analysis {
  suggestedBudgets: Budget[];
  categoryBreakdown: Array<{ category: string; total: number; percentage: number }>;
}

function initializeAnalysis(): { analysis: Analysis | null; budgets: Budget[] } {
  if (typeof window === "undefined") return { analysis: null, budgets: [] };
  
  const stored = localStorage.getItem("onboarding_analysis");
  if (stored) {
    const parsed = JSON.parse(stored);
    return {
      analysis: parsed,
      budgets: parsed.suggestedBudgets || [],
    };
  }
  return { analysis: null, budgets: [] };
}

export default function AIPolicyPage() {
  const [analysis] = useState<Analysis | null>(() => initializeAnalysis().analysis);
  const [budgets] = useState<Budget[]>(() => initializeAnalysis().budgets);
  const [approving, setApproving] = useState(false);

  const totalMonthly = budgets.reduce((sum, b) => sum + b.suggestedMonthly, 0);

  const onApprove = async () => {
    setApproving(true);
    try {
      // Save the policy
      const policy = {
        mode: "ai_auto",
        budgets,
        totalMonthlyBudget: totalMonthly,
        status: "approved",
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("active_policy", JSON.stringify(policy));
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    } finally {
      setApproving(false);
    }
  };

  if (!analysis) {
    return (
      <div className="mx-auto w-full max-w-2xl px-6 pb-12 pt-8 md:px-10">
        <div className="text-center text-rose-700">Error: No analysis data found</div>
        <Link href="/onboarding" className="text-center block mt-4 text-accent hover:underline">
          Start over
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-12 pt-8 md:px-10">
      {/* Header */}
      <div className="mb-8">
        <Link href="/onboarding" className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink mb-4 transition">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">AI Policy Review</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your generated policy</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          Complyra analyzed your spending patterns and created a personalized compliance policy. Review and approve below.
        </p>
      </div>

      <div className="space-y-6">
        {/* Policy Summary Card */}
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Recommended monthly spend</p>
              <p className="text-4xl font-bold text-ink mt-2">₹{totalMonthly.toLocaleString()}</p>
            </div>
            <div className="rounded-full bg-accent/10 p-3">
              <Check className="h-6 w-6 text-accent" />
            </div>
          </div>
          <p className="text-sm text-accent/80">
            This budget is based on your recent spending and includes a 10% buffer for flexibility.
          </p>
        </div>

        {/* Budget Breakdown */}
        <div className="rounded-2xl border border-ink/10 bg-white/85 p-6 shadow-[0_18px_50px_-38px_rgba(17,24,39,0.45)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55 mb-4">Category budgets</p>
          <div className="space-y-4">
            {budgets.map((budget) => (
              <div key={budget.category} className="flex items-center justify-between pb-4 border-b border-ink/10 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-ink">{budget.category}</p>
                  <p className="text-xs text-ink/60 mt-1">
                    Based on avg ₹{budget.baseAverage.toLocaleString()}/month
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-ink">₹{budget.suggestedMonthly.toLocaleString()}</p>
                  <p className="text-xs text-ink/60 mt-1">
                    {Math.round(
                      (budget.suggestedMonthly / totalMonthly) * 100
                    )}% of budget
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onApprove}
            disabled={approving}
            className="flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60"
          >
            {approving ? "Approving..." : "✓ Approve Policy"}
          </button>
          <Link
            href="/onboarding/hybrid-mode"
            className="flex-1 rounded-full border border-ink/25 bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-ink/60 flex items-center justify-center gap-2"
          >
            <Edit2 className="h-4 w-4" /> Edit
          </Link>
        </div>

        {/* Trust message */}
        <p className="text-center text-xs text-ink/60">
          You can edit categories and limits anytime in <Link href="/dashboard/settings" className="text-accent hover:underline">Settings</Link>
        </p>
      </div>
    </div>
  );
}
