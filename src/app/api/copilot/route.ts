import { NextResponse } from "next/server";

import { getCopilotPayload } from "@/lib/analytics";

export async function GET() {
  return NextResponse.json(await getCopilotPayload());
}
