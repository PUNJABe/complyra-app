import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE,
  changeSecurity,
  currentSession,
  digest,
  SESSION_IDLE_TIMEOUT_MS,
} from "@/lib/auth";
export async function GET() {
  const session = await currentSession();
  if (session) {
    const token = (await cookies()).get(AUTH_COOKIE)!.value;
    await changeSecurity((data) => {
      if (data.sessions[digest(token)])
        data.sessions[digest(token)].lastSeenAt = Date.now();
    });
  }
  return NextResponse.json(
    {
      authenticated: Boolean(session),
      session: session
        ? { ...session, expiresInMs: SESSION_IDLE_TIMEOUT_MS }
        : null,
      expired: !session,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
