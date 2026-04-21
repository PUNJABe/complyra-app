"use client";

import { useState } from "react";
import { Toast } from "@/components/app/toast";

export default function SettingsPage() {
  const [privacyMode, setPrivacyMode] = useState(false);
  const [toast, setToast] = useState("");

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-canvas/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1E3A8A]">Settings</p>
        <h2 className="mt-2 text-2xl font-semibold">Profile & Security</h2>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-ink/10 bg-white/88 p-5">
          <h3 className="text-base font-semibold">Profile</h3>
          <div className="mt-3 space-y-3 text-sm">
            <input className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2" defaultValue="demo@complyra.local" />
            <input className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2" defaultValue="Finance Admin" />
            <button type="button" onClick={() => notify("Profile saved") } className="rounded-xl bg-[#1E3A8A] px-3 py-2 font-semibold text-white">Save Profile</button>
          </div>
        </article>

        <article className="rounded-2xl border border-ink/10 bg-white/88 p-5">
          <h3 className="text-base font-semibold">Security</h3>
          <div className="mt-3 space-y-3 text-sm">
            <button type="button" onClick={() => notify("Password reset flow started") } className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-left">Change password</button>
            <button type="button" onClick={() => notify("2FA enabled") } className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-left">Enable 2FA</button>
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">Secure session active</p>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/88 p-5">
        <h3 className="text-base font-semibold">Data Controls</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => notify("Delete data request created") } className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">Delete data</button>
          <button
            type="button"
            onClick={() => {
              setPrivacyMode((value) => !value);
              notify(`Privacy mode ${!privacyMode ? "enabled" : "disabled"}`);
            }}
            className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-semibold text-ink/75"
          >
            {privacyMode ? "Disable privacy mode" : "Enable privacy mode"}
          </button>
        </div>
      </section>

      <Toast message={toast} type="success" visible={Boolean(toast)} />
    </div>
  );
}
