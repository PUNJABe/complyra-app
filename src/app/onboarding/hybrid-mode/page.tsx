"use client";

import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

interface Budget {
  category: string;
  suggestedMonthly: number;
  baseAverage: number;
}

interface Analysis {
  suggestedBudgets: Budget[];
}

function initializeHybrid(): { analysis: Analysis | null; budgets: Budget[]; customBudgets: Record<string, number> } {
  if (typeof window === "undefined") return { analysis: null, budgets: [], customBudgets: {} };
  
  const stored = localStorage.getItem("onboarding_analysis");
  if (stored) {
    const parsed = JSON.parse(stored);
    const buds = parsed.suggestedBudgets || [];
    const initial: Record<string, number> = {};
    buds.forEach((b: Budget) => {
      initial[b.category] = b.suggestedMonthly;
    });
    return {
      analysis: parsed,
      budgets: buds,
      customBudgets: initial,
    };
  }
  return { analysis: null, budgets: [], customBudgets: {} };
}

export default function HybridModePage() {
  const [analysis] = useState<Analysis | null>(() => initializeHybrid().analysis);
  const [budgets] = useState<Budget[]>(() => initializeHybrid().budgets);
  const [customBudgets, setCustomBudgets] = useState<Record<string, number>>(() => initializeHybrid().customBudgets);
  const [saving, setSaving] = useState(false);

  const updateBudget = (category: string, amount: number) => {
    setCustomBudgets((prev) => ({
      ...prev,
      [category]: Math.max(0, amount),
    }));
  };

  const totalMonthly = Object.values(customBudgets).reduce((a, b) => a + b, 0);

  const onSave = async () => {
    setSaving(true);
    try {
      // Create customized policy
      const customizedBudgets = budgets.map((b) => ({
        ...b,
        suggestedMonthly: customBudgets[b.category] || b.suggestedMonthly,
      }));

      const policy = {
        mode: "hybrid",
        budgets: customizedBudgets,
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
      setSaving(false);
    }
  };

  if (!analysis || budgets.length === 0) {
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
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Hybrid Smart Setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Customize your policy</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          We generated a draft from your spending. Now adjust each category to match your goals.
        </p>
      </div>

      <div className="space-y-6">
        {/* Total Budget Card */}
        <div className="rounded-2xl border border-ink/10 bg-white/85 p-6 shadow-[0_18px_50px_-38px_rgba(17,24,39,0.45)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Total monthly budget</p>
          <p className="text-4xl font-bold text-ink mt-2">₹{totalMonthly.toLocaleString()}</p>
        </div>

        {/* Budget Editor */}
        <div className="rounded-2xl border border-ink/10 bg-white/85 p-6 shadow-[0_18px_50px_-38px_rgba(17,24,39,0.45)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55 mb-6">Adjust category limits</p>
          
          <div className="space-y-4">
            {budgets.map((budget) => (
              <div key={budget.category} className="flex items-end gap-4 pb-4 border-b border-ink/10 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink mb-2">{budget.category}</p>
                  <p className="text-xs text-ink/60">
                    Your avg: ₹{budget.baseAverage.toLocaleString()}/month
                  </p>
                </div>
                <div className="w-32">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-ink/60">₹</span>
                    <input
                      type="number"
                      value={customBudgets[budget.category] || 0}
                      onChange={(e) => updateBudget(budget.category, parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm font-mono font-semibold text-right outline-none ring-accent/35 transition focus:ring-4"
                    />
                  </div>
                  <p className="text-xs text-ink/50 mt-1 text-right">
                    Suggested: ₹{budget.suggestedMonthly.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add Category Button */}
        <button className="w-full rounded-lg border border-ink/20 bg-white px-4 py-3 text-sm font-semibold text-ink transition hover:bg-ink/2">
          + Add custom category
        </button>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" /> Save & Continue
          </button>
        </div>

        <p className="text-center text-xs text-ink/60">
          You can adjust limits anytime in <Link href="/dashboard/settings" className="text-accent hover:underline">Settings</Link>
        </p>
      </div>
    </div>
  );
}
