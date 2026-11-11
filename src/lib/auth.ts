import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { mutateKV, readKV } from "@/lib/secure-kv";
import type { UserRole } from "@/lib/types";

export const AUTH_COOKIE = "complyra_session";
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const POLICY_VERSION = "2026-11-12";
export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  verifiedAt: string;
  createdAt: string;
  policyVersion: string;
  policyAcceptedAt: string;
  aiEnabled: boolean;
  reminderEmail: boolean;
  disabled: boolean;
};
type Pending = {
  email: string;
  passwordHash: string;
  name: string;
  tokenHash: string;
  expiresAt: number;
  policyVersion: string;
  policyAcceptedAt: string;
};
type Session = { userId: string; createdAt: number; lastSeenAt: number };
type Reset = { userId: string; tokenHash: string; expiresAt: number };
export type SecurityState = {
  users: User[];
  pending: Pending[];
  sessions: Record<string, Session>;
  resets: Reset[];
  allowlist: string[];
  blocklist: string[];
  allowlistOnly: boolean;
  events: { id: string; action: string; actor: string; at: string }[];
};
const initial: SecurityState = {
  users: [],
  pending: [],
  sessions: {},
  resets: [],
  allowlist: [],
  blocklist: [],
  allowlistOnly: false,
  events: [],
};
export const securityState = () => readKV("security", initial);
export const changeSecurity = <R>(
  change: (state: SecurityState) => R | Promise<R>,
) =>
  mutateKV("security", initial, async (state) => {
    const now = Date.now();
    state.pending = state.pending.filter((item) => item.expiresAt > now);
    state.resets = state.resets.filter((item) => item.expiresAt > now);
    for (const [key, session] of Object.entries(state.sessions))
      if (
        now - session.lastSeenAt > SESSION_IDLE_TIMEOUT_MS ||
        now - session.createdAt > 7 * 86400000
      )
        delete state.sessions[key];
    const result = await change(state);
    state.events = state.events.slice(-500);
    return result;
  });
export function securityEvent(
  state: SecurityState,
  action: string,
  actor: string,
) {
  state.events.push({
    id: randomUUID(),
    action,
    actor,
    at: new Date().toISOString(),
  });
}
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";
export const validEmail = (value: string) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const entries = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
export function accessAllowed(email: string, state: SecurityState) {
  const matches = (rule: string) =>
    rule === email || (rule.startsWith("@") && email.endsWith(rule));
  if (
    [...state.blocklist, ...entries(process.env.AUTH_BLOCKLIST)].some(matches)
  )
    return false;
  const allowlist = [
    ...state.allowlist,
    ...entries(process.env.AUTH_ALLOWLIST),
  ];
  return (
    !(state.allowlistOnly || process.env.AUTH_ALLOWLIST_ONLY === "true") ||
    allowlist.some(matches)
  );
}
export function passwordError(password: unknown) {
  return typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
    ? "Use a password between 12 and 128 characters."
    : null;
}
let activeDerivations = 0;
const derivationWaiters: (() => void)[] = [];
async function derive(password: string, salt: string) {
  // Bound memory pressure on a small application host, even during an auth burst.
  if (activeDerivations >= 2) {
    if (derivationWaiters.length >= 16)
      throw new Error("Authentication is busy. Please retry shortly.");
    await new Promise<void>((resolve) => derivationWaiters.push(resolve));
  } else activeDerivations++;
  try {
    return await new Promise<Buffer>((resolve, reject) =>
      scrypt(
        password,
        salt,
        64,
        { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 },
        (error, key) => (error ? reject(error) : resolve(key)),
      ),
    );
  } finally {
    const next = derivationWaiters.shift();
    if (next) next();
    else activeDerivations--;
  }
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$131072$8$1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (
    parts.length !== 6 ||
    parts.slice(0, 4).join("$") !== "scrypt$131072$8$1" ||
    !/^[a-f0-9]{32}$/.test(parts[4]) ||
    !/^[a-f0-9]{128}$/.test(parts[5])
  )
    return false;
  const actual = await derive(password, parts[4]);
  return timingSafeEqual(actual, Buffer.from(parts[5], "hex"));
}
export async function rateLimit(
  key: string,
  maximum = 10,
  windowMs = 15 * 60000,
) {
  const identity = digest(key);
  const bucket = parseInt(identity.slice(0, 4), 16) % 1024;
  return mutateKV(
    `rate:${bucket}`,
    { identities: {} as Record<string, { hits: number[]; expiresAt: number }> },
    (data) => {
      data.identities ??= {};
      for (const [id, value] of Object.entries(data.identities))
        if (value.expiresAt < Date.now()) delete data.identities[id];
      if (
        !data.identities[identity] &&
        Object.keys(data.identities).length >= 256
      )
        return false;
      const entry = data.identities[identity] ?? {
        hits: [],
        expiresAt: Date.now() + windowMs,
      };
      entry.hits = entry.hits.filter((at) => at > Date.now() - windowMs);
      entry.expiresAt = Date.now() + windowMs;
      data.identities[identity] = entry;
      if (entry.hits.length >= maximum) return false;
      entry.hits.push(Date.now());
      return true;
    },
  );
}
export function publicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    verifiedAt: user.verifiedAt,
    createdAt: user.createdAt,
    aiEnabled: user.aiEnabled,
    reminderEmail: user.reminderEmail,
    policyVersion: user.policyVersion,
    policyAcceptedAt: user.policyAcceptedAt,
  };
}
export async function decodeSession(raw: string | null | undefined) {
  if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null;
  const state = await securityState();
  const session = state.sessions[digest(raw)];
  if (
    !session ||
    Date.now() - session.lastSeenAt > SESSION_IDLE_TIMEOUT_MS ||
    Date.now() - session.createdAt > 7 * 86400000
  )
    return null;
  const user = state.users.find((item) => item.id === session.userId);
  if (
    !user ||
    user.disabled ||
    !user.verifiedAt ||
    !accessAllowed(user.email, state)
  )
    return null;
  return {
    ...publicUser(user),
    provider: "email" as const,
    userId: user.id,
    createdAt: session.createdAt,
    lastSeenAt: session.lastSeenAt,
  };
}
export async function currentSession() {
  return decodeSession((await cookies()).get(AUTH_COOKIE)?.value);
}
export async function requireSession() {
  const session = await currentSession();
  if (!session) throw new Error("Authentication required.");
  return session;
}
export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 7 * 86400,
};
export async function authenticate(email: string, password: string) {
  const state = await securityState();
  const user = state.users.find((item) => item.email === email);
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : Boolean(await hashPassword(password)) && false;
  if (
    !valid ||
    !user ||
    user.disabled ||
    !user.verifiedAt ||
    !accessAllowed(email, state)
  ) {
    await changeSecurity((data) => securityEvent(data, "login_failed", email));
    return null;
  }
  const token = randomBytes(32).toString("hex");
  return changeSecurity((data) => {
    const fresh = data.users.find((item) => item.id === user.id);
    if (
      !fresh ||
      fresh.disabled ||
      fresh.passwordHash !== user.passwordHash ||
      !accessAllowed(email, data)
    )
      return null;
    const existing = Object.entries(data.sessions)
      .filter(([, s]) => s.userId === user.id)
      .sort((a, b) => a[1].createdAt - b[1].createdAt);
    while (existing.length >= 5) delete data.sessions[existing.shift()![0]];
    data.sessions[digest(token)] = {
      userId: user.id,
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
    };
    securityEvent(data, "login_success", email);
    return token;
  });
}
export function bootstrapRole(email: string): UserRole {
  return entries(process.env.ADMIN_EMAILS).includes(email)
    ? "admin"
    : "employee";
}
