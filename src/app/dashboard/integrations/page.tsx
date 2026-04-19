"use client";

import { FormEvent, useEffect, useState } from "react";

import type { IntegrationsPayload } from "@/lib/types";

export default function IntegrationsPage() {
  const [data, setData] = useState<IntegrationsPayload | null>(null);
  const [channel, setChannel] = useState<"slack" | "whatsapp">("slack");
  const [message, setMessage] = useState("⚠️ Policy violation: Rs 12,000 alcohol expense detected");
  const [recipient, setRecipient] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    const response = await fetch("/api/integrations", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to load integrations.");
    setData((await response.json()) as IntegrationsPayload);
  };

  useEffect(() => {
    const run = async () => {
      try {
        await loadData();
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected integration error.");
      }
    };
    run();
  }, []);

  const sendTestAlert = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("");
    setError("");

    try {
      const response = await fetch("/api/integrations/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, message, recipient: recipient || undefined }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to send alert.");
      setStatus(payload.message ?? "Alert sent.");
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected alert error.");
    }
  };

  const processQueue = async () => {
    setStatus("");
    setError("");

    try {
      const response = await fetch("/api/integrations/process", { method: "POST" });
      const payload = (await response.json()) as { processed?: number; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to process queue.");
      setStatus(`Processed ${payload.processed ?? 0} queued deliveries.`);
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected queue processing error.");
    }
  };

  if (error && !data) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!data) return <p className="text-sm text-ink/70">Loading integrations...</p>;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2">
        {data.channels.map((entry) => (
          <article key={entry.kind} className="rounded-2xl border border-ink/10 bg-white/82 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">{entry.kind}</p>
            <p className="mt-2 text-sm text-ink/80">Target: {entry.target}</p>
            <p className="mt-1 text-sm text-ink/70">Status: {entry.configured ? "Configured" : "Not configured (mock mode)"}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/82 p-5">
        <h3 className="text-base font-semibold">Send Test Alert</h3>
        <form onSubmit={sendTestAlert} className="mt-3 space-y-3">
          <div className="inline-flex rounded-full border border-ink/15 bg-canvas/70 p-1 text-sm">
            <button type="button" onClick={() => setChannel("slack")} className={`rounded-full px-3 py-1.5 ${channel === "slack" ? "bg-ink text-canvas" : "text-ink/70"}`}>
              Slack
            </button>
            <button type="button" onClick={() => setChannel("whatsapp")} className={`rounded-full px-3 py-1.5 ${channel === "whatsapp" ? "bg-ink text-canvas" : "text-ink/70"}`}>
              WhatsApp
            </button>
          </div>

          <textarea value={message} onChange={(event) => setMessage(event.target.value)} className="min-h-24 w-full rounded-xl border border-ink/20 bg-white px-3 py-2.5 text-sm" />

          {channel === "whatsapp" && (
            <input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="Optional recipient number, e.g. 919999999999"
              className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2.5 text-sm"
            />
          )}

          <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-canvas">Send Alert</button>
          <button type="button" onClick={processQueue} className="ml-2 rounded-full border border-ink/20 bg-white px-4 py-2 text-sm font-semibold text-ink">
            Process Queue Now
          </button>
        </form>
        {status && <p className="mt-3 text-sm text-emerald-700">{status}</p>}
        {error && <p className="mt-2 text-sm text-rose-700">{error}</p>}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-2xl border border-ink/10 bg-white/82 p-4"><p className="text-xs text-ink/55">Queued</p><p className="mt-1 text-2xl font-semibold">{data.queue.queued}</p></article>
        <article className="rounded-2xl border border-ink/10 bg-white/82 p-4"><p className="text-xs text-ink/55">Retrying</p><p className="mt-1 text-2xl font-semibold">{data.queue.retrying}</p></article>
        <article className="rounded-2xl border border-ink/10 bg-white/82 p-4"><p className="text-xs text-ink/55">Sent</p><p className="mt-1 text-2xl font-semibold">{data.queue.sent}</p></article>
        <article className="rounded-2xl border border-ink/10 bg-white/82 p-4"><p className="text-xs text-ink/55">Dead-letter</p><p className="mt-1 text-2xl font-semibold">{data.queue.deadLetter}</p></article>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/82 p-5">
        <h3 className="text-base font-semibold">Recent Alerts</h3>
        <ul className="mt-3 space-y-2 text-sm text-ink/75">
          {data.alerts.map((alert) => (
            <li key={alert.id} className="rounded-xl bg-canvas/70 px-3 py-2">
              [{alert.channel}] {alert.message}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/82 p-5">
        <h3 className="text-base font-semibold">Recent Delivery Receipts</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-ink/55">
                <th className="pb-2 font-medium">Job</th>
                <th className="pb-2 font-medium">Channel</th>
                <th className="pb-2 font-medium">Attempt</th>
                <th className="pb-2 font-medium">Success</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {data.recentReceipts.map((receipt) => (
                <tr key={receipt.id} className="border-b border-ink/8 last:border-b-0">
                  <td className="py-2">{receipt.jobId}</td>
                  <td className="py-2">{receipt.channel}</td>
                  <td className="py-2">{receipt.attempt}</td>
                  <td className="py-2">{receipt.success ? "Yes" : "No"}</td>
                  <td className="py-2">{receipt.statusCode ?? "-"}</td>
                  <td className="py-2 text-ink/65">{receipt.error ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/82 p-5">
        <h3 className="text-base font-semibold">Dead-letter Log</h3>
        {data.deadLetters.length === 0 ? (
          <p className="mt-2 text-sm text-ink/65">No dead-letter entries.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-ink/75">
            {data.deadLetters.map((entry) => (
              <li key={entry.id} className="rounded-xl bg-canvas/70 px-3 py-2">
                [{entry.channel}] {entry.reason} (attempts: {entry.attempts})
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
