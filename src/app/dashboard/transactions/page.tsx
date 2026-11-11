"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import { CATEGORIES } from "@/lib/transaction-categories";
import type { StoredTransaction } from "@/lib/storage";
import { apiFetch } from "@/lib/api-client";
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<StoredTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("review");
  const [query, setQuery] = useState("");
  async function load() {
    try {
      const response = await apiFetch("/api/transactions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Unable to load transactions.");
      setTransactions(data.transactions);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to load transactions.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void load();
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const pending = transactions.filter((item) => item.needsReview).length;
  const visible = transactions.filter(
    (item) =>
      (filter !== "review" || item.needsReview) &&
      `${item.merchant} ${item.category} ${item.remark || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <p className="text-xs tracking-widest text-emerald-700">
            YOUR CONTEXT MATTERS
          </p>
          <h2 className="mt-2 text-2xl font-medium">Transaction review</h2>
          <p className="mt-2 text-xs text-ink/60">
            {pending} transactions need a remark. Confirm the purpose against
            your original records.
          </p>
        </div>
        <Link
          className="self-start rounded-xl border border-ink/20 px-4 py-2 text-xs"
          href="/dashboard/upload"
        >
          Upload a statement
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink/15 px-3">
          <Search size={15} />
          <input
            aria-label="Search transactions"
            placeholder="Search merchant, category or remark"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 w-full bg-transparent py-3 text-xs"
          />
        </label>
        <select
          aria-label="Filter transactions"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-ink/15 bg-canvas p-3 text-xs"
        >
          <option value="review">Needs review ({pending})</option>
          <option value="all">All transactions ({transactions.length})</option>
        </select>
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
      {loading ? (
        <p className="py-10 text-sm text-ink/50">Loading your transactions…</p>
      ) : visible.length ? (
        <div className="space-y-4">
          {visible.map((transaction) => (
            <ReviewCard
              key={transaction.id}
              transaction={transaction}
              saved={() => {
                void load();
                window.dispatchEvent(new Event("statement-updated"));
              }}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-ink/10 p-9 text-center">
          <CheckCircle2 className="mx-auto text-emerald-700" />
          <p className="mt-3 text-sm">
            {transactions.length
              ? "No matching transactions need your attention."
              : "Upload your first statement to start reviewing."}
          </p>
        </div>
      )}
    </div>
  );
}
function ReviewCard({
  transaction,
  saved,
}: {
  transaction: StoredTransaction;
  saved: () => void;
}) {
  const [remark, setRemark] = useState(transaction.remark || "");
  const [category, setCategory] = useState(
    transaction.suggestedCategory || transaction.category,
  );
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await apiFetch("/api/transactions/remark", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: transaction.id,
          remark,
          category,
          rememberMerchant: remember,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      setMessage("Remark and category saved.");
      saved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="rounded-2xl border border-ink/10 bg-canvas/50 p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="break-words text-sm font-semibold">
            {transaction.merchant}
          </h3>
          <p className="mt-1 text-[11px] text-ink/50">
            {transaction.date} ·{" "}
            {transaction.direction === "credit" ? "Credit" : "Debit"} ·{" "}
            {transaction.category}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
            }).format(transaction.amount)}
          </p>
          <p className="mt-1 text-[10px] text-ink/50">
            {transaction.categorySource === "user"
              ? "Confirmed by you"
              : `${Math.round((transaction.confidence || 0) * 100)}% rule confidence`}
          </p>
        </div>
      </div>
      {transaction.needsReview && (
        <div className="mt-4 rounded-xl bg-amber-500/10 p-3 text-xs leading-6 text-amber-700">
          {transaction.reviewReasons?.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
          {transaction.suggestedCategory && (
            <p>AI suggests {transaction.suggestedCategory}. Please verify.</p>
          )}
        </div>
      )}
      <form onSubmit={submit} className="mt-4 space-y-3">
        <label className="block text-xs font-medium">
          Payment purpose / remark
          <textarea
            required
            minLength={5}
            maxLength={1000}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="For example: taxi to a client meeting; invoice checked."
            className="mt-2 w-full rounded-xl border border-ink/20 bg-white p-3 text-xs leading-6"
            rows={2}
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs">
            Category{" "}
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="ml-2 rounded-lg border border-ink/20 bg-white p-2"
            >
              {!CATEGORIES.includes(
                category as (typeof CATEGORIES)[number],
              ) && <option>{category}</option>}
              {CATEGORIES.map((item) => (
                <option key={item} value={item} disabled={item === "Other"}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-ink/60">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Use this category for this exact merchant in future imports
          </label>
          <button
            disabled={busy || category === "Other"}
            className="rounded-lg bg-emerald-900 px-4 py-2 text-xs text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Confirm & save"}
          </button>
        </div>
        {message && (
          <p role="status" className="text-xs text-ink/65">
            {message}
          </p>
        )}
      </form>
    </article>
  );
}
