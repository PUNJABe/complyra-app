import { apiAccessError } from "@/lib/api-access";
import { NextResponse } from "next/server";
import {
  accessAllowed,
  changeSecurity,
  publicUser,
  requireSession,
  securityEvent,
  securityState,
  validEmail,
} from "@/lib/auth";
import { readUserStore } from "@/lib/storage";
export async function GET() {
  const accessError = await apiAccessError("GET");
  if (accessError) return accessError;
  const session = await requireSession();
  if (session.role !== "admin")
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  const state = await securityState();
  const workspaces = await Promise.all(
    state.users.map((user) => readUserStore(user.id)),
  );
  return NextResponse.json({
    users: state.users.map((user) => ({
      ...publicUser(user),
      disabled: user.disabled,
      accessAllowed: accessAllowed(user.email, state),
    })),
    access: {
      allowlist: state.allowlist,
      blocklist: state.blocklist,
      allowlistOnly: state.allowlistOnly,
      environmentRulesManagedOnServer: true,
    },
    events: state.events.slice(-100).reverse(),
    metrics: {
      users: state.users.length,
      verifiedUsers: state.users.filter((user) => user.verifiedAt).length,
      activeSessions: Object.values(state.sessions).filter(
        (s) => Date.now() - s.lastSeenAt < 30 * 60000,
      ).length,
      pendingVerifications: state.pending.length,
      transactions: workspaces.reduce(
        (sum, store) => sum + store.transactions.length,
        0,
      ),
      needsReview: workspaces.reduce(
        (sum, store) =>
          sum + store.transactions.filter((t) => t.needsReview).length,
        0,
      ),
      overdueStatements: workspaces.filter(
        (store, index) =>
          Date.now() -
            new Date(
              store.lastStatementAt || state.users[index].createdAt,
            ).getTime() >=
          86400000,
      ).length,
      failedLogins: state.events.filter(
        (event) => event.action === "login_failed",
      ).length,
    },
    services: {
      database:
        process.env.COMPLYRA_STORAGE_MODE === "oracle"
          ? "Oracle"
          : process.env.COMPLYRA_STORAGE_MODE === "postgres"
            ? "PostgreSQL"
            : "Local development files",
      email: Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY),
      ai: Boolean(process.env.OPENAI_API_KEY),
      policiesReady: Boolean(
        process.env.PRIVACY_CONTACT_EMAIL &&
        process.env.LEGAL_POLICIES_APPROVED === "true",
      ),
    },
  });
}
export async function PATCH(request: Request) {
  const accessError = await apiAccessError("PATCH");
  if (accessError) return accessError;
  const session = await requireSession();
  if (session.role !== "admin")
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  const body = await request.json();
  if (body.access) {
    const lists = [body.access.allowlist, body.access.blocklist];
    if (
      lists.some(
        (list) =>
          !Array.isArray(list) ||
          list.length > 200 ||
          list.some(
            (entry: unknown) =>
              typeof entry !== "string" ||
              !(validEmail(entry) || /^@[a-z0-9.-]+\.[a-z]{2,}$/i.test(entry)),
          ),
      )
    )
      return NextResponse.json(
        {
          error:
            "Use valid email addresses or @domain.example entries; maximum 200 per list.",
        },
        { status: 400 },
      );
  }
  const error = await changeSecurity((state) => {
    if (body.access) {
      const proposed = {
        ...state,
        allowlist: body.access.allowlist.map((x: string) => x.toLowerCase()),
        blocklist: body.access.blocklist.map((x: string) => x.toLowerCase()),
        allowlistOnly: body.access.allowlistOnly === true,
      };
      if (!accessAllowed(session.email, proposed))
        return "Your access rules would lock out your own administrator account.";
      state.allowlist = proposed.allowlist;
      state.blocklist = proposed.blocklist;
      state.allowlistOnly = proposed.allowlistOnly;
    } else {
      const user = state.users.find((item) => item.id === body.userId);
      if (!user || user.id === session.userId)
        return "Choose another account. Administrators cannot change their own access here.";
      if (typeof body.disabled === "boolean") user.disabled = body.disabled;
      if (["admin", "ca", "employee", "viewer"].includes(body.role))
        user.role = body.role;
      for (const [key, value] of Object.entries(state.sessions))
        if (value.userId === user.id) delete state.sessions[key];
    }
    securityEvent(
      state,
      body.access ? "access_rules_updated" : "account_access_updated",
      session.email,
    );
    // Blocking or removing an allow rule immediately revokes matching sessions.
    for (const [key, value] of Object.entries(state.sessions)) {
      const user = state.users.find((item) => item.id === value.userId);
      if (!user || user.disabled || !accessAllowed(user.email, state))
        delete state.sessions[key];
    }
    return null;
  });
  return NextResponse.json(error ? { error } : { ok: true }, {
    status: error ? 400 : 200,
  });
}
