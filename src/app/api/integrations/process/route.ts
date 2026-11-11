import { apiAccessError } from "@/lib/api-access";
import { NextResponse } from "next/server";

import { processDueDeliveryJobs } from "@/lib/integration-delivery";

export async function POST() {
  const accessError = await apiAccessError("POST", true);
  if (accessError) return accessError;
  const jobs = await processDueDeliveryJobs();

  return NextResponse.json({
    ok: true,
    processed: jobs.length,
    jobs,
  });
}
