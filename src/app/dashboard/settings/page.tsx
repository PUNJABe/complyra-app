"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
type Profile = {
  email: string;
  name: string;
  role: string;
  aiEnabled: boolean;
  reminderEmail: boolean;
};
const input =
  "mt-2 w-full rounded-xl border border-ink/20 bg-canvas p-3 text-sm";
const button =
  "rounded-xl bg-emerald-900 px-4 py-3 text-xs font-semibold text-white disabled:opacity-50";
export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<
    { createdAt: number; lastSeenAt: number }[]
  >([]);
  useEffect(() => {
    void apiFetch("/api/account")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setProfile(data.user);
        setName(data.user.name);
        setSessions(data.sessions);
      })
      .catch((error) => setStatus(error.message));
  }, []);
  async function update(data: object) {
    setBusy(true);
    setStatus("");
    try {
      const response = await apiFetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Update failed.");
      if (result.signInAgain) {
        router.push("/auth/login");
        router.refresh();
      } else {
        setStatus("Your changes have been saved.");
        setProfile((current) => (current ? { ...current, ...data } : current));
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    try {
      const response = await apiFetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword, confirmation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Deletion failed.");
      router.push("/");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Deletion failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-widest text-emerald-700">
          YOUR WORKSPACE, YOUR CHOICES
        </p>
        <h2 className="mt-2 text-2xl font-medium">Account & privacy</h2>
      </div>
      {status && (
        <p
          role="status"
          className="rounded-xl border border-ink/15 p-4 text-sm"
        >
          {status}
        </p>
      )}
      {!profile ? (
        <p className="text-sm text-ink/50">Loading account...</p>
      ) : (
        <>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void update({ name });
            }}
            className="rounded-2xl border border-ink/10 p-5"
          >
            <h3 className="font-semibold">Profile</h3>
            <p className="mt-2 text-xs text-ink/55">
              Verified email: {profile.email} / Role: {profile.role}
            </p>
            <label className="mt-4 block text-xs">
              Your name
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoComplete="name"
                className={input}
              />
            </label>
            <button disabled={busy} className={`${button} mt-4`}>
              Save profile
            </button>
            <p className="mt-3 text-xs text-ink/50">
              Your verified email is your account identifier. Contact the
              operator if it needs correction.
            </p>
          </form>
          <section className="space-y-5 rounded-2xl border border-ink/10 p-5">
            <h3 className="font-semibold">Privacy preferences</h3>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                disabled={busy}
                checked={profile.aiEnabled}
                onChange={(e) => void update({ aiEnabled: e.target.checked })}
              />
              <span>
                Enable external AI assistance
                <span className="mt-2 block text-xs leading-6 text-ink/55">
                  When enabled, statement summaries, merchant narrations and
                  your assistant messages may be sent to OpenAI for assistance.
                  Long number sequences in category requests are redacted.
                  Review the{" "}
                  <Link href="/legal/privacy" className="underline">
                    privacy notice
                  </Link>
                  . You can withdraw this choice at any time; local rules remain
                  available.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                disabled={busy}
                checked={profile.reminderEmail}
                onChange={(e) =>
                  void update({ reminderEmail: e.target.checked })
                }
              />
              <span>
                Email me when my statement needs a 24-hour update
                <span className="mt-2 block text-xs leading-6 text-ink/55">
                  In-app reminders are always available. Email reminders require
                  the operator&apos;s delivery service and scheduler.
                </span>
              </span>
            </label>
          </section>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void update({ currentPassword: password, newPassword });
            }}
            className="space-y-4 rounded-2xl border border-ink/10 p-5"
          >
            <h3 className="font-semibold">Password & sessions</h3>
            <label className="block text-xs">
              Current password
              <input
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
              />
            </label>
            <label className="block text-xs">
              New password (12-128 characters)
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={input}
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button disabled={busy} className={button}>
                Change password & sign out everywhere
              </button>
              <button
                type="button"
                disabled={busy || !password}
                className="rounded-xl border border-ink/20 px-4 py-3 text-xs disabled:opacity-50"
                onClick={() =>
                  void update({
                    currentPassword: password,
                    revokeSessions: true,
                  })
                }
              >
                Revoke all sessions
              </button>
            </div>
            <p className="text-xs text-ink/50">
              Sessions expire after 30 minutes of inactivity, with a 7-day
              absolute limit.
            </p>
            <details className="text-xs">
              <summary className="cursor-pointer">
                Your sessions ({sessions.length})
              </summary>
              {sessions.map((session, index) => (
                <p className="mt-3 text-ink/55" key={index}>
                  Signed in {new Date(session.createdAt).toLocaleString()} /
                  Last seen {new Date(session.lastSeenAt).toLocaleString()}
                </p>
              ))}
            </details>
          </form>
          <section className="rounded-2xl border border-ink/10 p-5">
            <h3 className="font-semibold">Your records</h3>
            <p className="my-3 text-xs leading-6 text-ink/55">
              Download your profile, statement records, saved rules and review
              history as JSON.
            </p>
            <a
              className="inline-block rounded-xl border border-ink/20 px-4 py-3 text-xs"
              href="/api/account?export=true"
            >
              Download my data
            </a>
          </section>
          <details className="rounded-2xl border border-rose-500/25 p-5">
            <summary className="cursor-pointer text-sm font-semibold text-rose-600">
              Delete account and live workspace data
            </summary>
            <form onSubmit={deleteAccount} className="mt-5 space-y-4">
              <p className="text-xs leading-6 text-ink/60">
                This removes your account and active workspace, revokes every
                session, and anonymizes your security event identity. It cannot
                be undone. Export your records first. Backup and statutory
                retention obligations, if any, are described in the
                operator&apos;s privacy notice.
              </p>
              <label className="block text-xs">
                Current password
                <input
                  type="password"
                  required
                  maxLength={128}
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className={input}
                />
              </label>
              <label className="block text-xs">
                Type DELETE
                <input
                  required
                  pattern="DELETE"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className={input}
                />
              </label>
              <button
                disabled={busy || confirmation !== "DELETE"}
                className="rounded-xl bg-rose-700 px-4 py-3 text-xs text-white disabled:opacity-50"
              >
                Permanently delete account
              </button>
            </form>
          </details>
          <div className="flex flex-wrap gap-5 text-xs text-ink/55">
            <Link href="/legal/privacy">Privacy notice</Link>
            <Link href="/legal/terms">Terms of service</Link>
            <Link href="/legal/cookies">Cookie notice</Link>
          </div>
        </>
      )}
    </div>
  );
}
