import { apiAccessError } from "@/lib/api-access";
import { NextResponse } from "next/server";

import { AUTH_COOKIE, decodeSession } from "@/lib/auth";
import { addAuditTrailEntry } from "@/lib/storage";

type AuditBody = {
  action?: string;
  details?: string;
  resource?: string;
  severity?: "info" | "warning";
};

function requestMeta(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return { ip, userAgent };
}

export async function POST(request: Request) {
  const accessError = await apiAccessError("POST");
  if (accessError) return accessError;
  const body = (await request.json().catch(() => ({}))) as AuditBody;

  if (!body.action || !body.details) {
    return NextResponse.json(
      { error: "action and details are required." },
      { status: 400 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const sessionToken = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${AUTH_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");
  const session = await decodeSession(sessionToken ?? null);
  const meta = requestMeta(request);

  await addAuditTrailEntry({
    action: body.action,
    actor: session?.email ?? "anonymous",
    details: body.details,
    resource: body.resource,
    severity: body.severity ?? "info",
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return NextResponse.json({ ok: true });
}
