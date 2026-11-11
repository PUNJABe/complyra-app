export type DisplayCurrency = "INR" | "USD";

export type DisplayCurrencyOptions = {
  currency: DisplayCurrency;
  exchangeRate: number;
};

export function parseDisplayCurrency(
  request: Request,
): DisplayCurrencyOptions | null {
  const params = new URL(request.url).searchParams;
  const currency = params.get("currency");

  if (!currency) return { currency: "INR", exchangeRate: 1 };
  if (currency === "INR") return { currency, exchangeRate: 1 };
  if (currency !== "USD") return null;

  const exchangeRate = Number(params.get("exchangeRate"));
  if (
    !Number.isFinite(exchangeRate) ||
    exchangeRate <= 0 ||
    exchangeRate >= 1
  )
    return null;

  return { currency, exchangeRate };
}
