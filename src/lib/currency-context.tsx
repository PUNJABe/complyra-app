"use client";
import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
export type CurrencyType = "USD" | "INR";
interface CurrencyContextType {
  currency: CurrencyType;
  exchangeRate: number;
  setCurrency: (currency: CurrencyType) => void;
  loading: boolean;
  rateUpdatedAt: string | null;
  error: string;
}
type CachedRate = { rate: number; updatedAt: string };
const currencyStorageKey = "complyra-display-currency";
const exchangeRateStorageKey = "complyra-inr-usd-rate";
const rateEndpoint = "https://open.er-api.com/v6/latest/INR";
const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyType>("INR");
  const [exchangeRate, setExchangeRate] = useState(1);
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasCachedRate = useRef(false);

  useEffect(() => {
    const savedCurrency = localStorage.getItem(currencyStorageKey);
    let cachedRate: CachedRate | null = null;
    try {
      const cached = JSON.parse(
        localStorage.getItem(exchangeRateStorageKey) || "null",
      ) as CachedRate | null;
      if (
        cached &&
        Number.isFinite(cached.rate) &&
        cached.rate > 0 &&
        Date.parse(cached.updatedAt) <= Date.now()
      ) {
        cachedRate = cached;
      }
    } catch {
      localStorage.removeItem(exchangeRateStorageKey);
    }
    queueMicrotask(() => {
      if (savedCurrency === "USD" || savedCurrency === "INR")
        setCurrencyState(savedCurrency);
      if (cachedRate) {
        hasCachedRate.current = true;
        setExchangeRate(cachedRate.rate);
        setRateUpdatedAt(cachedRate.updatedAt);
      } else if (savedCurrency === "USD") {
        setLoading(true);
      }
    });
  }, []);

  useEffect(() => {
    if (currency !== "USD") return;
    const controller = new AbortController();
    const loadRate = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(rateEndpoint, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(`Exchange-rate service returned ${response.status}.`);
        const data = (await response.json()) as {
          result?: string;
          time_last_update_utc?: string;
          rates?: { USD?: number };
        };
        const rate = data.rates?.USD;
        const updatedAt = data.time_last_update_utc
          ? new Date(data.time_last_update_utc).toISOString()
          : "";
        if (
          data.result !== "success" ||
          !Number.isFinite(rate) ||
          !rate ||
          rate <= 0 ||
          !updatedAt
        )
          throw new Error("The exchange-rate response was invalid.");
        setExchangeRate(rate);
        setRateUpdatedAt(updatedAt);
        hasCachedRate.current = true;
        localStorage.setItem(
          exchangeRateStorageKey,
          JSON.stringify({ rate, updatedAt }),
        );
      } catch {
        if (controller.signal.aborted) return;
        if (hasCachedRate.current) {
          setError("Using the last saved USD rate; a fresh rate is unavailable.");
        } else {
          setCurrencyState("INR");
          localStorage.setItem(currencyStorageKey, "INR");
          setError("Live USD conversion is unavailable. Display remains in INR.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void loadRate();
    return () => controller.abort();
  }, [currency]);

  const setCurrency = (nextCurrency: CurrencyType) => {
    setCurrencyState(nextCurrency);
    localStorage.setItem(currencyStorageKey, nextCurrency);
    setError("");
    if (nextCurrency === "INR") setLoading(false);
    else if (!hasCachedRate.current) setLoading(true);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        exchangeRate: currency === "INR" ? 1 : exchangeRate,
        setCurrency,
        loading,
        rateUpdatedAt,
        error,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}
export function useCurrency() {
  const value = useContext(CurrencyContext);
  if (!value)
    throw new Error("useCurrency must be used within CurrencyProvider");
  return value;
}
