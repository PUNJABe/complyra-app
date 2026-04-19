import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AUTH_COOKIE } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE)?.value;

  return NextResponse.json({
    authenticated: Boolean(session),
    session: session ?? null,
  });
}
