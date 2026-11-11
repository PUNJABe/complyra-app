import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  accessAllowed,
  changeSecurity,
  digest,
  hashPassword,
  normalizeEmail,
  passwordError,
  rateLimit,
  securityEvent,
  validEmail,
} from "@/lib/auth";
import { appUrl, sendMail } from "@/lib/mail";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.token) {
      if (
        typeof body.token !== "string" ||
        !/^[a-f0-9]{64}$/.test(body.token) ||
        passwordError(body.password)
      )
        return NextResponse.json(
          {
            error:
              "Provide a valid reset token and a 12–128 character password.",
          },
          { status: 400 },
        );
      if (!(await rateLimit(`reset-token:${body.token}`, 5)))
        return NextResponse.json(
          { error: "Please try later." },
          { status: 429 },
        );
      const passwordHash = await hashPassword(body.password);
      const ok = await changeSecurity((state) => {
        const reset = state.resets.find(
          (item) => item.tokenHash === digest(body.token),
        );
        const user = state.users.find((item) => item.id === reset?.userId);
        if (
          !reset ||
          !user ||
          user.disabled ||
          !accessAllowed(user.email, state)
        )
          return false;
        user.passwordHash = passwordHash;
        state.resets = state.resets.filter((item) => item.userId !== user.id);
        for (const [key, session] of Object.entries(state.sessions))
          if (session.userId === user.id) delete state.sessions[key];
        securityEvent(state, "password_reset", user.email);
        return true;
      });
      return NextResponse.json(
        ok
          ? {
              ok: true,
              message:
                "Password changed. All previous sessions have been signed out.",
            }
          : { error: "Reset link expired or already used." },
        { status: ok ? 200 : 400 },
      );
    }
    const email = normalizeEmail(body.email);
    if (!validEmail(email))
      return NextResponse.json(
        { error: "Enter a valid email." },
        { status: 400 },
      );
    if (!(await rateLimit(`reset:${email}`, 3)))
      return NextResponse.json(
        { error: "Please wait 15 minutes." },
        { status: 429 },
      );
    const token = randomBytes(32).toString("hex");
    await changeSecurity(async (state) => {
      const user = state.users.find((item) => item.email === email);
      if (!user || user.disabled || !accessAllowed(email, state)) return;
      await sendMail(
        email,
        "Reset your Complyra password",
        `Reset your password within 30 minutes: ${appUrl()}/auth/reset#token=${token}\nIgnore this message if you did not request it.`,
      );
      state.resets = state.resets.filter((item) => item.userId !== user.id);
      state.resets.push({
        userId: user.id,
        tokenHash: digest(token),
        expiresAt: Date.now() + 30 * 60000,
      });
      securityEvent(state, "password_reset_requested", email);
    });
    return NextResponse.json({
      ok: true,
      message: "If an eligible account exists, a reset email has been sent.",
    });
  } catch {
    return NextResponse.json(
      { error: "Password recovery is temporarily unavailable." },
      { status: 503 },
    );
  }
}
