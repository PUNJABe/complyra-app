import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, decodeSession, rateLimit } from "@/lib/auth";
import { appOrigin } from "@/lib/mail";

async function handle(request: NextRequest, next: () => NextResponse) {
  const pathname = request.nextUrl.pathname;
  const api = pathname.startsWith("/api/");
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(request.method);
  try {
    if (api && request.method === "OPTIONS") {
      if (request.headers.get("origin") !== appOrigin())
        return NextResponse.json(
          { error: "Invalid request origin." },
          { status: 403 },
        );
      return new NextResponse(null, { status: 204 });
    }
    if (api && mutating) {
      const origin = request.headers.get("origin");
      const allowedOrigin = appOrigin();
      const cron = pathname === "/api/cron/reminders"; // Route validates its bearer secret.
      if (
        !cron &&
        (origin !== allowedOrigin ||
          request.headers.get("sec-fetch-site") === "cross-site")
      )
        return NextResponse.json(
          { error: "Invalid request origin." },
          { status: 403 },
        );
      if (Number(request.headers.get("content-length") || 0) > 6 * 1024 * 1024)
        return NextResponse.json(
          { error: "Request too large." },
          { status: 413 },
        );
    }
    const publicAuth = [
      "/api/auth/login",
      "/api/auth/register",
      "/api/auth/verify",
      "/api/auth/reset",
      "/api/auth/logout",
      "/api/auth/session",
    ];
    if (publicAuth.includes(pathname)) {
      // Trust a client IP header only when the ingress overwrites it (documented deployment requirement).
      if (mutating) {
        const ip = process.env.TRUSTED_CLIENT_IP_HEADER
          ? request.headers.get(process.env.TRUSTED_CLIENT_IP_HEADER) ||
            "unknown"
          : "global";
        if (!(await rateLimit(`auth-ingress:${ip}`, 60)))
          return NextResponse.json(
            { error: "Too many requests. Try again in 15 minutes." },
            { status: 429 },
          );
      }
      return next();
    }
    if (pathname === "/api/cron/reminders") return next(); // Route verifies a scheduler secret.
    if (
      !api &&
      !["/dashboard", "/onboarding", "/admin"].some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      )
    )
      return next();
    const session = await decodeSession(
      request.cookies.get(AUTH_COOKIE)?.value,
    );
    if (!session)
      return api
        ? NextResponse.json(
            { error: "Authentication required." },
            { status: 401 },
          )
        : NextResponse.redirect(new URL("/auth/login", request.url));
    if (
      (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) &&
      session.role !== "admin"
    )
      return api
        ? NextResponse.json(
            { error: "Administrator access required." },
            { status: 403 },
          )
        : NextResponse.redirect(new URL("/dashboard", request.url));
    if (
      api &&
      mutating &&
      session.role === "viewer" &&
      pathname !== "/api/account"
    )
      return NextResponse.json(
        { error: "This account has read-only access." },
        { status: 403 },
      );
    if (
      api &&
      mutating &&
      !(await rateLimit(`api:${session.userId}`, 100, 60000))
    )
      return NextResponse.json(
        { error: "Request limit reached. Try again shortly." },
        { status: 429 },
      );
    const response = next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown secure service error.";
    console.error(
      "Secure service request failed.",
      message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL redacted]"),
    );
    return NextResponse.json(
      { error: "The secure service is temporarily unavailable." },
      { status: 503 },
    );
  }
}
export async function proxy(request: NextRequest) {
  const nonce = randomBytes(24).toString("base64");
  const development = process.env.NODE_ENV !== "production";
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self' https://open.er-api.com${development ? " ws: wss:" : ""}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';${development ? "" : " upgrade-insecure-requests;"}`;
  const forwarded = new Headers(request.headers);
  forwarded.set("x-nonce", nonce);
  forwarded.set("Content-Security-Policy", csp);
  const response = await handle(request, () =>
    NextResponse.next({ request: { headers: forwarded } }),
  );
  if (
    request.nextUrl.pathname.startsWith("/api/") &&
    request.headers.get("origin") === appOrigin()
  ) {
    response.headers.set("Access-Control-Allow-Origin", appOrigin());
    response.headers.set("Access-Control-Allow-Credentials", "true");
    const vary = response.headers.get("Vary");
    if (!vary?.split(",").some((value) => value.trim().toLowerCase() === "origin"))
      response.headers.set("Vary", vary ? `${vary}, Origin` : "Origin");
    if (request.method === "OPTIONS") {
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      response.headers.set("Access-Control-Max-Age", "600");
    }
  }
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
