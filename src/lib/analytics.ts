import { copilotData, integrationsData, investigationData, overviewData, policyData } from "@/lib/mock-data";
import { processDueDeliveryJobs } from "@/lib/integration-delivery";
import { getDeadLetters, getIntegrationAlerts, getIntegrationJobs, getIntegrationReceipts, readStore } from "@/lib/storage";
import type { CurrencyType } from "@/lib/currency-context";
import type {
  CopilotPayload,
  DonutChartData,
  IntegrationsPayload,
  InvestigationPayload,
  LineChartData,
  OverviewPayload,
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

export async function getOverviewPayload(): Promise<OverviewPayload> {
  const store = await readStore();
  const transactions = store.transactions;

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
    copilotRecommendations: [
      {
        id: "dynamic-1",
        insight: "Top discretionary vendors account for disproportionate growth in uploaded data.",
        recommendation: "Apply budget caps to meals + mobility categories for high-frequency claimants.",
        action: "Publish Smart Cap policy and push alerts to channel owners.",
        savingsImpact: formatMoney(Math.round(total * 0.18)),
        confidence: 86,
      },
      {
        id: "dynamic-2",
        insight: `There are ${highSeverity + mediumSeverity} transactions likely needing policy review.`,
        recommendation: "Auto-route medium/high risk claims to manager queue with explainability summary.",
        action: "Enable risk-based routing in no-code policy builder.",
        savingsImpact: formatMoney(Math.round(total * 0.08)),
        confidence: 82,
      },
    ],
  };
}

export async function getPolicyPayload(): Promise<PolicyPayload> {
  const store = await readStore();
  const transactions = store.transactions;

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
  };
}

export async function getCopilotPayload(): Promise<CopilotPayload> {
  const overview = await getOverviewPayload();
  return {
    headline: "AI-powered finance investigator + compliance copilot",
    recommendations: overview.copilotRecommendations.length
      ? overview.copilotRecommendations
      : copilotData.recommendations,
  };
}

export async function getInvestigationPayload(): Promise<InvestigationPayload> {
  const store = await readStore();
  const transactions = store.transactions;

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
  };
}

export async function getIntegrationsPayload(): Promise<IntegrationsPayload> {
  await processDueDeliveryJobs();

  const alerts = await getIntegrationAlerts();
  const jobs = await getIntegrationJobs();
  const receipts = await getIntegrationReceipts();
  const deadLetters = await getDeadLetters();

  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const whatsappPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const whatsappTo = process.env.WHATSAPP_TO_NUMBER;

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
    alerts: alerts.length ? alerts : integrationsData.alerts,
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
