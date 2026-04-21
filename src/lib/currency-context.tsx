"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CurrencyType = "USD" | "INR";

interface CurrencyContextType {
  currency: CurrencyType;
  exchangeRate: number;
  setCurrency: (currency: CurrencyType) => void;
  loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DEFAULT_RATE = 83; // Fallback rate

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyType>(() => {
    if (typeof window === "undefined") return "USD";
    const saved = localStorage.getItem("preferred-currency");
    return saved === "INR" || saved === "USD" ? saved : "USD";
  });
  const [exchangeRate, setExchangeRate] = useState(DEFAULT_RATE);
  const [loading, setLoading] = useState(true);

  // Fetch exchange rate from API
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const response = await fetch(
          "https://api.exchangerate-api.com/v4/latest/USD"
        );
        const data = await response.json();
        setExchangeRate(data.rates?.INR || DEFAULT_RATE);
      } catch (error) {
        console.warn("Failed to fetch exchange rate, using default:", error);
        setExchangeRate(DEFAULT_RATE);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  const setCurrency = (newCurrency: CurrencyType) => {
    setCurrencyState(newCurrency);
    localStorage.setItem("preferred-currency", newCurrency);
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, exchangeRate, setCurrency, loading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}
