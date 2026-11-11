import { apiAccessError } from "@/lib/api-access";
import { NextResponse } from "next/server";

import { getComplianceCheckPayload } from "@/lib/analytics";

export async function GET() {
  const accessError = await apiAccessError("GET");
  if (accessError) return accessError;
  return NextResponse.json(await getComplianceCheckPayload());
}
