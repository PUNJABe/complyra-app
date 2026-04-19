"use client";

interface Optimization {
  id: string;
  title: string;
  description: string;
  currentSpend: number;
  potentialSavings: number;
  savingsPercentage: number;
  category: string;
  priority: "high" | "medium" | "low";
}

interface CostOptimizationWidgetProps {
  optimizations: Optimization[];
}

export function CostOptimizationWidget({ optimizations }: CostOptimizationWidgetProps) {
  const totalSavings = optimizations.reduce((sum, o) => sum + o.potentialSavings, 0);
  const highPriority = optimizations.filter((o) => o.priority === "high");

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/80 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">💰 Cost Optimization Opportunities</h2>
        <p className="text-sm text-ink/65 mt-1">
          Potential monthly savings: <span className="font-bold text-green-600">${totalSavings.toLocaleString()}</span>
        </p>
      </div>

      <div className="space-y-3">
        {optimizations.length === 0 ? (
          <p className="text-sm text-ink/60 py-4 text-center">No optimization opportunities identified yet</p>
        ) : (
          optimizations.map((opt) => (
            <div
              key={opt.id}
              className={`rounded-lg border p-3 transition ${
                opt.priority === "high"
                  ? "border-rose-200 bg-rose-50/50 hover:border-rose-300"
                  : opt.priority === "medium"
                    ? "border-amber-200 bg-amber-50/50 hover:border-amber-300"
                    : "border-ink/10 bg-canvas/50 hover:border-ink/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink/80">{opt.title}</p>
                  <p className="text-xs text-ink/65 mt-1">{opt.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="rounded-full border border-ink/20 px-2 py-1 text-ink/60">{opt.category}</span>
                    {opt.priority === "high" && (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700 font-medium">High Priority</span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-green-600">${opt.potentialSavings.toLocaleString()}</p>
                  <p className="text-xs text-green-600">{opt.savingsPercentage}% less</p>
                  <p className="text-xs text-ink/60 mt-1">from ${opt.currentSpend.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {highPriority.length > 0 && (
        <div className="mt-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 p-3 border border-green-200">
          <p className="text-sm font-semibold text-green-900">
            🎯 Quick Win: {highPriority[0].title}
          </p>
          <p className="text-xs text-green-800 mt-1">
            Could save ${highPriority[0].potentialSavings.toLocaleString()} per month
          </p>
        </div>
      )}
    </div>
  );
}
