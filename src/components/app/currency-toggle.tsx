"use client";

import { useCurrency } from "@/lib/currency-context";

export function CurrencyToggle() {
  const { currency, setCurrency, loading } = useCurrency();

  if (loading) return null;

  return (
    <div className="flex items-center gap-2 rounded-full border border-ink/20 bg-white p-1">
      {(["USD", "INR"] as const).map((curr) => (
        <button
          key={curr}
          onClick={() => setCurrency(curr)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            currency === curr
              ? "bg-ink text-canvas"
              : "text-ink/65 hover:text-ink"
          }`}
        >
          {curr}
        </button>
      ))}
    </div>
  );
}
