import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  accessAllowed,
  changeSecurity,
  digest,
  hashPassword,
  normalizeEmail,
  passwordError,
  POLICY_VERSION,
  rateLimit,
  securityEvent,
  validEmail,
} from "@/lib/auth";
import { appUrl, sendMail } from "@/lib/mail";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const name =
      typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    if (
      !validEmail(email) ||
      !name ||
      passwordError(body.password) ||
      body.acceptPolicies !== true
    )
      return NextResponse.json(
        {
          error:
            "Provide your name, a valid email, a 12–128 character password, and accept the terms and privacy notice.",
        },
        { status: 400 },
      );
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.PRIVACY_CONTACT_EMAIL ||
        process.env.LEGAL_POLICIES_APPROVED !== "true")
    )
      return NextResponse.json(
        {
          error:
            "Registration is temporarily unavailable while the published policies and contact details are configured.",
        },
        { status: 503 },
      );
    if (!(await rateLimit(`register:${email}`, 3)))
      return NextResponse.json(
        {
          error:
            "Please wait 15 minutes before requesting another verification email.",
        },
        { status: 429 },
      );
    const passwordHash = await hashPassword(body.password);
    const token = randomBytes(32).toString("hex");
    await changeSecurity(async (state) => {
      if (
        state.users.some((user) => user.email === email) ||
        !accessAllowed(email, state)
      )
        return;
      // One pending application per email, with no usable account until verification.
      await sendMail(
        email,
        "Verify your Complyra email",
        `Complete your registration within 30 minutes: ${appUrl()}/auth/verify#token=${token}\nIf you did not request this, ignore this email.`,
      );
      state.pending = state.pending.filter((item) => item.email !== email);
      state.pending.push({
        email,
        name,
        passwordHash,
        tokenHash: digest(token),
        expiresAt: Date.now() + 30 * 60000,
        policyVersion: POLICY_VERSION,
        policyAcceptedAt: new Date().toISOString(),
      });
      securityEvent(state, "verification_requested", email);
    });
    return NextResponse.json({
      ok: true,
      message:
        "If registration is available for this address, a verification email has been sent. Your account is created only after verification. Submit this form again to request a new link.",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Registration is temporarily unavailable. Email delivery or database configuration may need attention.",
      },
      { status: 503 },
    );
  }
}
