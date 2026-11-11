import { apiAccessError } from "@/lib/api-access";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  changeSecurity,
  hashPassword,
  passwordError,
  publicUser,
  requireSession,
  securityEvent,
  securityState,
  sessionCookieOptions,
  rateLimit,
  verifyPassword,
} from "@/lib/auth";
import { emptyStore, readStore, workspaceKey } from "@/lib/storage";
import { writeKV } from "@/lib/secure-kv";
export async function GET(request: Request) {
  const accessError = await apiAccessError("GET");
  if (accessError) return accessError;
  const session = await requireSession();
  const state = await securityState();
  const user = state.users.find((item) => item.id === session.userId)!;
  if (new URL(request.url).searchParams.get("export") === "true")
    return NextResponse.json(
      { profile: publicUser(user), workspace: await readStore() },
      {
        headers: {
          "Content-Disposition": "attachment; filename=complyra-data.json",
          "Cache-Control": "no-store",
        },
      },
    );
  return NextResponse.json({
    user: publicUser(user),
    sessions: Object.values(state.sessions)
      .filter((s) => s.userId === user.id)
      .map((s) => ({ createdAt: s.createdAt, lastSeenAt: s.lastSeenAt })),
  });
}
export async function PATCH(request: Request) {
  const accessError = await apiAccessError("PATCH", false, true);
  if (accessError) return accessError;
  const session = await requireSession();
  if (!(await rateLimit(`account:${session.userId}`, 10)))
    return NextResponse.json(
      { error: "Please try again in 15 minutes." },
      { status: 429 },
    );
  const body = await request.json();
  const passwordHash =
    body.newPassword && !passwordError(body.newPassword)
      ? await hashPassword(body.newPassword)
      : null;
  if (body.newPassword && !passwordHash)
    return NextResponse.json(
      { error: passwordError(body.newPassword) },
      { status: 400 },
    );
  const ok = await changeSecurity(async (state) => {
    const user = state.users.find((item) => item.id === session.userId)!;
    if (body.newPassword || body.revokeSessions) {
      if (
        typeof body.currentPassword !== "string" ||
        body.currentPassword.length > 128 ||
        !(await verifyPassword(body.currentPassword, user.passwordHash))
      )
        return false;
      if (passwordHash) user.passwordHash = passwordHash;
      for (const [key, value] of Object.entries(state.sessions))
        if (value.userId === user.id) delete state.sessions[key];
      securityEvent(
        state,
        passwordHash ? "password_changed" : "sessions_revoked",
        user.email,
      );
    }
    if (typeof body.name === "string" && body.name.trim())
      user.name = body.name.trim().slice(0, 100);
    if (typeof body.aiEnabled === "boolean") {
      user.aiEnabled = body.aiEnabled;
      securityEvent(
        state,
        body.aiEnabled ? "ai_consent_granted" : "ai_consent_withdrawn",
        user.email,
      );
    }
    if (typeof body.reminderEmail === "boolean")
      user.reminderEmail = body.reminderEmail;
    return true;
  });
  return NextResponse.json(
    ok
      ? { ok: true, signInAgain: Boolean(passwordHash || body.revokeSessions) }
      : { error: "Current password is incorrect." },
    { status: ok ? 200 : 403 },
  );
}
export async function DELETE(request: Request) {
  const accessError = await apiAccessError("DELETE", false, true);
  if (accessError) return accessError;
  const session = await requireSession();
  if (!(await rateLimit(`account:${session.userId}`, 10)))
    return NextResponse.json(
      { error: "Please try again in 15 minutes." },
      { status: 429 },
    );
  const body = await request.json();
  const state = await securityState();
  const user = state.users.find((item) => item.id === session.userId)!;
  if (
    typeof body.password !== "string" ||
    body.password.length > 128 ||
    !(await verifyPassword(body.password, user.passwordHash)) ||
    body.confirmation !== "DELETE"
  )
    return NextResponse.json(
      { error: "Enter your current password and type DELETE to confirm." },
      { status: 400 },
    );
  // Erase the isolated live workspace. Backup retention is disclosed in the operator's privacy notice.
  await writeKV(workspaceKey(user.id), {
    ...emptyStore(),
    deletedAt: new Date().toISOString(),
  });
  await changeSecurity((data) => {
    data.users = data.users.filter((item) => item.id !== user.id);
    data.pending = data.pending.filter((item) => item.email !== user.email);
    data.resets = data.resets.filter((item) => item.userId !== user.id);
    for (const [key, value] of Object.entries(data.sessions))
      if (value.userId === user.id) delete data.sessions[key];
    data.events = data.events.map((item) =>
      item.actor === user.email ? { ...item, actor: "deleted-account" } : item,
    );
    securityEvent(data, "account_deleted", "deleted-account");
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return response;
}
