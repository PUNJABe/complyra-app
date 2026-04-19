import type {
  ChatResponse,
  CopilotPayload,
  IntegrationsPayload,
  InvestigationPayload,
  OverviewPayload,
  PolicyPayload,
} from "@/lib/types";

export const overviewData: OverviewPayload = {
  kpis: [
    { label: "Policy Confidence", value: "94%", hint: "Spend aligned with your current rules" },
    { label: "Pending Approvals", value: "14", hint: "4 require immediate review" },
    { label: "Forecast Gap", value: "-$9,840", hint: "Projected month-end variance" },
  ],
  trend: [
    { month: "Jan", value: 43 },
    { month: "Feb", value: 56 },
    { month: "Mar", value: 51 },
    { month: "Apr", value: 63 },
    { month: "May", value: 69 },
    { month: "Jun", value: 58 },
  ],
  timeline: [
    "Import statements",
    "Normalize vendors",
    "Run policy checks",
    "Publish approvals",
  ],
  recentFlags: [
    { id: "f-01", merchant: "CloudPeak", reason: "Duplicate invoice in 48h window", amount: 1260, severity: "high" },
    { id: "f-02", merchant: "AirNimbus", reason: "Travel spend above policy threshold", amount: 2840, severity: "high" },
    { id: "f-03", merchant: "TeamSuite", reason: "Subscription seat jump > 30%", amount: 940, severity: "medium" },
  ],
  charts: {
    line: {
      kind: "line",
      title: "Spend Trend",
      points: [
        { label: "Jan", value: 48200 },
        { label: "Feb", value: 51600 },
        { label: "Mar", value: 50340 },
        { label: "Apr", value: 58800 },
        { label: "May", value: 62220 },
        { label: "Jun", value: 57700 },
      ],
    },
    donut: {
      kind: "donut",
      title: "Department Split",
      segments: [
        { label: "Marketing", value: 34 },
        { label: "Operations", value: 29 },
        { label: "Product", value: 23 },
        { label: "Finance", value: 14 },
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
            { label: "Tools", value: 31 },
            { label: "Services", value: 21 },
          ],
        },
        {
          label: "Operations",
          segments: [
            { label: "Travel", value: 39 },
            { label: "Vendors", value: 33 },
            { label: "Admin", value: 28 },
          ],
        },
        {
          label: "Product",
          segments: [
            { label: "Infra", value: 55 },
            { label: "SaaS", value: 26 },
            { label: "Research", value: 19 },
          ],
        },
      ],
    },
  },
  uploadSummary: {
    rowCount: 0,
    source: "Seeded mock data",
  },
  copilotRecommendations: [
    {
      id: "r-1",
      insight: "Food delivery and ride-share spend is growing 22% month-over-month.",
      recommendation: "Cap non-client meals and pooled ride reimbursement thresholds.",
      action: "Apply Travel & Meals policy template v2 to Sales + Ops this week.",
      savingsImpact: "Saves about Rs 2.3L/month",
      confidence: 91,
    },
    {
      id: "r-2",
      insight: "Team Operations has 3x more policy exceptions than average.",
      recommendation: "Move Ops expenses above Rs 12,000 to mandatory manager pre-approval.",
      action: "Turn on pre-approval auto-route in policy builder.",
      savingsImpact: "Reduces high-risk exposure by Rs 7.8L/quarter",
      confidence: 87,
    },
  ],
};

export const copilotData: CopilotPayload = {
  headline: "AI-powered finance investigator + compliance copilot",
  recommendations: overviewData.copilotRecommendations,
};

export const policyData: PolicyPayload = {
  summary: {
    totalFindings: 27,
    highSeverity: 8,
    mediumSeverity: 19,
    exposure: 32460,
  },
  findings: [
    {
      id: "p-100",
      severity: "high",
      issue: "Expense above approval limit",
      merchant: "AirNimbus",
      date: "2026-04-10",
      amount: 2840,
      explainability: {
        whyFlagged: "Amount exceeds default team threshold of Rs 2,500.",
        evidence: "Transaction #AIR-99231 submitted for Rs 2,840 without approver ID.",
        ruleTriggered: "RULE_TRAVEL_APPROVAL_LIMIT_V2",
        impact: "High severity. Auto-hold reimbursement until manager approval.",
      },
    },
    {
      id: "p-101",
      severity: "medium",
      issue: "Weekend meal without note",
      merchant: "UrbanFork",
      date: "2026-04-08",
      amount: 126,
      explainability: {
        whyFlagged: "Meal on weekend requires business justification note.",
        evidence: "Receipt timestamp Sunday 21:14 with empty notes field.",
        ruleTriggered: "RULE_MEALS_WEEKEND_NOTE_REQUIRED",
        impact: "Medium severity. User must add note before approval.",
      },
    },
    {
      id: "p-102",
      severity: "high",
      issue: "Potential duplicate invoice",
      merchant: "CloudPeak",
      date: "2026-04-07",
      amount: 1260,
      explainability: {
        whyFlagged: "Same amount + same vendor appears twice inside 24h.",
        evidence: "Invoices INV-7731 and INV-7738 both for Rs 1,260 within 11h.",
        ruleTriggered: "RULE_DUPLICATE_VENDOR_AMOUNT_WINDOW",
        impact: "High severity. Potential duplicate payment risk.",
      },
    },
    {
      id: "p-103",
      severity: "medium",
      issue: "Policy category mismatch",
      merchant: "DriveQuick",
      date: "2026-04-06",
      amount: 312,
      explainability: {
        whyFlagged: "Category selected as Office Supplies for transport receipt.",
        evidence: "Merchant taxonomy classified as mobility service.",
        ruleTriggered: "RULE_CATEGORY_MISMATCH_CLASSIFIER",
        impact: "Medium severity. May affect budget accuracy.",
      },
    },
    {
      id: "p-104",
      severity: "medium",
      issue: "Out-of-policy software add-on",
      merchant: "TeamSuite",
      date: "2026-04-03",
      amount: 940,
      explainability: {
        whyFlagged: "Addon purchase made outside approved vendor plan list.",
        evidence: "SKU TS-ADD-ANALYTICS not in authorized procurement set.",
        ruleTriggered: "RULE_SOFTWARE_SKU_ALLOWLIST",
        impact: "Medium severity. Route to procurement review.",
      },
    },
  ],
};

export const investigationData: InvestigationPayload = {
  clusters: [
    {
      id: "c-1",
      title: "Repeated vendor split-expense pattern",
      riskScore: 88,
      employees: ["Anika S", "Rohit P", "Nisha V"],
      merchants: ["Swiggy", "Uber"],
      pattern: "6 transactions split below policy threshold within 72h.",
      totalAmount: 98600,
    },
    {
      id: "c-2",
      title: "Late-night alcohol expense spike",
      riskScore: 79,
      employees: ["Team Operations"],
      merchants: ["CityBrew", "NightBar"],
      pattern: "Policy violations 3x baseline in after-hours windows.",
      totalAmount: 41200,
    },
  ],
  graph: {
    nodes: [
      { id: "e1", label: "Anika S", type: "employee" },
      { id: "e2", label: "Rohit P", type: "employee" },
      { id: "m1", label: "Swiggy", type: "merchant" },
      { id: "m2", label: "Uber", type: "merchant" },
      { id: "c1", label: "Meals", type: "category" },
      { id: "c2", label: "Travel", type: "category" },
    ],
    edges: [
      { from: "e1", to: "m1", weight: 9 },
      { from: "e1", to: "m2", weight: 7 },
      { from: "e2", to: "m1", weight: 6 },
      { from: "m1", to: "c1", weight: 15 },
      { from: "m2", to: "c2", weight: 12 },
    ],
  },
  anomalies: [
    {
      id: "a-ev-1",
      employee: "Anika S",
      merchant: "Swiggy",
      baselineMonthlySpend: 18200,
      currentMonthlySpend: 32400,
      trendDeltaPct: 78,
      zScore: 2.6,
      anomalyScore: 91,
    },
    {
      id: "a-ev-2",
      employee: "Rohit P",
      merchant: "Uber",
      baselineMonthlySpend: 9400,
      currentMonthlySpend: 17800,
      trendDeltaPct: 89,
      zScore: 2.1,
      anomalyScore: 84,
    },
  ],
};

export const integrationsData: IntegrationsPayload = {
  channels: [
    { kind: "slack", configured: false, target: "#finance-alerts" },
    { kind: "whatsapp", configured: false, target: "+91-00000-00000" },
  ],
  alerts: [
    {
      id: "a-1",
      channel: "slack",
      title: "Policy violation",
      message: "Rs 12,000 alcohol expense detected in Team Ops.",
      timestamp: "2026-04-18T09:10:00.000Z",
    },
  ],
  queue: {
    queued: 0,
    retrying: 0,
    sent: 1,
    deadLetter: 0,
  },
  recentJobs: [],
  recentReceipts: [],
  deadLetters: [],
};

export function answerForPrompt(prompt: string): ChatResponse {
  const q = prompt.toLowerCase();

  if (q.includes("why") && q.includes("travel") && q.includes("march")) {
    return {
      answer:
        "Travel spend increased in March due to 3 concentrated trips from Operations and two unplanned vendor meetings. 61% of growth came from airfare variance.",
      visualization: {
        kind: "line",
        title: "Travel Spend Change",
        points: [
          { label: "Jan", value: 12400 },
          { label: "Feb", value: 13200 },
          { label: "Mar", value: 19800 },
          { label: "Apr", value: 17600 },
        ],
      },
      reasoning: {
        insight: "Ops travel concentration and airfare inflation drove the spike.",
        recommendation: "Set per-trip cap and require pre-trip approval above Rs 15,000.",
        action: "Enable Travel Cap policy template and notify Ops manager in Slack.",
      },
    };
  }

  if (q.includes("least compliant") || (q.includes("team") && q.includes("why"))) {
    return {
      answer:
        "Operations is currently the least compliant team with violation rate 3x baseline, mainly from meals and mobility policy exceptions.",
      visualization: {
        kind: "donut",
        title: "Violations by Team",
        segments: [
          { label: "Operations", value: 45 },
          { label: "Sales", value: 28 },
          { label: "Product", value: 17 },
          { label: "Finance", value: 10 },
        ],
      },
      reasoning: {
        insight: "Ops has dense after-hours claims and split transactions under thresholds.",
        recommendation: "Raise review rigor only for high-risk patterns in Ops.",
        action: "Create Ops compliance workflow with duplicate + after-hours checks.",
      },
    };
  }

  if (q.includes("predict") || q.includes("overspend risk")) {
    return {
      answer:
        "Next month overspend risk is elevated at 72%. Highest drivers: software renewals, travel variance, and contractor invoicing spikes.",
      visualization: {
        kind: "stacked",
        title: "Overspend Risk Drivers",
        bars: [
          { label: "Software", segments: [{ label: "Renewals", value: 38 }, { label: "Overage", value: 14 }] },
          { label: "Travel", segments: [{ label: "Airfare", value: 27 }, { label: "Hotels", value: 11 }] },
          { label: "Contractors", segments: [{ label: "Scope Creep", value: 19 }, { label: "Rate Change", value: 8 }] },
        ],
      },
      reasoning: {
        insight: "Three spend drivers jointly account for most forecast variance.",
        recommendation: "Lock renewals, enforce travel pre-approval, and cap contractor change orders.",
        action: "Deploy Q2 overspend guardrail template from policy builder.",
      },
    };
  }

  if (q.includes("department") || q.includes("breakdown")) {
    return {
      answer:
        "Marketing and Operations are driving most growth this month. Marketing rose due to campaign tools and agency retainer expansion.",
      visualization: {
        kind: "donut",
        title: "Department Spend Split",
        segments: [
          { label: "Marketing", value: 18200 },
          { label: "Operations", value: 15940 },
          { label: "Product", value: 12110 },
          { label: "People", value: 7950 },
        ],
      },
      reasoning: {
        insight: "Growth is concentrated in two departments, not broad-based.",
        recommendation: "Cap discretionary ad tooling for 30 days.",
        action: "Launch department budget guardrail in policy builder.",
      },
    };
  }

  if (q.includes("vendor") || q.includes("merchant")) {
    return {
      answer:
        "Top vendor growth came from AirNimbus and CloudPeak. AirNimbus grew on travel concentration while CloudPeak increased due to one duplicate invoice cluster.",
      visualization: {
        kind: "stacked",
        title: "Vendor Delta (MoM)",
        bars: [
          {
            label: "AirNimbus",
            segments: [
              { label: "Travel", value: 22 },
              { label: "Fees", value: 9 },
            ],
          },
          {
            label: "CloudPeak",
            segments: [
              { label: "Core", value: 16 },
              { label: "Overage", value: 10 },
            ],
          },
          {
            label: "TeamSuite",
            segments: [
              { label: "Licenses", value: 11 },
              { label: "Add-ons", value: 3 },
            ],
          },
        ],
      },
      reasoning: {
        insight: "Vendor growth is tied to specific exception patterns.",
        recommendation: "Add duplicate-invoice and travel-threshold auto checks for top vendors.",
        action: "Enable top-vendor anomaly alert to Slack channel.",
      },
    };
  }

  if (q.includes("forecast")) {
    return {
      answer:
        "At current run-rate, month-end spend is projected to close around $96.2K, about $9.8K above plan. Most upside risk is in travel and software renewals.",
      visualization: {
        kind: "line",
        title: "30-Day Forecast Drivers",
        points: [
          { label: "W1", value: 18200 },
          { label: "W2", value: 20100 },
          { label: "W3", value: 21800 },
          { label: "W4", value: 26100 },
        ],
      },
      reasoning: {
        insight: "Forecast pressure comes from two controllable categories.",
        recommendation: "Apply temporary controls to travel and software approvals.",
        action: "Send proactive alert to finance leadership with auto-generated action list.",
      },
    };
  }

  return {
    answer:
      "Complyra found 3 notable anomalies this week: one policy-threshold breach, one duplicate invoice, and one rapid subscription expansion. I can break them down by department, vendor, or severity.",
  };
}
