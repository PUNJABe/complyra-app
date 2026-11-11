"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { StoredTransaction } from "@/lib/storage";
import type { CopilotPayload } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";
import {
  useDisplayCurrencyQuery,
  useFormatMoney,
} from "@/lib/use-format-money";
import { identifyAppPlatform } from "@/lib/app-platforms";
export default function InsightsPage() {
  const money = useFormatMoney();
  const { ready: currencyReady, search: currencySearch } =
    useDisplayCurrencyQuery();
  const [transactions, setTransactions] = useState<StoredTransaction[] | null>(
    null,
  );
  const [error, setError] = useState("");
  const [copilot, setCopilot] = useState<CopilotPayload | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void apiFetch("/api/transactions", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Unable to load insights.");
        setTransactions(data.transactions);
      })
      .catch((error) => setError(error.message));
  }, []);
  async function suggest() {
    setBusy(true);
    setError("");
    try {
      const response = await apiFetch(`/api/copilot?${currencySearch}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Assistance unavailable.");
      setCopilot(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Assistance unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!transactions)
    return (
      <p className="py-8 text-sm text-ink/50">
        {error || "Loading insights..."}
      </p>
    );
  const expenses = transactions.filter((item) => item.direction !== "credit");
  const total = expenses.reduce((sum, item) => sum + item.amount, 0);
  const pending = transactions.filter((item) => item.needsReview);
  const categories = new Map<string, number>();
  const apps = new Map<string, { count: number; total: number }>();
  for (const item of expenses)
  {
    categories.set(
      item.category,
      (categories.get(item.category) || 0) + item.amount,
    );
    const app = identifyAppPlatform(item.merchant);
    if (app) {
      const current = apps.get(app.name) || { count: 0, total: 0 };
      apps.set(app.name, {
        count: current.count + 1,
        total: current.total + item.amount,
      });
    }
  }
  const ordered = [...categories.entries()].sort((a, b) => b[1] - a[1]);
  const orderedApps = [...apps.entries()].sort(
    (a, b) => b[1].total - a[1].total,
  );
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs tracking-widest text-emerald-700">
          GROUNDED IN YOUR RECORDS
        </p>
        <h2 className="mt-2 text-3xl font-medium tracking-tight">
          Statement insights
        </h2>
        <p className="mt-3 text-xs leading-6 text-ink/55">
          These figures come from your current statement. Credits are excluded
          from spending totals. Category rules and review signals are heuristics
          requiring your judgment.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      <section className="grid gap-3 sm:grid-cols-2">
        {[
          ["Expense transactions", String(expenses.length)],
          ["Total expenses", money(total)],
          ["Average expense", money(total / Math.max(expenses.length, 1))],
          ["Needs your context", String(pending.length)],
        ].map(([label, value]) => (
          <article className="rounded-2xl border border-ink/10 p-5" key={label}>
            <p className="text-xs text-ink/50">{label}</p>
            <p className="mt-3 text-2xl font-medium">{value}</p>
          </article>
        ))}
      </section>
      {orderedApps.length > 0 && (
        <section className="rounded-2xl border border-ink/10 p-5">
          <h3 className="font-semibold">App and platform spend</h3>
          <p className="mt-2 text-xs leading-5 text-ink/55">
            Recognized merchants are grouped by platform. Check narration and
            receipts before treating repeated payments as subscriptions.
          </p>
          <div className="mt-4 divide-y divide-ink/10">
            {orderedApps.map(([name, app]) => (
              <div
                className="flex items-center justify-between gap-3 py-3 text-sm"
                key={name}
              >
                <span>
                  {name}
                  <span className="mt-1 block text-xs text-ink/50">
                    {app.count} {app.count === 1 ? "payment" : "payments"}
                  </span>
                </span>
                <span className="shrink-0">{money(app.total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="rounded-2xl border border-ink/10 p-5">
        <h3 className="font-semibold">Where expenses are concentrated</h3>
        {!ordered.length ? (
          <p className="mt-4 text-sm text-ink/50">
            Upload a statement to see category insights.
          </p>
        ) : (
          ordered.map(([category, amount]) => (
            <div className="mt-4" key={category}>
              <div className="flex justify-between gap-3 text-xs">
                <span>{category}</span>
                <span>
                  {money(amount)} /{" "}
                  {total ? Math.round((amount / total) * 100) : 0}%
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-ink/5">
                <div
                  className="h-2 rounded-full bg-emerald-700"
                  style={{ width: `${total ? (amount / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))
        )}
      </section>
      <section className="rounded-2xl border border-amber-500/25 p-5">
        <h3 className="font-semibold">Payments that need a closer look</h3>
        {pending.slice(0, 5).map((item) => (
          <div key={item.id} className="mt-4 text-xs">
            <p className="font-medium">
              {item.merchant} / {money(item.amount)}
            </p>
            <p className="mt-2 leading-6 text-ink/55">
              {item.reviewReasons?.join(" ")}
            </p>
          </div>
        ))}
        {!pending.length && (
          <p className="mt-3 text-xs text-ink/55">
            No payments are currently flagged for review.
          </p>
        )}
        <Link
          href="/dashboard/transactions"
          className="mt-5 inline-block text-xs font-semibold text-emerald-700 underline"
        >
          Review transactions and add remarks
        </Link>
      </section>
      <section className="rounded-2xl border border-ink/10 p-5">
        <h3 className="font-semibold">Get a second perspective</h3>
        <p className="my-3 text-xs leading-6 text-ink/55">
          Local suggestions are always available. External AI is used only if
          configured and enabled in your{" "}
          <Link href="/dashboard/settings" className="underline">
            privacy settings
          </Link>
          . Suggestions do not establish savings or tax eligibility.
        </p>
        <button
          disabled={busy || !currencyReady}
          onClick={() => void suggest()}
          className="rounded-xl bg-emerald-900 px-4 py-3 text-xs text-white disabled:opacity-50"
        >
          {!currencyReady
            ? "Updating exchange rate..."
            : busy
              ? "Reviewing..."
              : "Generate suggestions"}
        </button>
        {copilot && (
          <div className="mt-5 space-y-4">
            <p className="text-sm font-medium">{copilot.headline}</p>
            {copilot.recommendations.map((item) => (
              <article
                className="rounded-xl bg-canvas p-4 text-xs leading-6"
                key={item.id}
              >
                <p className="font-semibold">{item.insight}</p>
                <p className="mt-2 text-ink/65">{item.recommendation}</p>
                <p className="mt-2 text-emerald-700">{item.action}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      <p className="text-xs leading-6 text-ink/50">
        Bank statements alone cannot establish GST validity, missing invoices,
        legal compliance, or tax entitlements. No such checks are represented as
        completed here. Ask your accountant to verify source documents.
      </p>
    </div>
  );
}
