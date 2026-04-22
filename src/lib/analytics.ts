import { copilotData, integrationsData, investigationData, overviewData, policyData } from "@/lib/mock-data";
import { processDueDeliveryJobs } from "@/lib/integration-delivery";
import { getDeadLetters, getIntegrationAlerts, getIntegrationJobs, getIntegrationReceipts, readStore } from "@/lib/storage";
import { generateOpenAIJSON } from "@/lib/openai";
import type { CurrencyType } from "@/lib/currency-context";
import type { StoredTransaction } from "@/lib/storage";
import type {
  AutoInvestigationCase,
  ComplianceCheckPayload,
  CopilotPayload,
  DonutChartData,
  IntegrationsPayload,
  InvestigationPayload,
  ForecastSnapshot,
  LineChartData,
  OverviewPayload,
  PolicyTemplate,
  PolicyPayload,
  StackedBarData,
} from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toMonthLabel(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.valueOf())) return "Unknown";
  return MONTHS[date.getMonth()] ?? "Unknown";
}

function formatMoney(amount: number, currency: CurrencyType = "USD", exchangeRate: number = 83) {
  let convertedAmount = amount;
  let symbol = "$";
  let localeCode = "en-US";

  if (currency === "INR") {
    convertedAmount = amount * exchangeRate;
    symbol = "₹";
    localeCode = "en-IN";
  }

  const sign = convertedAmount < 0 ? "-" : "";
  const formatted = Math.abs(convertedAmount).toLocaleString(localeCode, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return `${sign}${symbol}${formatted}`;
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stddev(values: number[]) {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance = mean(values.map((value) => (value - m) ** 2));
  return Math.sqrt(variance);
}

function topEntries(map: Map<string, number>, take = 5) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, take);
}

function getActiveTransactions(store: { transactions: StoredTransaction[]; activeStatementId?: string | null }) {
  if (!store.activeStatementId) {
    return store.transactions;
  }

  const active = store.transactions.filter((transaction) => transaction.statementId === store.activeStatementId);
  return active.length ? active : store.transactions;
}

function summarizeTransactions(transactions: StoredTransaction[]) {
  const totalSpend = transactions.reduce((sum, item) => sum + item.amount, 0);
  const averageSpend = totalSpend / Math.max(transactions.length, 1);
  const highSeverity = transactions.filter((item) => item.amount >= 2500).length;
  const mediumSeverity = transactions.filter((item) => item.amount >= 1000 && item.amount < 2500).length;

  const merchants = new Map<string, number>();
  const categories = new Map<string, number>();
  const departments = new Map<string, number>();

  for (const item of transactions) {
    merchants.set(item.merchant, (merchants.get(item.merchant) ?? 0) + item.amount);
    categories.set(item.category, (categories.get(item.category) ?? 0) + item.amount);
    departments.set(item.department, (departments.get(item.department) ?? 0) + item.amount);
  }

  const merchantSummary = topEntries(merchants, 5)
    .map(([label, value]) => `${label}: ${formatMoney(value)}`)
    .join("; ");
  const categorySummary = topEntries(categories, 5)
    .map(([label, value]) => `${label}: ${formatMoney(value)}`)
    .join("; ");
  const departmentSummary = topEntries(departments, 4)
    .map(([label, value]) => `${label}: ${formatMoney(value)}`)
    .join("; ");

  return {
    totalSpend,
    averageSpend,
    highSeverity,
    mediumSeverity,
    merchantSummary,
    categorySummary,
    departmentSummary,
  };
}

function normalizeCopilotRecommendations(recommendations: CopilotPayload["recommendations"]) {
  return recommendations.map((recommendation, index) => ({
    ...recommendation,
    id: `ai-rec-${index + 1}`,
    savingsImpact: Number.isFinite(recommendation.savingsImpact) ? Math.max(0, Math.round(recommendation.savingsImpact)) : 0,
    confidence: Number.isFinite(recommendation.confidence) ? Math.min(100, Math.max(0, Math.round(recommendation.confidence))) : 80,
  }));
}

function clampCopilotRecommendations(
  recommendations: CopilotPayload["recommendations"],
  summary: ReturnType<typeof summarizeTransactions>
) {
  const maxSavings = Math.max(1, Math.round(summary.totalSpend * 0.25));

  return normalizeCopilotRecommendations(recommendations).map((recommendation, index) => ({
    ...recommendation,
    savingsImpact: Math.min(
      maxSavings,
      Math.max(1, Math.round(summary.totalSpend * (index === 0 ? 0.18 : 0.08)))
    ),
    confidence: Math.min(97, Math.max(75, recommendation.confidence)),
  }));
}

function buildStatementFallbackCopilot(transactions: StoredTransaction[]): CopilotPayload {
  const summary = summarizeTransactions(transactions);
  const highRiskCount = summary.highSeverity + summary.mediumSeverity;
  const categoryHeadline = summary.categorySummary.split("; ")[0]?.trim() || "Uploaded statement";

  return {
    headline: "Statement-driven finance copilot",
    recommendations: clampCopilotRecommendations([
      {
        id: "fallback-1",
        insight: `${categoryHeadline} is the dominant spend driver in this upload.`,
        recommendation: "Set tighter category caps and review the largest merchants for policy fit.",
        action: "Create a statement-specific budget rule for the highest-spend category.",
        savingsImpact: Math.round(summary.totalSpend * 0.18),
        confidence: 84,
      },
      {
        id: "fallback-2",
        insight: `${highRiskCount} transactions are in the medium or high review band.`,
        recommendation: "Route these claims to reviewer approval with explainability notes.",
        action: "Enable risk-based routing for the current statement cycle.",
        savingsImpact: Math.round(summary.totalSpend * 0.08),
        confidence: 81,
      },
    ], summary),
  };
}

async function buildCopilotPayload(transactions: StoredTransaction[]): Promise<CopilotPayload> {
  if (!transactions.length) {
    return copilotData;
  }

  const summary = summarizeTransactions(transactions);
  const fallback = buildStatementFallbackCopilot(transactions);

  const aiPayload = await generateOpenAIJSON<CopilotPayload>({
    system:
      "You are Complyra's compliance copilot. Return only valid JSON with a headline and 2-3 practical recommendations grounded in the provided statement summary.",
    user:
      `Statement summary:\n` +
      `- Transactions: ${transactions.length}\n` +
      `- Total spend: ${formatMoney(summary.totalSpend)}\n` +
      `- Average spend: ${formatMoney(summary.averageSpend)}\n` +
      `- High severity transactions: ${summary.highSeverity}\n` +
      `- Medium severity transactions: ${summary.mediumSeverity}\n` +
      `- Top merchants: ${summary.merchantSummary || "None"}\n` +
      `- Top categories: ${summary.categorySummary || "None"}\n` +
      `- Department split: ${summary.departmentSummary || "None"}\n\n` +
      `Return JSON with this exact shape: {"headline": string, "recommendations": [{"id": string, "insight": string, "recommendation": string, "action": string, "savingsImpact": number, "confidence": number, "explainability": {"why": string, "evidence": string, "baseline": string}}]}. ` +
      `Use the same recommendation order every time: highest priority first. Focus on measurable compliance fixes, budget controls, and audit readiness.`,
    fallback,
    temperature: 0,
    maxTokens: 900,
  });

  return {
    headline: aiPayload.headline?.trim() || fallback.headline,
    recommendations: clampCopilotRecommendations(
      aiPayload.recommendations?.length ? aiPayload.recommendations : fallback.recommendations,
      summary
    ),
  };
}

function lineFromTransactions(transactions: Array<{ date: string; amount: number }>): LineChartData {
  const monthTotals = new Map<string, number>();

  for (const transaction of transactions) {
    const month = toMonthLabel(transaction.date);
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + transaction.amount);
  }

  const ordered = MONTHS.filter((m) => monthTotals.has(m)).slice(-6);
  const points = ordered.map((month) => ({
    label: month,
    value: monthTotals.get(month) ?? 0,
  }));

  return {
    kind: "line",
    title: "Spend Trend",
    points,
  };
}

function donutFromTransactions(
  transactions: Array<{ department: string; amount: number }>,
  fallback: DonutChartData
): DonutChartData {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    const key = transaction.department || "Unassigned";
    totals.set(key, (totals.get(key) ?? 0) + transaction.amount);
  }

  const segments = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  if (!segments.length) return fallback;

  return {
    kind: "donut",
    title: "Department Split",
    segments,
  };
}

function stackedFromTransactions(
  transactions: Array<{ department: string; category: string; amount: number }>,
  fallback: StackedBarData
): StackedBarData {
  const grouped = new Map<string, Map<string, number>>();

  for (const transaction of transactions) {
    const dept = transaction.department || "Unassigned";
    const category = transaction.category || "General";

    if (!grouped.has(dept)) {
      grouped.set(dept, new Map<string, number>());
    }

    const categoryMap = grouped.get(dept);
    if (!categoryMap) continue;
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + transaction.amount);
  }

  const bars = [...grouped.entries()]
    .slice(0, 4)
    .map(([label, categoryMap]) => ({
      label,
      segments: [...categoryMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([segmentLabel, value]) => ({ label: segmentLabel, value })),
    }))
    .filter((entry) => entry.segments.length > 0);

  if (!bars.length) return fallback;

  return {
    kind: "stacked",
    title: "Department Category Mix",
    bars,
  };
}

function forecastFromTransactions(transactions: Array<{ date: string; amount: number; category?: string }>): ForecastSnapshot {
  if (!transactions.length) {
    return {
      nextMonthSpend: 103500,
      changePct: 12,
      confidence: 84,
      scenario: "Most likely scenario based on current run-rate and repeated vendor spikes.",
      drivers: [
        {
          label: "Travel",
          impactPct: 5,
          evidence: "Bookings are trending above the seasonal baseline.",
        },
        {
          label: "Software renewals",
          impactPct: 4,
          evidence: "Renewals cluster inside a narrow billing window.",
        },
        {
          label: "Contractors",
          impactPct: 3,
          evidence: "Repeated invoice patterns indicate scope creep.",
        },
      ],
    };
  }

  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const average = total / Math.max(transactions.length, 1);
  const highFrequencyCategories = new Map<string, number>();

  for (const transaction of transactions) {
    const category = transaction.category || "General";
    highFrequencyCategories.set(category, (highFrequencyCategories.get(category) ?? 0) + transaction.amount);
  }

  const drivers = [...highFrequencyCategories.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label, value], index) => ({
      label,
      impactPct: Math.max(1, Math.round((value / Math.max(total, 1)) * 100)),
      evidence: index === 0 ? "This category is leading the run-rate change." : "This category is contributing to forecast pressure.",
    }));

  return {
    nextMonthSpend: Math.round(average * 1.12 * Math.min(1.45, 1 + drivers.reduce((sum, driver) => sum + driver.impactPct, 0) / 1000)),
    changePct: Math.max(3, Math.round((average / Math.max(total / 8, 1) - 1) * 100)) || 9,
    confidence: Math.min(95, 72 + Math.min(18, transactions.length)),
    scenario: "Run-rate forecast using trailing averages and category concentration.",
    drivers: drivers.length
      ? drivers
      : [
          {
            label: "Mixed spend",
            impactPct: 4,
            evidence: "No dominant category emerged, so the model used the aggregate run-rate.",
          },
        ],
  };
}

function policyTemplates(): PolicyTemplate[] {
  return policyData.templates;
}

export async function getOverviewPayload(): Promise<OverviewPayload> {
  const store = await readStore();
  const transactions = getActiveTransactions(store);

  if (!transactions.length) {
    return {
      ...overviewData,
      charts: {
        line: {
          kind: "line",
          title: "Spend Trend",
          points: overviewData.trend.map((point) => ({ label: point.month, value: point.value * 1200 })),
        },
        donut: {
          kind: "donut",
          title: "Department Split",
          segments: [
            { label: "Marketing", value: 35 },
            { label: "Operations", value: 28 },
            { label: "Product", value: 22 },
            { label: "Finance", value: 15 },
          ],
        },
        stacked: {
          kind: "stacked",
          title: "Department Category Mix",
          bars: [
            {
              label: "Marketing",
              segments: [
                { label: "Ads", value: 48 },
                { label: "Tools", value: 27 },
                { label: "Services", value: 25 },
              ],
            },
            {
              label: "Operations",
              segments: [
                { label: "Travel", value: 41 },
                { label: "Vendors", value: 36 },
                { label: "Admin", value: 23 },
              ],
            },
            {
              label: "Product",
              segments: [
                { label: "Infra", value: 56 },
                { label: "SaaS", value: 29 },
                { label: "Research", value: 15 },
              ],
            },
          ],
        },
      },
      uploadSummary: {
        rowCount: 0,
        source: "Seeded mock data",
      },
      copilotRecommendations: overviewData.copilotRecommendations,
      forecast: forecastFromTransactions(transactions),
    };
  }

  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const highSeverity = transactions.filter((transaction) => transaction.amount >= 2500).length;
  const mediumSeverity = transactions.filter(
    (transaction) => transaction.amount >= 1000 && transaction.amount < 2500
  ).length;

  const line = lineFromTransactions(transactions);
  const donut = donutFromTransactions(transactions, {
    kind: "donut",
    title: "Department Split",
    segments: [{ label: "Unassigned", value: 100 }],
  });
  const stacked = stackedFromTransactions(transactions, {
    kind: "stacked",
    title: "Department Category Mix",
    bars: [
      {
        label: "Unassigned",
        segments: [{ label: "General", value: 100 }],
      },
    ],
  });

  const copilotRecommendations = await buildCopilotPayload(transactions);

  return {
    kpis: [
      { label: "Policy Confidence", value: `${Math.max(60, 97 - highSeverity)}%`, hint: "Calculated from uploaded transaction risk score" },
      { label: "Pending Approvals", value: `${highSeverity + mediumSeverity}`, hint: "Based on uploaded data thresholds" },
      { label: "Forecast Gap", value: formatMoney((total / Math.max(transactions.length, 1)) * 8 - total), hint: "Estimated variance using run-rate" },
    ],
    trend: line.points.map((point) => ({ month: point.label, value: Math.max(8, Math.min(90, Math.round(point.value / 400))) })),
    timeline: ["Upload parsed", "Data persisted", "Policy checks run", "Charts generated"],
    recentFlags: transactions
      .slice(0, 5)
      .map((transaction, index) => ({
        id: `uf-${index + 1}`,
        merchant: transaction.merchant,
        reason: transaction.amount >= 2500 ? "Amount exceeds high-risk threshold" : "Review for category and policy fit",
        amount: transaction.amount,
        severity: transaction.amount >= 2500 ? "high" : "medium" as const,
      })),
    charts: { line, donut, stacked },
    uploadSummary: {
      rowCount: transactions.length,
      source: "Uploaded CSV/XLSX",
    },
    copilotRecommendations: copilotRecommendations.recommendations,
    forecast: forecastFromTransactions(transactions),
  };
}

export async function getPolicyPayload(): Promise<PolicyPayload> {
  const store = await readStore();
  const transactions = getActiveTransactions(store);

  if (!transactions.length) {
    return policyData;
  }

  const findings = transactions.slice(0, 12).map((transaction, index) => {
    const high = transaction.amount >= 2500;
    const severity: "high" | "medium" = high ? "high" : "medium";
    return {
      id: `up-${index + 1}`,
      severity,
      issue: high ? "Amount above approval limit" : "Category requires reviewer note",
      merchant: transaction.merchant,
      date: transaction.date,
      amount: transaction.amount,
      explainability: {
        whyFlagged: high
          ? "Amount crosses high-risk policy threshold."
          : "Transaction requires context per selected category rule.",
        evidence: `${transaction.merchant} on ${transaction.date} for ${formatMoney(transaction.amount)} by ${transaction.department}.`,
        ruleTriggered: high ? "RULE_HIGH_VALUE_APPROVAL" : "RULE_CONTEXT_REQUIRED_MEDIUM_RISK",
        impact: high ? "Hold payment until approval." : "Request additional justification.",
      },
    };
  });

  const highSeverity = findings.filter((finding) => finding.severity === "high").length;
  const mediumSeverity = findings.filter((finding) => finding.severity === "medium").length;

  return {
    summary: {
      totalFindings: findings.length,
      highSeverity,
      mediumSeverity,
      exposure: findings.reduce((sum, finding) => sum + finding.amount, 0),
    },
    findings,
    templates: policyTemplates(),
  };
}

export async function getCopilotPayload(): Promise<CopilotPayload> {
  const store = await readStore();
  return buildCopilotPayload(getActiveTransactions(store));
}

export async function getInvestigationPayload(): Promise<InvestigationPayload> {
  const store = await readStore();
  const transactions = getActiveTransactions(store);

  if (!transactions.length) {
    return investigationData;
  }

  const pairToMonth = new Map<string, Map<string, number>>();
  for (const transaction of transactions) {
    const employee = transaction.employee || transaction.department || "Unassigned Team";
    const merchant = transaction.merchant || "Unknown Merchant";
    const pairKey = `${employee}|||${merchant}`;
    const month = toMonthLabel(transaction.date);

    if (!pairToMonth.has(pairKey)) pairToMonth.set(pairKey, new Map());
    const monthMap = pairToMonth.get(pairKey);
    if (!monthMap) continue;
    monthMap.set(month, (monthMap.get(month) ?? 0) + transaction.amount);
  }

  const anomalies = [...pairToMonth.entries()]
    .map(([pairKey, monthMap], index) => {
      const [employee, merchant] = pairKey.split("|||");

      const orderedMonths = MONTHS.filter((month) => monthMap.has(month));
      if (!orderedMonths.length) return null;

      const currentMonth = orderedMonths[orderedMonths.length - 1];
      const currentMonthlySpend = monthMap.get(currentMonth) ?? 0;
      const baselineValues = orderedMonths
        .slice(0, -1)
        .map((month) => monthMap.get(month) ?? 0)
        .filter((value) => value > 0);

      const baselineMonthlySpend = baselineValues.length
        ? mean(baselineValues)
        : Math.max(currentMonthlySpend * 0.75, 1);
      const sigma = stddev(baselineValues);
      const zScore = (currentMonthlySpend - baselineMonthlySpend) / (sigma || Math.max(baselineMonthlySpend * 0.25, 1));
      const trendDeltaPct = ((currentMonthlySpend - baselineMonthlySpend) / Math.max(baselineMonthlySpend, 1)) * 100;
      const anomalyScore = Math.max(
        0,
        Math.min(100, Math.round(zScore * 18 + trendDeltaPct * 0.35 + Math.log10(currentMonthlySpend + 1) * 8 + 25))
      );

      return {
        id: `pair-${index + 1}`,
        employee,
        merchant,
        baselineMonthlySpend: Math.round(baselineMonthlySpend),
        currentMonthlySpend: Math.round(currentMonthlySpend),
        trendDeltaPct: Math.round(trendDeltaPct),
        zScore: Number(zScore.toFixed(2)),
        anomalyScore,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
    .slice(0, 10);

  const employeeToMerchant = new Map<string, Map<string, number>>();
  const merchantToCategory = new Map<string, Map<string, number>>();

  for (const transaction of transactions.slice(0, 120)) {
    const employee = transaction.employee || transaction.department || "Unassigned Team";
    const merchant = transaction.merchant;
    const category = transaction.category || "General";

    if (!employeeToMerchant.has(employee)) employeeToMerchant.set(employee, new Map());
    if (!merchantToCategory.has(merchant)) merchantToCategory.set(merchant, new Map());

    const eMap = employeeToMerchant.get(employee);
    const mMap = merchantToCategory.get(merchant);
    if (!eMap || !mMap) continue;

    eMap.set(merchant, (eMap.get(merchant) ?? 0) + transaction.amount);
    mMap.set(category, (mMap.get(category) ?? 0) + transaction.amount);
  }

  const clusters = [...employeeToMerchant.entries()]
    .map(([employee, merchants], index) => {
      const entries = [...merchants.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
      const totalAmount = entries.reduce((sum, entry) => sum + entry[1], 0);
      const maxPairScore = anomalies
        .filter((entry) => entry.employee === employee)
        .reduce((max, entry) => Math.max(max, entry.anomalyScore), 0);

      return {
        id: `cluster-${index + 1}`,
        title: `${employee} concentration pattern`,
        riskScore: Math.min(98, Math.max(40, Math.round(0.55 * Math.min(95, 55 + Math.round(totalAmount / 900)) + 0.45 * maxPairScore))),
        employees: [employee],
        merchants: entries.map((entry) => entry[0]),
        pattern: "Repeated high-frequency transactions concentrated in a small vendor set.",
        totalAmount,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 4);

  const cases: AutoInvestigationCase[] = [...anomalies]
    .filter((item) => item.anomalyScore >= 80)
    .slice(0, 5)
    .map((item, index) => ({
      id: `auto-case-${index + 1}`,
      title: `Auto-created case: ${item.employee} / ${item.merchant}`,
      source: item.anomalyScore >= 90 ? "Risk model" : "Anomaly detector",
      reason: `Spend moved ${item.trendDeltaPct}% above baseline with z-score ${item.zScore}.`,
      riskScore: item.anomalyScore,
      status: item.anomalyScore >= 90 ? "open" : "triaged",
      owner: item.employee,
      createdAt: new Date().toISOString(),
    }));

  const nodes: InvestigationPayload["graph"]["nodes"] = [];
  const edges: InvestigationPayload["graph"]["edges"] = [];

  for (const [employee, merchants] of [...employeeToMerchant.entries()].slice(0, 4)) {
    const employeeId = `emp-${employee}`;
    nodes.push({ id: employeeId, label: employee, type: "employee" });

    for (const [merchant, value] of [...merchants.entries()].slice(0, 3)) {
      const merchantId = `mer-${merchant}`;
      if (!nodes.find((node) => node.id === merchantId)) {
        nodes.push({ id: merchantId, label: merchant, type: "merchant" });
      }
      edges.push({ from: employeeId, to: merchantId, weight: value });

      const categories = merchantToCategory.get(merchant);
      if (!categories) continue;
      for (const [category, cValue] of [...categories.entries()].slice(0, 2)) {
        const categoryId = `cat-${category}`;
        if (!nodes.find((node) => node.id === categoryId)) {
          nodes.push({ id: categoryId, label: category, type: "category" });
        }
        edges.push({ from: merchantId, to: categoryId, weight: cValue });
      }
    }
  }

  return {
    clusters: clusters.length ? clusters : investigationData.clusters,
    graph: {
      nodes: nodes.length ? nodes : investigationData.graph.nodes,
      edges: edges.length ? edges : investigationData.graph.edges,
    },
    anomalies: anomalies.length ? anomalies : investigationData.anomalies,
    cases: cases.length ? cases : investigationData.cases,
  };
}

export async function getIntegrationsPayload(): Promise<IntegrationsPayload> {
  await processDueDeliveryJobs();

  const store = await readStore();
  const alerts = await getIntegrationAlerts();
  const jobs = await getIntegrationJobs();
  const receipts = await getIntegrationReceipts();
  const deadLetters = await getDeadLetters();

  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const whatsappTo = process.env.WHATSAPP_TO_NUMBER;

  const deadlineAlerts = store.deadlines
    .filter((deadline) => deadline.status === "overdue")
    .map((deadline, index) => ({
      id: `deadline-alert-${index + 1}`,
      channel: "slack" as const,
      title: `${deadline.kind} filing overdue`,
      message: `${deadline.kind} filing deadline missed (${deadline.dueDate}).`,
      timestamp: new Date().toISOString(),
    }));

  const policyAlerts = store.transactions.slice(0, 2).map((item, index) => ({
    id: `policy-alert-${index + 1}`,
    channel: "whatsapp" as const,
    title: "Expense policy breach",
    message: `${item.merchant} (${formatMoney(item.amount)}) may violate configured policy thresholds.`,
    timestamp: new Date().toISOString(),
  }));

  return {
    channels: [
      {
        kind: "slack",
        configured: Boolean(slackWebhook),
        target: slackWebhook ? "Incoming Webhook" : integrationsData.channels.find((c) => c.kind === "slack")?.target ?? "#finance-alerts",
      },
      {
        kind: "whatsapp",
        configured: Boolean(whatsappToken && whatsappPhoneId && whatsappTo),
        target: whatsappTo ?? integrationsData.channels.find((c) => c.kind === "whatsapp")?.target ?? "+91-00000-00000",
      },
    ],
    alerts: [...deadlineAlerts, ...policyAlerts, ...(alerts.length ? alerts : integrationsData.alerts)].slice(0, 20),
    queue: {
      queued: jobs.filter((job) => job.status === "queued").length,
      retrying: jobs.filter((job) => job.status === "retrying").length,
      sent: jobs.filter((job) => job.status === "sent").length,
      deadLetter: jobs.filter((job) => job.status === "dead-letter").length,
    },
    recentJobs: jobs.slice(0, 10),
    recentReceipts: receipts.slice(0, 12),
    deadLetters: deadLetters.slice(0, 12),
  };
}

export async function getComplianceCheckPayload(): Promise<ComplianceCheckPayload> {
  const store = await readStore();
  const transactions = getActiveTransactions(store).slice(0, 400);

  if (!transactions.length) {
    return {
      summary: {
        totalChecked: 0,
        riskyCount: 0,
        missingInvoices: 0,
        gstMismatches: 0,
        suspiciousEntries: 0,
      },
      topRisks: [],
    };
  }

  const duplicateMap = new Map<string, number>();
  for (const item of transactions) {
    const key = `${item.merchant.toLowerCase()}|${item.amount.toFixed(0)}|${item.date}`;
    duplicateMap.set(key, (duplicateMap.get(key) ?? 0) + 1);
  }

  const gstReasons = [
    "GST-sensitive transaction appears to have mismatch risk.",
    "Travel/fuel spend appears taxable but invoice metadata is incomplete.",
    "Potential GST credit leakage due to weak tax evidence trail.",
  ];
  const duplicateReasons = [
    "Duplicate expense pattern detected in upload.",
    "Repeated merchant + amount signature suggests potential duplicate reimbursement.",
    "Multiple entries with near-identical claim fingerprint were detected.",
  ];
  const suspiciousReasons = [
    "Vendor label pattern is commonly associated with weak invoice trails.",
    "Merchant naming appears non-specific and requires additional verification.",
    "Counterparty profile looks atypical for the selected expense category.",
  ];
  const missingReasons = [
    "Potential missing invoice or weak classification.",
    "Receipt/invoice evidence likely incomplete for this transaction.",
    "Category and merchant metadata are insufficient for clean audit closure.",
  ];

  const findings = transactions.map((item, index) => {
    const duplicateKey = `${item.merchant.toLowerCase()}|${item.amount.toFixed(0)}|${item.date}`;
    const duplicateCount = duplicateMap.get(duplicateKey) ?? 0;
    const categoryLower = item.category.toLowerCase();
    const merchantLower = item.merchant.toLowerCase();
    const genericMerchant = /^(upi|others|misc|unknown|cash|temp|transfer)$/i.test(item.merchant.trim());
    const missingInvoice = genericMerchant || categoryLower === "general" || item.employee.toLowerCase().includes("unknown");
    const gstMismatch = item.amount >= 5000 && /(travel|fuel|transport|logistics)/i.test(categoryLower);
    const suspiciousVendor = /(cash|misc|temp|unknown|others)/i.test(merchantLower) || item.amount >= 25000;

    const merchantDisplay = genericMerchant
      ? `${item.merchant.toUpperCase()} • ${item.category || "General"}`
      : item.merchant;

    const signalScores: Array<{
      kind: ComplianceCheckPayload["topRisks"][number]["kind"];
      score: number;
      reason: string;
      evidence: string;
    }> = [];

    if (duplicateCount > 1) {
      signalScores.push({
        kind: "duplicate-expense",
        score: Math.min(99, 66 + duplicateCount * 8 + (item.amount >= 10000 ? 6 : 0)),
        reason: duplicateReasons[index % duplicateReasons.length],
        evidence: `${duplicateCount} entries share merchant, amount, and date signature for ${merchantDisplay}.`,
      });
    }

    if (gstMismatch) {
      signalScores.push({
        kind: "gst-mismatch",
        score: Math.min(97, 74 + Math.round(item.amount / 4000)),
        reason: gstReasons[index % gstReasons.length],
        evidence: `${merchantDisplay} (${item.category}) at ${formatMoney(item.amount)} should include GST-compatible invoice evidence.`,
      });
    }

    if (suspiciousVendor) {
      signalScores.push({
        kind: "suspicious-vendor",
        score: Math.min(94, 62 + Math.round(item.amount / 6000)),
        reason: suspiciousReasons[index % suspiciousReasons.length],
        evidence: `Counterparty ${merchantDisplay} and claim attributes need enhanced due diligence.`,
      });
    }

    if (missingInvoice) {
      signalScores.push({
        kind: "missing-invoice",
        score: Math.min(90, 60 + Math.round(item.amount / 8000)),
        reason: missingReasons[index % missingReasons.length],
        evidence: `Metadata for ${merchantDisplay} on ${item.date} appears incomplete for CA audit readiness.`,
      });
    }

    if (!signalScores.length) {
      signalScores.push({
        kind: "missing-invoice",
        score: 48,
        reason: "General compliance review recommended.",
        evidence: `${merchantDisplay} on ${item.date} for ${formatMoney(item.amount)}.`,
      });
    }

    const selected = signalScores.sort((a, b) => b.score - a.score)[0];
    const severity: "high" | "medium" | "low" =
      selected.score >= 86 ? "high" : selected.score >= 64 ? "medium" : "low";

    return {
      id: `cc-${index + 1}`,
      kind: selected.kind,
      severity,
      merchant: merchantDisplay,
      amount: item.amount,
      reason: selected.reason,
      evidence: selected.evidence,
      score: selected.score,
    };
  });

  const riskyFindings = findings.filter((item) => item.score >= 60);

  const buckets: Record<ComplianceCheckPayload["topRisks"][number]["kind"], typeof riskyFindings> = {
    "duplicate-expense": riskyFindings.filter((item) => item.kind === "duplicate-expense").sort((a, b) => b.score - a.score),
    "gst-mismatch": riskyFindings.filter((item) => item.kind === "gst-mismatch").sort((a, b) => b.score - a.score),
    "suspicious-vendor": riskyFindings.filter((item) => item.kind === "suspicious-vendor").sort((a, b) => b.score - a.score),
    "missing-invoice": riskyFindings.filter((item) => item.kind === "missing-invoice").sort((a, b) => b.score - a.score),
  };

  const balanced: typeof riskyFindings = [];
  const maxTop = 10;
  const order: Array<ComplianceCheckPayload["topRisks"][number]["kind"]> = [
    "duplicate-expense",
    "gst-mismatch",
    "suspicious-vendor",
    "missing-invoice",
  ];

  while (balanced.length < maxTop) {
    let progressed = false;

    for (const kind of order) {
      if (balanced.length >= maxTop) break;
      const next = buckets[kind].shift();
      if (!next) continue;

      balanced.push(next);
      progressed = true;
    }

    if (!progressed) break;
  }

  const usedIds = new Set(balanced.map((item) => item.id));
  const topRisks = [...balanced, ...riskyFindings.filter((item) => !usedIds.has(item.id)).sort((a, b) => b.score - a.score)]
    .slice(0, maxTop)
    .map(({ score, ...rest }) => {
      void score;
      return rest;
    });

  return {
    summary: {
      totalChecked: transactions.length,
      riskyCount: topRisks.length,
      missingInvoices: topRisks.filter((item) => item.kind === "missing-invoice").length,
      gstMismatches: topRisks.filter((item) => item.kind === "gst-mismatch").length,
      suspiciousEntries: topRisks.filter((item) => item.kind === "duplicate-expense" || item.kind === "suspicious-vendor").length,
    },
    topRisks,
  };
}
