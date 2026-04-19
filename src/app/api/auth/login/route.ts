import { NextResponse } from "next/server";

import { authenticate, type AuthProvider, AUTH_COOKIE } from "@/lib/auth";

type LoginBody = {
  email?: string;
  password?: string;
  provider?: AuthProvider;
};

export async function POST(request: Request) {
  const body = (await request.json()) as LoginBody;

  const email = body.email?.trim();
  const password = body.password ?? "";
  const provider: AuthProvider = body.provider ?? "mock";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const result = await authenticate(provider, email, password);

  if (!result.ok) {
    return NextResponse.json({ error: result.message ?? "Authentication failed." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, `${provider}:${email}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
