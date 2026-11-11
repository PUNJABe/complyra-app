import { apiAccessError } from "@/lib/api-access";
import { NextResponse } from "next/server";

import { getOverviewPayload } from "@/lib/analytics";
import { parseDisplayCurrency } from "@/lib/display-currency";

export async function GET(request: Request) {
  const accessError = await apiAccessError("GET");
  if (accessError) return accessError;
  const display = parseDisplayCurrency(request);
  if (!display)
    return NextResponse.json(
      { error: "Choose INR or provide a valid INR-to-USD exchange rate." },
      { status: 400 },
    );
  return NextResponse.json(
    await getOverviewPayload(display.currency, display.exchangeRate),
  );
}
