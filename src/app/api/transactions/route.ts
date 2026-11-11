import { apiAccessError } from "@/lib/api-access";
import { NextResponse } from "next/server";

import { readStore, type StoredTransaction } from "@/lib/storage";

type TransactionType =
  | "UPI"
  | "Bank Transfer"
  | "Card Payment"
  | "Cash"
  | "Subscription"
  | "Vendor Invoice"
  | "General Purchase";

type TransactionRow = StoredTransaction & {
  transactionType: TransactionType;
};

function inferTransactionType(transaction: StoredTransaction): TransactionType {
  const merchant = transaction.merchant.toLowerCase();
  const category = transaction.category.toLowerCase();

  if (/upi|gpay|phonepe|paytm/.test(merchant)) return "UPI";
  if (/transfer|neft|rtgs|imps|bank/.test(merchant)) return "Bank Transfer";
  if (/cash|atm|withdrawal/.test(merchant)) return "Cash";
  if (
    /netflix|spotify|prime|adobe|microsoft|subscription/.test(merchant) ||
    /subscription|software|saas/.test(category)
  ) {
    return "Subscription";
  }
  if (
    /invoice|vendor|services|consulting|agency/.test(merchant) ||
    /vendor|services|consulting/.test(category)
  ) {
    return "Vendor Invoice";
  }
  if (/travel|fuel|food|shopping|utilities/.test(category))
    return "Card Payment";

  return "General Purchase";
}

function getActiveTransactions(store: {
  transactions: StoredTransaction[];
  activeStatementId?: string | null;
}) {
  if (!store.activeStatementId) return store.transactions;

  const active = store.transactions.filter(
    (transaction) => transaction.statementId === store.activeStatementId,
  );
  return active.length ? active : store.transactions;
}

export async function GET() {
  const accessError = await apiAccessError("GET");
  if (accessError) return accessError;
  const store = await readStore();
  const transactions = getActiveTransactions(store);

  const rows: TransactionRow[] = transactions.map((transaction) => ({
    ...transaction,
    transactionType: inferTransactionType(transaction),
  }));

  const byCategory = new Map<string, number>();
  const byType = new Map<string, number>();
  const expenses = rows.filter((row) => row.direction !== "credit");
  const totalAmount = expenses.reduce((sum, row) => sum + row.amount, 0);

  for (const row of expenses) {
    byCategory.set(
      row.category,
      (byCategory.get(row.category) ?? 0) + row.amount,
    );
    byType.set(
      row.transactionType,
      (byType.get(row.transactionType) ?? 0) + row.amount,
    );
  }

  return NextResponse.json({
    summary: {
      totalTransactions: rows.length,
      totalAmount,
      income: rows
        .filter((row) => row.direction === "credit")
        .reduce((sum, row) => sum + row.amount, 0),
      expenses: rows
        .filter((row) => row.direction !== "credit")
        .reduce((sum, row) => sum + row.amount, 0),
      needsReview: rows.filter((row) => row.needsReview).length,
    },
    categoryBreakdown: [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount,
        percent: totalAmount ? Math.round((amount / totalAmount) * 100) : 0,
      })),
    typeBreakdown: [...byType.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([type, amount]) => ({
        type,
        amount,
        percent: totalAmount ? Math.round((amount / totalAmount) * 100) : 0,
      })),
    transactions: rows.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    ),
  });
}
