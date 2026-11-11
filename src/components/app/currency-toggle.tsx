"use client";
import { useCurrency } from "@/lib/currency-context";

export function CurrencyToggle() {
  const {
    currency,
    setCurrency,
    exchangeRate,
    loading,
    rateUpdatedAt,
    error,
  } = useCurrency();
  const rateLabel = rateUpdatedAt
    ? `1 INR = $${exchangeRate.toFixed(5)} USD. Rate date: ${new Date(rateUpdatedAt).toLocaleDateString()}.`
    : "Select USD to fetch the latest available INR-to-USD exchange rate.";
  return (
    <div className="flex flex-col gap-1">
      <label className="sr-only" htmlFor="display-currency">
        Display currency
      </label>
      <select
        id="display-currency"
        value={currency}
        onChange={(event) =>
          setCurrency(event.target.value === "USD" ? "USD" : "INR")
        }
        title={rateLabel}
        className="rounded-full border border-ink/15 bg-canvas px-3 py-2 text-xs text-ink/80"
      >
        <option value="INR">INR (statement)</option>
        <option value="USD">USD (converted)</option>
      </select>
      {currency === "USD" && (
        <span className="px-2 text-[10px] text-ink/50" aria-live="polite">
          {loading
            ? "Updating exchange rate..."
            : error || rateLabel}
        </span>
      )}
    </div>
  );
}
