import { NextResponse } from "next/server";

import { AUTH_COOKIE, decodeSession } from "@/lib/auth";
import { addAuditTrailEntry } from "@/lib/storage";

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionToken = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${AUTH_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = decodeSession(sessionToken ?? null);

  if (session) {
    await addAuditTrailEntry({
      action: "logout",
      actor: session.email,
      details: "User signed out.",
      resource: "auth",
      severity: "info",
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
