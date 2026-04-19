"use client";

import { useEffect, useState } from "react";

import type { CopilotPayload } from "@/lib/types";

export default function CopilotPage() {
  const [data, setData] = useState<CopilotPayload | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/copilot", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load copilot insights.");
        setData((await response.json()) as CopilotPayload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected copilot error.");
      }
    };

    run();
  }, []);

  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!data) return <p className="text-sm text-ink/70">Loading copilot insights...</p>;

  const applyRecommendation = async (recommendationId: string) => {
    setApplyingId(recommendationId);
    setStatus("");
    setError("");

    try {
      const response = await fetch("/api/copilot/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to apply recommendation.");
      setStatus(payload.message ?? "Recommendation applied.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected apply error.");
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-white/82 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">Finance Copilot</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{data.headline}</h2>
        <p className="mt-2 text-sm text-ink/70">Insight → Recommendation → Action, with clear business impact.</p>
      </section>

      {status && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}

      <section className="grid gap-4 lg:grid-cols-2">
        {data.recommendations.map((item) => (
          <article key={item.id} className="rounded-2xl border border-ink/10 bg-white/82 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Insight</p>
            <p className="mt-1 text-sm text-ink/80">{item.insight}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Recommendation</p>
            <p className="mt-1 text-sm text-ink/80">{item.recommendation}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Action</p>
            <p className="mt-1 text-sm text-ink/80">{item.action}</p>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-canvas/70 px-3 py-2 text-xs">
              <span className="font-semibold text-ink/75">{item.savingsImpact}</span>
              <span className="text-ink/60">Confidence {item.confidence}%</span>
            </div>

            <button
              type="button"
              onClick={() => applyRecommendation(item.id)}
              disabled={applyingId === item.id}
              className="mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-canvas transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {applyingId === item.id ? "Applying..." : "Apply this recommendation"}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}
