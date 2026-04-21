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
  savingsImpact: number;
  confidence: number;
  explainability?: {
    why: string;
    evidence: string;
    baseline: string;
  };
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

export type AutoInvestigationCase = {
  id: string;
  title: string;
  source: string;
  reason: string;
  riskScore: number;
  status: "open" | "triaged" | "monitoring";
  owner: string;
  createdAt: string;
};

export type ForecastSnapshot = {
  nextMonthSpend: number;
  changePct: number;
  confidence: number;
  scenario: string;
  drivers: Array<{
    label: string;
    impactPct: number;
    evidence: string;
  }>;
};

export type PolicyTemplate = {
  id: string;
  industry: "Startup" | "Enterprise" | "Healthcare";
  name: string;
  description: string;
  focus: string[];
  rules: string[];
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
  forecast: ForecastSnapshot;
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
  templates: PolicyTemplate[];
};

export type CopilotPayload = {
  headline: string;
  recommendations: CopilotRecommendation[];
};

export type InvestigationPayload = {
  clusters: FraudCluster[];
  graph: SpendGraph;
  anomalies: PairAnomalyScore[];
  cases: AutoInvestigationCase[];
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

export type WorkspaceMode = "business" | "personal";

export type UserRole = "admin" | "ca" | "employee" | "viewer";

export type ClientProfile = {
  id: string;
  name: string;
  gstin?: string;
  pan?: string;
  sector?: string;
};

export type FilingDeadline = {
  id: string;
  kind: "GST" | "ITR" | "TDS";
  dueDate: string;
  clientId?: string;
  status: "pending" | "completed" | "overdue";
};

export type AuditTrailEntry = {
  id: string;
  action: string;
  actor: string;
  details: string;
  createdAt: string;
  resource?: string;
  ip?: string;
  userAgent?: string;
  severity?: "info" | "warning";
};

export type WorkspaceContextPayload = {
  workspaceName: string;
  mode: WorkspaceMode;
  clients: ClientProfile[];
  activeClientId: string | null;
  deadlines: FilingDeadline[];
  auditTrail: AuditTrailEntry[];
};

export type ComplianceRiskFinding = {
  id: string;
  kind: "missing-invoice" | "gst-mismatch" | "duplicate-expense" | "suspicious-vendor";
  severity: "high" | "medium" | "low";
  merchant: string;
  amount: number;
  reason: string;
  evidence: string;
};

export type ComplianceCheckPayload = {
  summary: {
    totalChecked: number;
    riskyCount: number;
    missingInvoices: number;
    gstMismatches: number;
    suspiciousEntries: number;
  };
  topRisks: ComplianceRiskFinding[];
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
