export type LineChartData = {
  kind: "line";
  title: string;
  points: Array<{ label: string; value: number }>;
};

export type DonutChartData = {
  kind: "donut";
  title: string;
  segments: Array<{ label: string; value: number }>;
};

export type StackedBarData = {
  kind: "stacked";
  title: string;
  bars: Array<{
    label: string;
    segments: Array<{ label: string; value: number }>;
  }>;
};

export type CopilotRecommendation = {
  id: string;
  insight: string;
  recommendation: string;
  action: string;
  savingsImpact: string;
  confidence: number;
};

export type Explainability = {
  whyFlagged: string;
  evidence: string;
  ruleTriggered: string;
  impact: string;
};

export type FraudCluster = {
  id: string;
  title: string;
  riskScore: number;
  employees: string[];
  merchants: string[];
  pattern: string;
  totalAmount: number;
};

export type PairAnomalyScore = {
  id: string;
  employee: string;
  merchant: string;
  baselineMonthlySpend: number;
  currentMonthlySpend: number;
  trendDeltaPct: number;
  zScore: number;
  anomalyScore: number;
};

export type SpendGraph = {
  nodes: Array<{
    id: string;
    label: string;
    type: "employee" | "merchant" | "category";
  }>;
  edges: Array<{
    from: string;
    to: string;
    weight: number;
  }>;
};

export type IntegrationAlert = {
  id: string;
  channel: "slack" | "whatsapp";
  title: string;
  message: string;
  timestamp: string;
};

export type DeliveryStatus = "queued" | "retrying" | "sent" | "dead-letter";

export type IntegrationDeliveryReceipt = {
  id: string;
  jobId: string;
  attempt: number;
  channel: "slack" | "whatsapp";
  success: boolean;
  statusCode?: number;
  providerMessageId?: string;
  error?: string;
  responseSnippet?: string;
  createdAt: string;
};

export type IntegrationDeliveryJob = {
  id: string;
  channel: "slack" | "whatsapp";
  message: string;
  title: string;
  recipient?: string;
  status: DeliveryStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastError?: string;
  providerMessageId?: string;
  createdAt: string;
  updatedAt: string;
};

export type DeadLetterLog = {
  id: string;
  jobId: string;
  channel: "slack" | "whatsapp";
  message: string;
  reason: string;
  attempts: number;
  createdAt: string;
};

export type OverviewPayload = {
  kpis: Array<{ label: string; value: string; hint: string }>;
  trend: Array<{ month: string; value: number }>;
  timeline: string[];
  recentFlags: Array<{ id: string; merchant: string; reason: string; amount: number; severity: "high" | "medium" }>;
  charts: {
    line: LineChartData;
    donut: DonutChartData;
    stacked: StackedBarData;
  };
  uploadSummary: {
    rowCount: number;
    source: string;
  };
  copilotRecommendations: CopilotRecommendation[];
};

export type PolicyPayload = {
  summary: {
    totalFindings: number;
    highSeverity: number;
    mediumSeverity: number;
    exposure: number;
  };
  findings: Array<{
    id: string;
    severity: "high" | "medium";
    issue: string;
    merchant: string;
    date: string;
    amount: number;
    explainability: Explainability;
  }>;
};

export type CopilotPayload = {
  headline: string;
  recommendations: CopilotRecommendation[];
};

export type InvestigationPayload = {
  clusters: FraudCluster[];
  graph: SpendGraph;
  anomalies: PairAnomalyScore[];
};

export type PolicyRule = {
  id: string;
  name: string;
  condition: string;
  action: string;
  source: "manual" | "copilot";
};

export type IntegrationsPayload = {
  channels: Array<{
    kind: "slack" | "whatsapp";
    configured: boolean;
    target: string;
  }>;
  alerts: IntegrationAlert[];
  queue: {
    queued: number;
    retrying: number;
    sent: number;
    deadLetter: number;
  };
  recentJobs: IntegrationDeliveryJob[];
  recentReceipts: IntegrationDeliveryReceipt[];
  deadLetters: DeadLetterLog[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatResponse = {
  answer: string;
  visualization?: LineChartData | DonutChartData | StackedBarData;
  reasoning?: {
    insight: string;
    recommendation: string;
    action: string;
  };
};

  export type DepartmentScore = {
    name: string;
    compliance: number;
    violations: number;
    totalTransactions: number;
    trend: "up" | "down" | "stable";
  };

  export type ComplianceMetric = {
    name: string;
    status: "compliant" | "warning" | "non-compliant";
    percentage: number;
    description: string;
  };
