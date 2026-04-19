import { NextResponse } from "next/server";

import { getPolicyPayload } from "@/lib/analytics";

export async function GET() {
  return NextResponse.json(await getPolicyPayload());
}
