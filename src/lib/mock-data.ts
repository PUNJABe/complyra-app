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
      savingsImpact: 230000,
      confidence: 91,
      explainability: {
        why: "Travel and meals are rising faster than overall spend, which usually indicates policy drift.",
        evidence: "Three departments crossed their 90-day baseline by more than 18%.",
        baseline: "Typical month-over-month variance for these categories is under 6%.",
      },
    },
    {
      id: "r-2",
      insight: "Team Operations has 3x more policy exceptions than average.",
      recommendation: "Move Ops expenses above Rs 12,000 to mandatory manager pre-approval.",
      action: "Turn on pre-approval auto-route in policy builder.",
      savingsImpact: 780000,
      confidence: 87,
      explainability: {
        why: "Operations combines high frequency with repeated exception patterns.",
        evidence: "Ops generated 45% of all medium and high severity findings in the last cycle.",
        baseline: "Other teams average one exception stream; Ops shows three distinct patterns.",
      },
    },
  ],
  forecast: {
    nextMonthSpend: 103500,
    changePct: 12,
    confidence: 84,
    scenario: "Most likely scenario based on current run-rate and repeated vendor spikes.",
    drivers: [
      {
        label: "Travel",
        impactPct: 5,
        evidence: "Airfare and hotel bookings are trending above the seasonal baseline.",
      },
      {
        label: "Software renewals",
        impactPct: 4,
        evidence: "Q2 renewals are clustered in a narrow 10-day window.",
      },
      {
        label: "Contractor invoices",
        impactPct: 3,
        evidence: "Three vendors repeated the same invoice pattern twice.",
      },
    ],
  },
};

export const copilotData: CopilotPayload = {
  headline: "AI-powered finance investigator + compliance copilot",
  recommendations: overviewData.copilotRecommendations,
};

export const policyData: PolicyPayload = {
  summary: {
    totalFindings: 6,
    highSeverity: 2,
    mediumSeverity: 4,
    exposure: 59640,
  },
  findings: [
    {
      id: "p-100",
      severity: "high",
      issue: "Expense above approval limit",
      merchant: "AirNimbus",
      date: "2026-04-10",
      amount: 28400,
      explainability: {
        whyFlagged: "Amount exceeds the default team approval threshold.",
        evidence: "Transaction #AIR-99231 was submitted without approver ID for a high-value travel charge.",
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
      amount: 1260,
      explainability: {
        whyFlagged: "Meal on a weekend requires a business justification note.",
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
      amount: 12600,
      explainability: {
        whyFlagged: "Same amount and vendor appear twice inside a 24-hour window.",
        evidence: "Invoices INV-7731 and INV-7738 were both submitted for the same service window within 11h.",
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
      amount: 3120,
      explainability: {
        whyFlagged: "Category selected as Office Supplies for a transport receipt.",
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
      amount: 9400,
      explainability: {
        whyFlagged: "Add-on purchase made outside the approved vendor plan list.",
        evidence: "SKU TS-ADD-ANALYTICS not in authorized procurement set.",
        ruleTriggered: "RULE_SOFTWARE_SKU_ALLOWLIST",
        impact: "Medium severity. Route to procurement review.",
      },
    },
    {
      id: "p-105",
      severity: "medium",
      issue: "Split taxi rides under threshold",
      merchant: "RideWave",
      date: "2026-04-02",
      amount: 4860,
      explainability: {
        whyFlagged: "Multiple taxi claims were split below the single-claim approval threshold.",
        evidence: "Three receipts were filed on the same evening with matching route metadata.",
        ruleTriggered: "RULE_SPLIT_EXPENSE_THRESHOLD",
        impact: "Medium severity. Review for intentional threshold splitting.",
      },
    },
  ],
  templates: [
    {
      id: "tpl-startup-travel",
      industry: "Startup",
      name: "Startup Lean Spend Guardrail",
      description: "Keep early-stage teams fast while protecting runway and approvals.",
      focus: ["Founder approval limits", "Travel caps", "SaaS renewals"],
      rules: [
        "If spend exceeds Rs 10,000, require founder approval.",
        "If SaaS renewals exceed 12% of monthly budget, route to finance.",
        "If travel is not client-related, cap reimbursement to default policy.",
      ],
    },
    {
      id: "tpl-enterprise-controls",
      industry: "Enterprise",
      name: "Enterprise Control Tower",
      description: "High-coverage policy set for large finance and operations teams.",
      focus: ["Role-based approvals", "Duplicate invoice checks", "Department budgets"],
      rules: [
        "If amount exceeds department threshold, require manager plus finance approval.",
        "If same vendor and amount repeat within 24h, flag as duplicate.",
        "If department budget is above run-rate by 8%, trigger predictive review.",
      ],
    },
    {
      id: "tpl-healthcare-compliance",
      industry: "Healthcare",
      name: "Healthcare Compliance Shield",
      description: "Designed for regulated teams with auditability and patient-facing controls.",
      focus: ["Audit trail", "Vendor validation", "Sensitive spend approvals"],
      rules: [
        "If vendor is not in approved healthcare list, route for compliance review.",
        "If expense relates to patient transport, require documented business purpose.",
        "If spend touches regulated categories, retain explainability and approver chain.",
      ],
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
  cases: [
    {
      id: "case-1",
      title: "Auto-created case: Travel threshold breach",
      source: "Policy engine",
      reason: "High severity travel claim exceeded policy limit and matched duplicate vendor behavior.",
      riskScore: 93,
      status: "open",
      owner: "Finance Ops",
      createdAt: "2026-04-18T09:12:00.000Z",
    },
    {
      id: "case-2",
      title: "Auto-created case: Software renewal spike",
      source: "Risk model",
      reason: "Forecast model detected an 11% uplift tied to renewal clustering.",
      riskScore: 81,
      status: "triaged",
      owner: "Procurement",
      createdAt: "2026-04-17T14:40:00.000Z",
    },
    {
      id: "case-3",
      title: "Auto-created case: Split expense pattern",
      source: "Anomaly detector",
      reason: "Repeated same-day vendor amounts fell just below approval thresholds.",
      riskScore: 88,
      status: "monitoring",
      owner: "Audit Team",
      createdAt: "2026-04-16T11:05:00.000Z",
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

  if (q.includes("gst") && (q.includes("error") || q.includes("mismatch") || q.includes("check"))) {
    return {
      answer:
        "GST scan completed. I found 4 potential mismatches: 2 high-risk travel claims with weak invoice linkage, 1 duplicate tax invoice pattern, and 1 category mismatch that may affect ITC.",
      visualization: {
        kind: "donut",
        title: "GST Error Mix",
        segments: [
          { label: "Mismatch risk", value: 40 },
          { label: "Duplicate invoice", value: 30 },
          { label: "Missing invoice", value: 20 },
          { label: "Category mismatch", value: 10 },
        ],
      },
      reasoning: {
        insight: "Most GST risk comes from high-value travel reimbursements and invoice duplication windows.",
        recommendation: "Prioritize travel invoices above Rs 2,000 and validate invoice IDs before filing.",
        action: "Open auto-investigation cases for high-risk GST entries and attach supporting docs.",
      },
    };
  }

  if (q.includes("audit") && (q.includes("risk") || q.includes("top") || q.includes("pre"))) {
    return {
      answer:
        "Pre-audit assistant identified 10 risky transactions. Top patterns: duplicate expenses, unusual vendor concentration, and approval-threshold splits.",
      visualization: {
        kind: "stacked",
        title: "Top Audit Risk Categories",
        bars: [
          { label: "Duplicates", segments: [{ label: "Exact amount", value: 4 }, { label: "24h window", value: 3 }] },
          { label: "Vendor anomalies", segments: [{ label: "New vendor spikes", value: 2 }, { label: "Round amounts", value: 2 }] },
          { label: "Policy bypass", segments: [{ label: "Threshold split", value: 3 }, { label: "Late approvals", value: 1 }] },
        ],
      },
      reasoning: {
        insight: "Risk concentration is not broad-based; it is clustered around repeated vendor behavior.",
        recommendation: "Run focused document validation on top 3 merchants before audit closure.",
        action: "Export client-ready audit exception list from insights panel.",
      },
    };
  }

  if ((q.includes("save") && q.includes("tax")) || q.includes("deduction") || q.includes("80c")) {
    return {
      answer:
        "You still have 80C headroom. Investing in ELSS can reduce projected tax outflow by about Rs 15,000, depending on your slab and current declarations.",
      reasoning: {
        insight: "Your current profile shows unused tax-saving capacity under common deduction buckets.",
        recommendation: "Allocate a monthly SIP toward ELSS and track it inside your personal mode dashboard.",
        action: "Set a reminder in the filing calendar before quarter close.",
      },
    };
  }

  if (q.includes("overspending") || q.includes("wasting") || q.includes("save more")) {
    return {
      answer:
        "You are currently overspending in subscriptions and transport versus your 90-day baseline. Total excess is about 18% month-to-date.",
      visualization: {
        kind: "line",
        title: "Overspending Trend",
        points: [
          { label: "W1", value: 8200 },
          { label: "W2", value: 9100 },
          { label: "W3", value: 10300 },
          { label: "W4", value: 11200 },
        ],
      },
      reasoning: {
        insight: "Recurring subscriptions are the fastest-growing controllable category.",
        recommendation: "Cancel low-use subscriptions and set a monthly transport cap.",
        action: "Turn on smart alerts for subscription renewal and travel spikes.",
      },
    };
  }

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
