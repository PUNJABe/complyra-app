"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import Link from "next/link";

interface BudgetLine {
  id: string;
  category: string;
  amount: number;
}

const DEFAULT_CATEGORIES = [
  "Food",
  "Travel",
  "Subscriptions",
  "Utilities",
  "Shopping",
  "Fuel",
  "Rent",
  "Other",
];

export default function ManualBudgetPage() {
  const [budgets, setBudgets] = useState<BudgetLine[]>(
    DEFAULT_CATEGORIES.map((cat, i) => ({
      id: `${i}`,
      category: cat,
      amount: 0,
    }))
  );
  const [income, setIncome] = useState(0);
  const [saving, setSaving] = useState(false);

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const remaining = income - totalBudget;

  const updateBudget = (id: string, amount: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, amount: Math.max(0, amount) } : b))
    );
  };

  const updateCategory = (id: string, category: string) => {
    setBudgets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, category } : b))
    );
  };

  const removeBudget = (id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  };

  const addBudget = () => {
    const newId = Math.random().toString();
    setBudgets((prev) => [
      ...prev,
      { id: newId, category: "New Category", amount: 0 },
    ]);
  };

  const onSave = async () => {
    if (income === 0) {
      alert("Please enter your monthly income");
      return;
    }

    setSaving(true);
    try {
      const policy = {
        mode: "manual",
        budgets: budgets.map((b) => ({
          category: b.category,
          suggestedMonthly: b.amount,
          baseAverage: b.amount,
        })),
        totalMonthlyBudget: totalBudget,
        monthlyIncome: income,
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

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-12 pt-8 md:px-10">
      {/* Header */}
      <div className="mb-8">
        <Link href="/onboarding" className="inline-flex items-center gap-1 text-sm text-ink/60 hover:text-ink mb-4 transition">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Manual Budget Setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Define your budgets</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          Enter your monthly income and budget limits for each category.
        </p>
      </div>

      <div className="space-y-6">
        {/* Income Input */}
        <div className="rounded-2xl border border-ink/10 bg-white/85 p-6 shadow-[0_18px_50px_-38px_rgba(17,24,39,0.45)] backdrop-blur-md">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-ink">Monthly Income</span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-ink/60">₹</span>
              <input
                type="number"
                value={income || ""}
                onChange={(e) => setIncome(parseInt(e.target.value) || 0)}
                placeholder="60000"
                className="flex-1 rounded-lg border border-ink/20 bg-white px-4 py-3 text-lg font-mono font-semibold outline-none ring-accent/35 transition focus:ring-4"
              />
            </div>
          </label>
        </div>

        {/* Budget Editor */}
        <div className="rounded-2xl border border-ink/10 bg-white/85 p-6 shadow-[0_18px_50px_-38px_rgba(17,24,39,0.45)] backdrop-blur-md">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55 mb-4">Category budgets</p>
          
          <div className="space-y-3">
            {budgets.map((budget) => (
              <div key={budget.id} className="flex items-center gap-3">
                <input
                  type="text"
                  value={budget.category}
                  onChange={(e) => updateCategory(budget.id, e.target.value)}
                  className="flex-1 rounded-lg border border-ink/20 bg-white px-3 py-2 text-sm font-medium outline-none ring-accent/35 transition focus:ring-4"
                  placeholder="Category name"
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm text-ink/60">₹</span>
                  <input
                    type="number"
                    value={budget.amount || ""}
                    onChange={(e) =>
                      updateBudget(budget.id, parseInt(e.target.value) || 0)
                    }
                    className="w-24 rounded-lg border border-ink/20 bg-white px-2 py-2 text-sm font-mono font-semibold text-right outline-none ring-accent/35 transition focus:ring-4"
                    placeholder="0"
                  />
                </div>
                <button
                  onClick={() => removeBudget(budget.id)}
                  className="p-2 text-ink/40 hover:text-rose-600 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addBudget}
            className="mt-4 w-full rounded-lg border border-ink/20 bg-ink/2 px-4 py-2 text-sm font-medium text-ink/70 transition hover:bg-ink/5 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add category
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-ink/10 bg-canvas/60 p-4 text-center">
            <p className="text-xs text-ink/60 font-medium">Total Budget</p>
            <p className="text-2xl font-bold text-ink mt-2">
              ₹{totalBudget.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-canvas/60 p-4 text-center">
            <p className="text-xs text-ink/60 font-medium">Coverage</p>
            <p className="text-2xl font-bold text-ink mt-2">
              {income > 0 ? Math.round((totalBudget / income) * 100) : 0}%
            </p>
          </div>
          <div className={`rounded-lg border p-4 text-center ${remaining >= 0 ? 'border-accent/20 bg-accent/5' : 'border-rose-200 bg-rose-50'}`}>
            <p className="text-xs font-medium" style={{ color: remaining >= 0 ? '#059669' : '#dc2626' }}>
              Remaining
            </p>
            <p className="text-2xl font-bold mt-2" style={{ color: remaining >= 0 ? '#059669' : '#dc2626' }}>
              ₹{remaining.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={onSave}
          disabled={saving || income === 0}
          className="w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Save className="h-4 w-4" /> Save & Continue
        </button>

        <p className="text-center text-xs text-ink/60">
          You can adjust limits anytime in <Link href="/dashboard/settings" className="text-accent hover:underline">Settings</Link>
        </p>
      </div>
    </div>
  );
}
