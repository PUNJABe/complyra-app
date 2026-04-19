import { NextResponse } from "next/server";

import { getOverviewPayload } from "@/lib/analytics";

export async function GET() {
  return NextResponse.json(await getOverviewPayload());
}
