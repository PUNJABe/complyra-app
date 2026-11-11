"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { ShieldCheck } from "lucide-react";
type AdminData = {
  users: {
    id: string;
    email: string;
    name: string;
    role: string;
    disabled: boolean;
    accessAllowed: boolean;
  }[];
  access: { allowlist: string[]; blocklist: string[]; allowlistOnly: boolean };
  metrics: Record<string, number>;
  services: Record<string, string | boolean>;
  events: { id: string; action: string; actor: string; at: string }[];
};
export function AdminPanel() {
  const [data, setData] = useState<AdminData | null>(null);
  const [allow, setAllow] = useState("");
  const [block, setBlock] = useState("");
  const [only, setOnly] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    const response = await apiFetch("/api/admin", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Unable to load admin data.");
    setData(result);
    setAllow(result.access.allowlist.join("\n"));
    setBlock(result.access.blocklist.join("\n"));
    setOnly(result.access.allowlistOnly);
  }
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void load().catch((error) => setStatus(error.message));
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  async function update(body: object) {
    setBusy(true);
    setStatus("");
    try {
      const response = await apiFetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save.");
      await load();
      setStatus(
        "Access controls updated. Affected sessions have been revoked.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-6xl space-y-7 px-5 py-9">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs tracking-widest text-emerald-700">
            <ShieldCheck size={17} /> ADMINISTRATOR ACCESS
          </p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight">
            Control center
          </h1>
          <p className="mt-2 text-xs text-ink/55">
            Account operations and aggregate product analytics. Personal
            statement records remain in their owners’ workspaces.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border border-ink/20 px-4 py-3 text-xs"
        >
          Back to workspace
        </Link>
      </header>
      {status && (
        <p
          role="status"
          className="rounded-xl border border-ink/15 bg-white p-4 text-sm"
        >
          {status}
        </p>
      )}
      {!data ? (
        <p className="text-sm text-ink/50">Loading control center…</p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Object.entries(data.metrics).map(([name, value]) => (
              <article
                key={name}
                className="rounded-2xl border border-ink/10 bg-white/85 p-5"
              >
                <p className="text-[10px] capitalize text-ink/55">
                  {name.replace(/([A-Z])/g, " $1")}
                </p>
                <p className="mt-3 text-3xl font-medium">{value}</p>
              </article>
            ))}
          </section>
          <p className="text-[11px] text-ink/50">
            Security event counts use the most recent 500 retained events.
            Metrics describe current accounts and active statements.
          </p>
          <section className="rounded-2xl border border-ink/10 bg-white/85 p-5">
            <h2 className="font-semibold">Services</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {Object.entries(data.services).map(([name, value]) => (
                <span
                  key={name}
                  className="rounded-xl border border-ink/15 px-3 py-2 text-xs"
                >
                  <span className="capitalize">{name}: </span>
                  {typeof value === "boolean"
                    ? value
                      ? "Configured"
                      : "Needs configuration"
                    : value}
                </span>
              ))}
            </div>
          </section>
          <form
            className="rounded-2xl border border-ink/10 bg-white/85 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void update({
                access: {
                  allowlist: allow
                    .split(/[\n,]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                  blocklist: block
                    .split(/[\n,]/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                  allowlistOnly: only,
                },
              });
            }}
          >
            <h2 className="font-semibold">Allowlist & blocklist</h2>
            <p className="mt-2 text-xs leading-6 text-ink/55">
              One email or @domain.example per line. Block rules take priority.
              Server environment rules also apply and must be changed by the
              operator.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-xs">
                Allowlist
                <textarea
                  rows={5}
                  value={allow}
                  onChange={(e) => setAllow(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-canvas p-3"
                />
              </label>
              <label className="text-xs">
                Blocklist
                <textarea
                  rows={5}
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-ink/20 bg-canvas p-3"
                />
              </label>
            </div>
            <label className="my-4 flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={only}
                onChange={(e) => setOnly(e.target.checked)}
              />
              Allow only listed addresses and domains
            </label>
            <button
              disabled={busy}
              className="rounded-xl bg-emerald-900 px-4 py-3 text-xs text-white disabled:opacity-50"
            >
              Save access rules
            </button>
          </form>
          <section className="rounded-2xl border border-ink/10 bg-white/85 p-5">
            <h2 className="font-semibold">Accounts</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-ink/10 text-ink/50">
                    <th className="p-3">Account</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Access</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id} className="border-b border-ink/10">
                      <td className="p-3">
                        {user.name}
                        <span className="mt-1 block text-ink/50">
                          {user.email}
                        </span>
                      </td>
                      <td className="p-3">
                        <select
                          aria-label={`Role for ${user.email}`}
                          disabled={busy}
                          value={user.role}
                          className="rounded-lg border border-ink/15 bg-canvas p-2"
                          onChange={(e) =>
                            void update({
                              userId: user.id,
                              role: e.target.value,
                            })
                          }
                        >
                          {["employee", "viewer", "ca", "admin"].map((role) => (
                            <option key={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        {user.disabled
                          ? "Disabled"
                          : user.accessAllowed
                            ? "Allowed"
                            : "Blocked by rules"}
                      </td>
                      <td className="p-3">
                        <button
                          disabled={busy}
                          onClick={() =>
                            void update({
                              userId: user.id,
                              disabled: !user.disabled,
                            })
                          }
                          className="rounded-lg border border-ink/20 px-3 py-2"
                        >
                          {user.disabled ? "Enable" : "Disable"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded-2xl border border-ink/10 bg-white/85 p-5">
            <h2 className="font-semibold">Security events</h2>
            <div className="mt-4 max-h-96 space-y-3 overflow-y-auto">
              {data.events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-ink/10 pb-3 text-xs"
                >
                  <div>
                    <p>{event.action.replaceAll("_", " ")}</p>
                    <p className="mt-1 text-ink/50">{event.actor}</p>
                  </div>
                  <time className="text-ink/45">
                    {new Date(event.at).toLocaleString()}
                  </time>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
