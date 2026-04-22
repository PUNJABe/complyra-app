import { NextResponse } from "next/server";

import { answerForPrompt } from "@/lib/mock-data";
import { generateOpenAIText } from "@/lib/openai";
import { readStore } from "@/lib/storage";
import type { StoredTransaction } from "@/lib/storage";
import type { ChatMessage, ChatResponse } from "@/lib/types";

type ChatRequestBody = {
  prompt?: string;
  messages?: ChatMessage[];
};

function money(amount: number) {
  return `Rs ${Math.round(amount).toLocaleString("en-IN")}`;
}

function monthlyLabel(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return parsed.toLocaleString("en-US", { month: "short" });
}

function topItems<T>(items: T[], take: number, valueSelector: (item: T) => number) {
  return [...items].sort((a, b) => valueSelector(b) - valueSelector(a)).slice(0, take);
}

function buildTransactionSummary(transactions: StoredTransaction[]) {
  const totalSpend = transactions.reduce((sum, item) => sum + item.amount, 0);
  const averageSpend = totalSpend / Math.max(transactions.length, 1);

  const byMerchant = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byDepartment = new Map<string, number>();

  for (const item of transactions) {
    byMerchant.set(item.merchant, (byMerchant.get(item.merchant) ?? 0) + item.amount);
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amount);
    byDepartment.set(item.department, (byDepartment.get(item.department) ?? 0) + item.amount);
  }

  return {
    totalSpend,
    averageSpend,
    merchantSummary: topItems([...byMerchant.entries()], 5, (entry) => entry[1])
      .map(([name, value]) => `${name}: ${money(value)}`)
      .join("; "),
    categorySummary: topItems([...byCategory.entries()], 5, (entry) => entry[1])
      .map(([name, value]) => `${name}: ${money(value)}`)
      .join("; "),
    departmentSummary: topItems([...byDepartment.entries()], 4, (entry) => entry[1])
      .map(([name, value]) => `${name}: ${money(value)}`)
      .join("; "),
  };
}

function answerFromTransactions(prompt: string, transactions: StoredTransaction[]): ChatResponse {
  const q = prompt.toLowerCase();

  const totalSpend = transactions.reduce((sum, item) => sum + item.amount, 0);
  const averageSpend = totalSpend / Math.max(transactions.length, 1);

  const byMerchant = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const byDepartment = new Map<string, number>();
  const byMonth = new Map<string, number>();

  for (const item of transactions) {
    byMerchant.set(item.merchant, (byMerchant.get(item.merchant) ?? 0) + item.amount);
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amount);
    byDepartment.set(item.department, (byDepartment.get(item.department) ?? 0) + item.amount);
    const month = monthlyLabel(item.date);
    byMonth.set(month, (byMonth.get(month) ?? 0) + item.amount);
  }

  const merchantRows = topItems([...byMerchant.entries()], 5, (entry) => entry[1]);
  const categoryRows = topItems([...byCategory.entries()], 5, (entry) => entry[1]);
  const departmentRows = topItems([...byDepartment.entries()], 5, (entry) => entry[1]);
  const monthRows = [...byMonth.entries()]
    .filter((entry) => entry[0] !== "Unknown")
    .map(([label, value]) => ({ label, value }));

  if (q.includes("top") && (q.includes("merchant") || q.includes("vendor"))) {
    const list = merchantRows.map(([name, value], index) => `${index + 1}. ${name} - ${money(value)}`).join("\n");
    return {
      answer: `Top merchants by spend from your statements:\n${list}`,
      visualization: {
        kind: "donut",
        title: "Top Merchant Spend Share",
        segments: merchantRows.map(([label, value]) => ({ label, value })),
      },
    };
  }

  if (q.includes("category") || q.includes("breakdown")) {
    const list = categoryRows.map(([name, value], index) => `${index + 1}. ${name} - ${money(value)}`).join("\n");
    return {
      answer: `Category-wise breakdown from uploaded statements:\n${list}`,
      visualization: {
        kind: "donut",
        title: "Category Spend Distribution",
        segments: categoryRows.map(([label, value]) => ({ label, value })),
      },
    };
  }

  if (q.includes("department")) {
    const list = departmentRows.map(([name, value], index) => `${index + 1}. ${name} - ${money(value)}`).join("\n");
    return {
      answer: `Department spend split from current statement data:\n${list}`,
      visualization: {
        kind: "donut",
        title: "Department Spend Split",
        segments: departmentRows.map(([label, value]) => ({ label, value })),
      },
    };
  }

  if (q.includes("trend") || q.includes("month") || q.includes("forecast")) {
    if (!monthRows.length) {
      return {
        answer: "I could not build a monthly trend because transaction dates are missing or invalid in the current uploads.",
      };
    }

    return {
      answer: "Here is the month-by-month spend trend from your statements. I can also compare any two months if you specify them.",
      visualization: {
        kind: "line",
        title: "Monthly Spend Trend",
        points: monthRows,
      },
    };
  }

  if (q.includes("risk") || q.includes("anomal") || q.includes("duplicate") || q.includes("gst")) {
    const duplicates = new Map<string, number>();
    for (const item of transactions) {
      const key = `${item.merchant.toLowerCase()}|${item.amount.toFixed(2)}|${item.date}`;
      duplicates.set(key, (duplicates.get(key) ?? 0) + 1);
    }
    const duplicateCount = [...duplicates.values()].filter((count) => count > 1).length;

    const highValueCount = transactions.filter((item) => item.amount >= 20000).length;
    const unknownCategoryCount = transactions.filter((item) => item.category.toLowerCase() === "general").length;

    return {
      answer:
        `Risk scan summary from uploaded statements:\n` +
        `1. Potential duplicate signatures: ${duplicateCount}\n` +
        `2. High-value transactions (>= ${money(20000)}): ${highValueCount}\n` +
        `3. Weakly classified entries: ${unknownCategoryCount}\n` +
        `Ask "show top risky merchants" for a deeper view by merchant.`,
      visualization: {
        kind: "stacked",
        title: "Risk Pattern Summary",
        bars: [
          { label: "Duplicate", segments: [{ label: "Matches", value: duplicateCount }] },
          { label: "High Value", segments: [{ label: "Transactions", value: highValueCount }] },
          { label: "Unclassified", segments: [{ label: "General", value: unknownCategoryCount }] },
        ],
      },
    };
  }

  const largest = topItems(transactions, 3, (item) => item.amount).map(
    (item, index) => `${index + 1}. ${item.merchant} on ${item.date} - ${money(item.amount)}`
  );

  return {
    answer:
      `I analyzed ${transactions.length} transactions from your statements.\n` +
      `Total spend: ${money(totalSpend)}\n` +
      `Average transaction: ${money(averageSpend)}\n` +
      `Largest transactions:\n${largest.join("\n")}\n\n` +
      `You can ask me things like:\n` +
      `1. Top merchants by spend\n` +
      `2. Category breakdown\n` +
      `3. Department split\n` +
      `4. Monthly trend\n` +
      `5. Risk scan`,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const prompt = body.prompt?.trim();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const store = await readStore();
    const transactions = store.activeStatementId
      ? store.transactions.filter((transaction) => transaction.statementId === store.activeStatementId).slice(0, 1000)
      : store.transactions.slice(0, 1000);

    if (transactions.length === 0) {
      return NextResponse.json(answerForPrompt(prompt));
    }

    const fallbackResponse = answerFromTransactions(prompt, transactions);
    const summary = buildTransactionSummary(transactions);
    const transcript = body.messages?.slice(-8).map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n") ?? "";

    const aiAnswer = await generateOpenAIText({
      system:
        "You are Complyra's finance and compliance assistant. Answer using only the uploaded statement data and keep the response concise and practical.",
      user:
        `User question: ${prompt}\n\n` +
        `Conversation context:\n${transcript || "None"}\n\n` +
        `Statement summary:\n` +
        `- Transaction count: ${transactions.length}\n` +
        `- Total spend: ${money(summary.totalSpend)}\n` +
        `- Average transaction: ${money(summary.averageSpend)}\n` +
        `- Top merchants: ${summary.merchantSummary || "None"}\n` +
        `- Top categories: ${summary.categorySummary || "None"}\n` +
        `- Department split: ${summary.departmentSummary || "None"}\n\n` +
        `Answer the user directly. If the user asks for a breakdown, reference the available categories or merchants and avoid mentioning unsupported data.`,
      fallback: fallbackResponse.answer,
      temperature: 0.2,
      maxTokens: 500,
    });

    return NextResponse.json({
      ...fallbackResponse,
      answer: aiAnswer,
    });
  } catch {
    return NextResponse.json({ error: "Unable to process chat request right now." }, { status: 500 });
  }
}
