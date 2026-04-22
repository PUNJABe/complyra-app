"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { useFormatMoney } from "@/lib/use-format-money";

type TransactionRow = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  employee: string;
  department: string;
  category: string;
  transactionType: string;
};

type SpendPayload = {
  summary: {
    totalTransactions: number;
    totalAmount: number;
  };
  categoryBreakdown: Array<{ category: string; amount: number; percent: number }>;
  typeBreakdown: Array<{ type: string; amount: number; percent: number }>;
  transactions: TransactionRow[];
};

export default function SpendAnalysiserPage() {
  const [data, setData] = useState<SpendPayload | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const formatMoney = useFormatMoney();

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/transactions", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load spend analysis data.");
        setData((await response.json()) as SpendPayload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected spend analysis error.");
      }
    };

    void run();
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((row) => {
      const matchesCategory = categoryFilter === "all" || row.category === categoryFilter;
      const matchesType = typeFilter === "all" || row.transactionType === typeFilter;
      const hay = `${row.merchant} ${row.employee} ${row.department} ${row.category} ${row.transactionType}`.toLowerCase();
      const matchesQuery = !query.trim() || hay.includes(query.toLowerCase());
      return matchesCategory && matchesType && matchesQuery;
    });
  }, [data, categoryFilter, query, typeFilter]);

  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!data) return <p className="text-sm text-ink/70">Loading spend analysis...</p>;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-white/85 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1E3A8A]">Spend Analysiser</p>
        <h2 className="mt-2 text-2xl font-semibold">Statement Transaction Intelligence</h2>
        <p className="mt-1 text-sm text-ink/70">
          Bank-statement style transaction view, organized by category and transaction type.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-ink/10 bg-white/88 p-4">
          <p className="text-xs text-ink/55">Total Transactions</p>
          <p className="mt-1 text-3xl font-semibold">{data.summary.totalTransactions}</p>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-white/88 p-4">
          <p className="text-xs text-ink/55">Total Spend</p>
          <p className="mt-1 text-3xl font-semibold">{formatMoney(data.summary.totalAmount)}</p>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-white/88 p-4">
          <p className="text-xs text-ink/55">Visible Rows</p>
          <p className="mt-1 text-3xl font-semibold">{rows.length}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-ink/10 bg-white/88 p-4">
          <h3 className="text-base font-semibold">Category Usage</h3>
          <div className="mt-3 space-y-2">
            {data.categoryBreakdown.slice(0, 6).map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between text-sm">
                  <span>{item.category}</span>
                  <span className="font-semibold">{item.percent}% • {formatMoney(item.amount)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-canvas">
                  <div className="h-2 rounded-full bg-[#1E3A8A]" style={{ width: `${Math.min(100, item.percent)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-ink/10 bg-white/88 p-4">
          <h3 className="text-base font-semibold">Transaction Type Mix</h3>
          <div className="mt-3 space-y-2">
            {data.typeBreakdown.map((item) => (
              <div key={item.type}>
                <div className="flex items-center justify-between text-sm">
                  <span>{item.type}</span>
                  <span className="font-semibold">{item.percent}% • {formatMoney(item.amount)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-canvas">
                  <div className="h-2 rounded-full bg-[#10B981]" style={{ width: `${Math.min(100, item.percent)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/10 bg-white/88 p-4">
        <div className="flex items-center gap-2 rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm">
          <Search size={15} className="text-ink/55" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search merchant, employee, category, type"
            className="w-64 bg-transparent outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All categories</option>
          {data.categoryBreakdown.map((item) => (
            <option key={item.category} value={item.category}>{item.category}</option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All transaction types</option>
          {data.typeBreakdown.map((item) => (
            <option key={item.type} value={item.type}>{item.type}</option>
          ))}
        </select>
      </section>

      <section className="overflow-hidden rounded-2xl border border-ink/10 bg-white/88">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-canvas/60 text-ink/65">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Merchant</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Transaction Type</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-ink/8">
                <td className="px-4 py-3">{row.date}</td>
                <td className="px-4 py-3 font-medium text-ink/85">{row.merchant}</td>
                <td className="px-4 py-3">{row.category}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-canvas px-2 py-1 text-xs font-semibold text-ink/75">{row.transactionType}</span>
                </td>
                <td className="px-4 py-3 text-ink/70">{row.department}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}