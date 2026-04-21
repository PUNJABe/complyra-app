import { NextResponse } from "next/server";

import { getComplianceCheckPayload } from "@/lib/analytics";

export async function GET() {
  return NextResponse.json(await getComplianceCheckPayload());
}
