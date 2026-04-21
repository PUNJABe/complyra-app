import { NextResponse } from "next/server";

import { addAuditTrailEntry } from "@/lib/storage";
import { authenticate, type AuthProvider, AUTH_COOKIE, encodeSession } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

type LoginBody = {
  email?: string;
  password?: string;
  provider?: AuthProvider;
  role?: UserRole;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;

    const email = body.email?.trim();
    const password = body.password ?? "";
    const provider: AuthProvider = body.provider ?? "mock";
    const role: UserRole = body.role ?? "admin";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const result = await authenticate(provider, email, password);

    if (!result.ok) {
      try {
        await addAuditTrailEntry({
          action: "login_failed",
          actor: email ?? "unknown",
          details: `Failed login attempt via ${provider}.`,
          resource: "auth",
          severity: "warning",
          ip: request.headers.get("x-forwarded-for") ?? "unknown",
          userAgent: request.headers.get("user-agent") ?? "unknown",
        });
      } catch {
        // Audit logging must not block auth responses.
      }
      return NextResponse.json({ error: result.message ?? "Authentication failed." }, { status: 401 });
    }

    const now = Date.now();
    const session = encodeSession({
      provider,
      email,
      role,
      createdAt: now,
      lastSeenAt: now,
    });

    try {
      await addAuditTrailEntry({
        action: "login_success",
        actor: email,
        details: `Signed in via ${provider} as ${role}.`,
        resource: "auth",
        severity: "info",
        ip: request.headers.get("x-forwarded-for") ?? "unknown",
        userAgent: request.headers.get("user-agent") ?? "unknown",
      });
    } catch {
      // Audit logging must not block successful login.
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE, session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to process login right now. Please try again." },
      { status: 500 }
    );
  }
}
