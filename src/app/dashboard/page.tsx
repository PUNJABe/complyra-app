"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, FileUp, ShieldCheck } from "lucide-react";
import {
  DonutChartCard,
  LineChartCard,
  StackedBarCard,
} from "@/components/app/charts";
import type { OverviewPayload } from "@/lib/types";
import type { StoredTransaction } from "@/lib/storage";
import { apiFetch } from "@/lib/api-client";
const money = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewPayload | null>(null);
  const [transactions, setTransactions] = useState<StoredTransaction[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [a, b] = await Promise.all([
          apiFetch("/api/overview", { cache: "no-store" }),
          apiFetch("/api/transactions", { cache: "no-store" }),
        ]);
        if (!a.ok || !b.ok)
          throw new Error(
            "Unable to load your workspace. Please refresh or sign in again.",
          );
        const [overview, records] = await Promise.all([a.json(), b.json()]);
        if (active) {
          setOverview(overview);
          setTransactions(records.transactions);
        }
      } catch (error) {
        if (active)
          setError(
            error instanceof Error ? error.message : "Unable to load records.",
          );
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);
  if (error)
    return (
      <p
        role="alert"
        className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-600"
      >
        {error}
      </p>
    );
  if (!overview)
    return (
      <p className="py-12 text-center text-sm text-ink/50">
        Loading your financial picture...
      </p>
    );
  const expenses = transactions
    .filter((t) => t.direction !== "credit")
    .reduce((sum, t) => sum + t.amount, 0);
  const income = transactions
    .filter((t) => t.direction === "credit")
    .reduce((sum, t) => sum + t.amount, 0);
  const pending = transactions.filter((t) => t.needsReview).length;
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-emerald-600/15 bg-emerald-500/5 p-6">
        <div>
          <p className="text-[10px] font-semibold tracking-[.18em] text-emerald-700">
            THE BIG PICTURE
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight">
            A little more clarity.
          </h2>
          <p className="mt-3 text-xs leading-6 text-ink/60">
            Your uploaded statement, organized for your next decision.
          </p>
        </div>
        <Link
          href="/dashboard/upload"
          className="flex items-center gap-2 rounded-xl bg-emerald-900 px-4 py-3 text-xs text-white"
        >
          <FileUp size={16} /> Upload statement
        </Link>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {[
          [
            "Total expenses",
            money(expenses),
            "Debits in your active statement",
          ],
          ["Total credits", money(income), "Credits in your active statement"],
          [
            "Needs your context",
            String(pending),
            "Confirm a category and add a remark",
          ],
          [
            "Transactions",
            String(transactions.length),
            "Your statement records, without currency conversion",
          ],
        ].map(([label, value, hint]) => (
          <article key={label} className="rounded-2xl border border-ink/10 p-5">
            <p className="text-xs text-ink/55">{label}</p>
            <p className="mt-3 text-2xl font-medium tracking-tight">{value}</p>
            <p className="mt-2 text-[10px] text-ink/45">{hint}</p>
          </article>
        ))}
      </section>
      {!transactions.length ? (
        <section className="rounded-2xl border border-dashed border-ink/20 p-8 text-center">
          <FileUp className="mx-auto text-emerald-700" size={30} />
          <h3 className="mt-4 text-lg font-medium">
            Your workspace is ready for its first statement.
          </h3>
          <p className="mx-auto mt-3 max-w-md text-xs leading-6 text-ink/55">
            Import an INR CSV or Excel statement. Your records are private to
            this account. No sample transactions are mixed into your reports.
          </p>
          <Link
            href="/dashboard/upload"
            className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-700"
          >
            Add a statement <ArrowRight size={16} />
          </Link>
        </section>
      ) : (
        <>
          <Link
            href="/dashboard/transactions"
            className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 text-sm"
          >
            <span>
              {pending
                ? `${pending} payments need your review.`
                : "Your transaction review queue is clear."}
              <span className="mt-1 block text-xs text-ink/50">
                Add context, verify categories, and keep a record of your
                decisions.
              </span>
            </span>
            <ArrowRight className="shrink-0" size={18} />
          </Link>
          <div className="grid gap-4">
            <LineChartCard data={overview.charts.line} />
            <DonutChartCard data={overview.charts.donut} />
            <StackedBarCard data={overview.charts.stacked} />
          </div>
          <section className="rounded-2xl border border-ink/10 p-5">
            <h3 className="font-semibold">Recent transactions</h3>
            <div className="mt-4 divide-y divide-ink/10">
              {transactions.slice(0, 6).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex justify-between gap-4 py-3 text-xs"
                >
                  <div>
                    <p className="break-words font-medium">
                      {transaction.merchant}
                    </p>
                    <p className="mt-1 text-ink/45">
                      {transaction.date} / {transaction.category} /{" "}
                      {transaction.direction || "debit"}
                    </p>
                  </div>
                  <span className="shrink-0">{money(transaction.amount)}</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      <p className="flex items-start gap-2 rounded-xl border border-ink/10 p-4 text-[10px] leading-6 text-ink/50">
        <ShieldCheck size={16} className="mt-1 shrink-0" />
        Review prompts are statement-based signals. GST validity, invoices,
        statutory compliance, and tax entitlements cannot be established from a
        bank statement alone. Retain your original records and consult your
        adviser.
      </p>
    </div>
  );
}
