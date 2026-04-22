"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import type { CopilotPayload, PolicyPayload } from "@/lib/types";
import { Toast } from "@/components/app/toast";
import { useFormatMoney } from "@/lib/use-format-money";

export default function CompliancePage() {
  const [data, setData] = useState<PolicyPayload | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [fixSuggestions, setFixSuggestions] = useState<CopilotPayload["recommendations"] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const formatMoney = useFormatMoney();

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/policy", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load compliance page data.");
        setData((await response.json()) as PolicyPayload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected compliance error.");
      }
    };

    void run();
  }, []);

  const score = useMemo(() => {
    if (!data) return 0;
    const weighted = data.summary.highSeverity * 12 + data.summary.mediumSeverity * 6;
    return Math.max(40, 100 - weighted);
  }, [data]);

  const generateFixSuggestions = async () => {
    setLoadingSuggestions(true);
    setError("");

    try {
      const response = await fetch("/api/copilot", { cache: "no-store" });
      const payload = (await response.json()) as CopilotPayload & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate fix suggestions.");
      }

      setFixSuggestions(payload.recommendations.slice(0, 3));
      setToast("Fix suggestions generated from the current statement.");
      window.setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected suggestion error.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestion = async (recommendationId: string) => {
    setApplyingId(recommendationId);
    setError("");

    try {
      const response = await fetch("/api/copilot/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to apply fix suggestion.");

      setToast(payload.message ?? "Fix suggestion applied.");
      window.setTimeout(() => setToast(""), 2200);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected apply error.");
    } finally {
      setApplyingId(null);
    }
  };

  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!data) return <div className="h-44 animate-pulse rounded-2xl bg-canvas" />;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <article className="rounded-2xl border border-ink/10 bg-white/88 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1E3A8A]">Compliance Score</p>
          <div className="mt-4 flex items-center justify-center">
            <div className="relative flex h-44 w-44 items-center justify-center rounded-full border-8 border-canvas bg-white">
              <div
                className="absolute inset-2 rounded-full border-8 border-transparent"
                style={{ borderTopColor: score >= 85 ? "#10B981" : score >= 70 ? "#F59E0B" : "#EF4444" }}
              />
              <div className="text-center">
                <p className="text-4xl font-bold">{score}</p>
                <p className="text-xs text-ink/60">out of 100</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={generateFixSuggestions}
            disabled={loadingSuggestions}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Sparkles size={15} /> {loadingSuggestions ? "Generating..." : "Fix Suggestions"}
          </button>

          {fixSuggestions?.length ? (
            <div className="mt-4 space-y-3">
              {fixSuggestions.map((suggestion) => (
                <article key={suggestion.id} className="rounded-xl border border-ink/10 bg-canvas/60 p-3 text-sm">
                  <p className="font-semibold text-ink/85">{suggestion.insight}</p>
                  <p className="mt-1 text-ink/70">{suggestion.recommendation}</p>
                  <p className="mt-1 text-xs text-ink/55">
                    Estimated savings: {formatMoney(suggestion.savingsImpact)} • Confidence {suggestion.confidence}%
                  </p>
                  <button
                    type="button"
                    onClick={() => applySuggestion(suggestion.id)}
                    disabled={applyingId === suggestion.id}
                    className="mt-3 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-canvas disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {applyingId === suggestion.id ? "Applying..." : "Apply suggestion"}
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </article>

        <article className="rounded-2xl border border-ink/10 bg-white/88 p-5">
          <h3 className="text-lg font-semibold">Violations</h3>
          <div className="mt-3 space-y-2">
            {data.findings.map((item) => (
              <div key={item.id} className="rounded-xl border border-ink/10 bg-canvas/60 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink/85">{item.issue}</p>
                    <p className="text-xs text-ink/65">{item.merchant} • {item.explainability.ruleTriggered}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatMoney(item.amount)}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.severity === "high" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      {item.severity}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/88 p-5">
        <h3 className="text-lg font-semibold">Policy Rules</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {data.findings.slice(0, 6).map((item) => (
            <article key={`${item.id}-rule`} className="rounded-xl border border-ink/10 bg-canvas/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink/55">{item.explainability.ruleTriggered}</p>
              <p className="mt-1 text-sm text-ink/80">{item.explainability.impact}</p>
            </article>
          ))}
        </div>
      </section>

      <Toast message={toast} type="success" visible={Boolean(toast)} />
    </div>
  );
}
