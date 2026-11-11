"use client";
import { createContext, useContext, ReactNode } from "react";
export type CurrencyType = "USD" | "INR";
interface CurrencyContextType {
  currency: CurrencyType;
  exchangeRate: number;
  setCurrency: (currency: CurrencyType) => void;
  loading: boolean;
}
const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);
// Statement amounts are native INR. No implicit FX conversion or third-party rate request.
export function CurrencyProvider({ children }: { children: ReactNode }) {
  return (
    <CurrencyContext.Provider
      value={{
        currency: "INR",
        exchangeRate: 1,
        setCurrency: () => {},
        loading: false,
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
