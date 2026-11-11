import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  accessAllowed,
  bootstrapRole,
  changeSecurity,
  digest,
  securityEvent,
} from "@/lib/auth";
export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      return NextResponse.json(
        { error: "Invalid verification link." },
        { status: 400 },
      );
    const verified = await changeSecurity((state) => {
      const pending = state.pending.find(
        (item) => item.tokenHash === digest(token),
      );
      if (
        !pending ||
        !accessAllowed(pending.email, state) ||
        state.users.some((user) => user.email === pending.email)
      )
        return false;
      const now = new Date().toISOString();
      state.users.push({
        id: randomUUID(),
        email: pending.email,
        name: pending.name,
        passwordHash: pending.passwordHash,
        role: bootstrapRole(pending.email),
        verifiedAt: now,
        createdAt: now,
        policyVersion: pending.policyVersion,
        policyAcceptedAt: pending.policyAcceptedAt,
        aiEnabled: false,
        reminderEmail: false,
        disabled: false,
      });
      state.pending = state.pending.filter((item) => item !== pending);
      securityEvent(state, "email_verified", pending.email);
      return true;
    });
    return NextResponse.json(
      verified
        ? { ok: true, message: "Email verified. You can now sign in." }
        : {
            error:
              "This link is expired, already used, or unavailable. Request a new one from registration.",
          },
      { status: verified ? 200 : 400 },
    );
  } catch {
    return NextResponse.json(
      { error: "Verification is temporarily unavailable." },
      { status: 503 },
    );
  }
}
