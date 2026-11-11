import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/auth";
import { appOrigin } from "@/lib/mail";

// Route-level authorization remains effective even if a proxy is bypassed.
export async function apiAccessError(
  method: string,
  adminOnly = false,
  ownAccountControls = false,
) {
  const session = await currentSession();
  if (!session)
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  if (adminOnly && session.role !== "admin")
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (session.role === "viewer" && !ownAccountControls)
      return NextResponse.json(
        { error: "Read-only account." },
        { status: 403 },
      );
    const incoming = await headers();
    const origin = incoming.get("origin");
    const expected = appOrigin();
    if (origin !== expected || incoming.get("sec-fetch-site") === "cross-site")
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
  }
  return null;
}
