import { NextResponse } from "next/server";
import {
  authenticate,
  AUTH_COOKIE,
  normalizeEmail,
  rateLimit,
  sessionCookieOptions,
} from "@/lib/auth";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    if (
      !email ||
      typeof body.password !== "string" ||
      body.password.length > 128
    )
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    if (!(await rateLimit(`login:${email}`, 5)))
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    const token = await authenticate(email, body.password);
    if (!token)
      return NextResponse.json(
        {
          error:
            "Unable to sign in. Check your credentials and verify your email.",
        },
        { status: 401 },
      );
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE, token, sessionCookieOptions);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable." },
      { status: 503 },
    );
  }
}
