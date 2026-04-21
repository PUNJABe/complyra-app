import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { AUTH_COOKIE, decodeSession, encodeSession, SESSION_IDLE_TIMEOUT_MS } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(AUTH_COOKIE)?.value;
  const payload = decodeSession(raw ?? null);

  if (!payload) {
    return NextResponse.json({
      authenticated: false,
      session: null,
      expired: false,
    });
  }

  const now = Date.now();
  const idle = now - payload.lastSeenAt;

  if (idle > SESSION_IDLE_TIMEOUT_MS) {
    const expiredResponse = NextResponse.json({
      authenticated: false,
      session: null,
      expired: true,
    });
    expiredResponse.cookies.set(AUTH_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return expiredResponse;
  }

  const refreshed = {
    ...payload,
    lastSeenAt: now,
  };

  const response = NextResponse.json({
    authenticated: true,
    session: {
      provider: payload.provider,
      email: payload.email,
      role: payload.role,
      createdAt: payload.createdAt,
      lastSeenAt: payload.lastSeenAt,
      expiresInMs: Math.max(0, SESSION_IDLE_TIMEOUT_MS - idle),
    },
    expired: false,
  });

  response.cookies.set(AUTH_COOKIE, encodeSession(refreshed), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
