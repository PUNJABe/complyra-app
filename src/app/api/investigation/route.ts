import { NextResponse } from "next/server";

import { getInvestigationPayload } from "@/lib/analytics";

export async function GET() {
  return NextResponse.json(await getInvestigationPayload());
}
