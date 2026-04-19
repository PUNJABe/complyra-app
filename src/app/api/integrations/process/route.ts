import { NextResponse } from "next/server";

import { processDueDeliveryJobs } from "@/lib/integration-delivery";

export async function POST() {
  const jobs = await processDueDeliveryJobs();

  return NextResponse.json({
    ok: true,
    processed: jobs.length,
    jobs,
  });
}
