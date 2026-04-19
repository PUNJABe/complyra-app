"use client";

import { useEffect, useMemo, useState } from "react";

import type { PolicyRule } from "@/lib/types";

export default function PolicyBuilderPage() {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [draggedRuleId, setDraggedRuleId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/policy-rules", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load policy rules.");
        const payload = (await response.json()) as { rules: PolicyRule[] };
        setRules(payload.rules);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected rule loading error.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const template = useMemo(
    () =>
      rules.map((rule, index) => `${index + 1}. ${rule.name}: ${rule.condition} => ${rule.action}`).join("\n"),
    [rules]
  );

  const onDrop = (targetId: string) => {
    if (!draggedRuleId || draggedRuleId === targetId) return;

    const sourceIndex = rules.findIndex((rule) => rule.id === draggedRuleId);
    const targetIndex = rules.findIndex((rule) => rule.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const next = [...rules];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setRules(next);
    setDraggedRuleId(null);

    const persist = async () => {
      try {
        const response = await fetch("/api/policy-rules", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: next.map((rule) => rule.id) }),
        });

        if (!response.ok) throw new Error("Failed to persist rule order.");
        setStatus("Rule priority updated.");
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected rule ordering error.");
      }
    };

    void persist();
  };

  if (loading) {
    return <p className="text-sm text-ink/70">Loading policy rules...</p>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-white/82 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">No-code Compliance Engine</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Drag-drop policy builder</h2>
        <p className="mt-1 text-sm text-ink/70">Reorder rule priority and export human-readable policy logic templates.</p>
      </section>

      {status && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</p>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
          <h3 className="text-base font-semibold">Rule Stack</h3>
          <div className="mt-3 space-y-3">
            {rules.map((rule) => (
              <div
                key={rule.id}
                draggable
                onDragStart={() => setDraggedRuleId(rule.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => onDrop(rule.id)}
                className="cursor-move rounded-xl border border-ink/15 bg-canvas/70 px-3 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{rule.name}</p>
                  <span className="rounded-full border border-ink/20 bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-ink/60">
                    {rule.source}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink/70">{rule.condition}</p>
                <p className="mt-1 text-xs text-ink/70">Action: {rule.action}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
          <h3 className="text-base font-semibold">Shareable Template</h3>
          <textarea readOnly value={template} className="mt-3 min-h-64 w-full rounded-xl border border-ink/20 bg-white px-3 py-2.5 text-sm" />
        </article>
      </section>
    </div>
  );
}
