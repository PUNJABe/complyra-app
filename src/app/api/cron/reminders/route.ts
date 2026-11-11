import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deliverStatementReminders } from "@/lib/reminders";
export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") || "";
  if (
    !expected ||
    expected.length < 32 ||
    Buffer.byteLength(received) !== Buffer.byteLength(`Bearer ${expected}`) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(`Bearer ${expected}`))
  )
    return NextResponse.json(
      { error: "Unauthorized scheduler." },
      { status: 401 },
    );
  try {
    return NextResponse.json(await deliverStatementReminders());
  } catch {
    return NextResponse.json(
      { error: "Reminder delivery unavailable." },
      { status: 503 },
    );
  }
}
