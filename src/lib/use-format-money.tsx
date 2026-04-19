"use client";

import { useCurrency } from "@/lib/currency-context";

export function useFormatMoney() {
  const { currency, exchangeRate } = useCurrency();

  const formatMoney = (amount: number): string => {
    let convertedAmount = amount;
    let symbol = "$";
    let localeCode = "en-US";

    if (currency === "INR") {
      convertedAmount = amount * exchangeRate;
      symbol = "₹";
      localeCode = "en-IN";
    }

    const sign = convertedAmount < 0 ? "-" : "";
    const formatted = Math.abs(convertedAmount).toLocaleString(localeCode, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

    return `${sign}${symbol}${formatted}`;
  };

  return formatMoney;
}
