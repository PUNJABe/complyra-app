"use client";
import { useCurrency } from "@/lib/currency-context";

export function formatCurrencyAmount(
  amount: number,
  currency: "INR" | "USD",
  exchangeRate: number,
) {
  const converted = currency === "USD" ? amount * exchangeRate : amount;
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(converted);
}

export function useFormatMoney() {
  const { currency, exchangeRate, rateUpdatedAt } = useCurrency();
  return (amount: number) =>
    currency === "USD" && !rateUpdatedAt
      ? "Updating..."
      : formatCurrencyAmount(amount, currency, exchangeRate);
}

export function useDisplayCurrencyQuery() {
  const { currency, exchangeRate, loading, rateUpdatedAt } = useCurrency();
  return {
    ready:
      currency === "INR" || (!loading && rateUpdatedAt !== null),
    search: new URLSearchParams({
      currency,
      exchangeRate: String(exchangeRate),
    }).toString(),
  };
}

export function useCurrencySymbol() {
  const { currency } = useCurrency();
  return currency === "USD" ? "$" : "₹";
}
