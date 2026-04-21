import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AuditTrailEntry,
  ClientProfile,
  DeadLetterLog,
  FilingDeadline,
  IntegrationAlert,
  IntegrationDeliveryJob,
  IntegrationDeliveryReceipt,
  PolicyRule,
  WorkspaceContextPayload,
  WorkspaceMode,
} from "@/lib/types";

export type StoredTransaction = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  employee: string;
  department: string;
  category: string;
};

type MockStore = {
  workspaceName: string;
  mode: WorkspaceMode;
  clients: ClientProfile[];
  activeClientId: string | null;
  deadlines: FilingDeadline[];
  auditTrail: AuditTrailEntry[];
  departments: string[];
  transactions: StoredTransaction[];
  policyRules: PolicyRule[];
  integrationAlerts: IntegrationAlert[];
  integrationJobs: IntegrationDeliveryJob[];
  integrationReceipts: IntegrationDeliveryReceipt[];
  deadLetters: DeadLetterLog[];
  createdAt: string;
  updatedAt: string;
};

const STORAGE_MODE = process.env.COMPLYRA_STORAGE_MODE?.toLowerCase() ?? "json";
const DATA_DIR = path.join(process.cwd(), ".complyra");
const JSON_PATH = path.join(DATA_DIR, "mock-db.json");
const SQLITE_PATH = path.join(DATA_DIR, "mock-db.sqlite");

const DEFAULT_STORE: MockStore = {
  workspaceName: "Complyra Demo Org",
  mode: "business",
  clients: [
    {
      id: "client-complyra-demo",
      name: "Complyra Demo Org",
      gstin: "29ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      sector: "Technology",
    },
  ],
  activeClientId: "client-complyra-demo",
  deadlines: [
    {
      id: "deadline-gst-gstr3b",
      kind: "GST",
      dueDate: "2026-04-20",
      clientId: "client-complyra-demo",
      status: "pending",
    },
    {
      id: "deadline-gst-gstr1",
      kind: "GST",
      dueDate: "2026-04-11",
      clientId: "client-complyra-demo",
      status: "overdue",
    },
    {
      id: "deadline-itr",
      kind: "ITR",
      dueDate: "2026-07-31",
      clientId: "client-complyra-demo",
      status: "pending",
    },
  ],
  auditTrail: [
    {
      id: "audit-seed-1",
      action: "workspace_initialized",
      actor: "system",
      details: "Seed workspace created with demo compliance controls.",
      createdAt: new Date().toISOString(),
    },
  ],
  departments: ["Marketing", "Operations", "Product", "Finance"],
  transactions: [],
  policyRules: [
    {
      id: "r1",
      name: "High Value Approval",
      condition: "If amount > Rs 12,000",
      action: "Require manager + finance approval",
      source: "manual",
    },
    {
      id: "r2",
      name: "After-hours Alcohol",
      condition: "If category is alcohol and time is after 8 PM",
      action: "Auto-flag as high severity",
      source: "manual",
    },
    {
      id: "r3",
      name: "Duplicate Vendor Window",
      condition: "If same merchant + same amount appears in 24h",
      action: "Create fraud investigation cluster",
      source: "manual",
    },
  ],
  integrationAlerts: [],
  integrationJobs: [],
  integrationReceipts: [],
  deadLetters: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJsonStore(): Promise<MockStore> {
  await ensureDataDir();

  try {
    const raw = await readFile(JSON_PATH, "utf8");
    const parsed = JSON.parse(raw) as MockStore;
    return {
      ...DEFAULT_STORE,
      ...parsed,
      mode: parsed.mode ?? DEFAULT_STORE.mode,
      clients: parsed.clients ?? DEFAULT_STORE.clients,
      activeClientId: parsed.activeClientId ?? DEFAULT_STORE.activeClientId,
      deadlines: parsed.deadlines ?? DEFAULT_STORE.deadlines,
      auditTrail: parsed.auditTrail ?? DEFAULT_STORE.auditTrail,
      transactions: parsed.transactions ?? [],
      policyRules: parsed.policyRules ?? DEFAULT_STORE.policyRules,
      integrationAlerts: parsed.integrationAlerts ?? [],
      integrationJobs: parsed.integrationJobs ?? [],
      integrationReceipts: parsed.integrationReceipts ?? [],
      deadLetters: parsed.deadLetters ?? [],
    };
  } catch {
    await writeJsonStore(DEFAULT_STORE);
    return DEFAULT_STORE;
  }
}

async function writeJsonStore(data: MockStore) {
  await ensureDataDir();
  await writeFile(JSON_PATH, JSON.stringify(data, null, 2), "utf8");
}

async function readSqliteStore(): Promise<MockStore> {
  try {
    const sqlite = await import("node:sqlite");
    await ensureDataDir();
    const db = new sqlite.DatabaseSync(SQLITE_PATH);

    db.exec(
      "CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);"
    );

    const row = db
      .prepare("SELECT v FROM kv WHERE k = 'store'")
      .get() as { v?: string } | undefined;

    if (!row?.v) {
      const seed = JSON.stringify(DEFAULT_STORE);
      db.prepare("INSERT OR REPLACE INTO kv (k, v) VALUES ('store', ?)").run(seed);
      db.close();
      return DEFAULT_STORE;
    }

    const parsed = JSON.parse(row.v) as MockStore;
    db.close();

    return {
      ...DEFAULT_STORE,
      ...parsed,
      mode: parsed.mode ?? DEFAULT_STORE.mode,
      clients: parsed.clients ?? DEFAULT_STORE.clients,
      activeClientId: parsed.activeClientId ?? DEFAULT_STORE.activeClientId,
      deadlines: parsed.deadlines ?? DEFAULT_STORE.deadlines,
      auditTrail: parsed.auditTrail ?? DEFAULT_STORE.auditTrail,
      transactions: parsed.transactions ?? [],
      policyRules: parsed.policyRules ?? DEFAULT_STORE.policyRules,
      integrationAlerts: parsed.integrationAlerts ?? [],
      integrationJobs: parsed.integrationJobs ?? [],
      integrationReceipts: parsed.integrationReceipts ?? [],
      deadLetters: parsed.deadLetters ?? [],
    };
  } catch {
    return readJsonStore();
  }
}

async function writeSqliteStore(data: MockStore) {
  try {
    const sqlite = await import("node:sqlite");
    await ensureDataDir();
    const db = new sqlite.DatabaseSync(SQLITE_PATH);

    db.exec(
      "CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL);"
    );

    db
      .prepare("INSERT OR REPLACE INTO kv (k, v) VALUES ('store', ?)")
      .run(JSON.stringify(data));

    db.close();
  } catch {
    await writeJsonStore(data);
  }
}

export async function readStore(): Promise<MockStore> {
  if (STORAGE_MODE === "sqlite") {
    return readSqliteStore();
  }

  return readJsonStore();
}

export async function writeStore(data: MockStore) {
  const payload: MockStore = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (STORAGE_MODE === "sqlite") {
    await writeSqliteStore(payload);
    return;
  }

  await writeJsonStore(payload);
}

export async function saveWorkspace(workspaceName: string, departments: string[]) {
  const store = await readStore();
  const existingClient = store.clients.find((item) => item.id === (store.activeClientId ?? ""));
  const activeClientId = existingClient?.id ?? `client-${Date.now()}`;
  const nextClients = existingClient
    ? store.clients.map((item) => (item.id === existingClient.id ? { ...item, name: workspaceName } : item))
    : [
        {
          id: activeClientId,
          name: workspaceName,
          sector: "General",
        },
        ...store.clients,
      ];

  await writeStore({
    ...store,
    workspaceName,
    clients: nextClients,
    activeClientId,
    departments,
    auditTrail: [
      {
        id: `audit-${Date.now()}`,
        action: "workspace_updated",
        actor: "user",
        details: `Workspace updated with ${departments.length} departments.`,
        createdAt: new Date().toISOString(),
      },
      ...store.auditTrail,
    ].slice(0, 300),
  });
}

export async function setWorkspaceMode(mode: WorkspaceMode) {
  const store = await readStore();
  await writeStore({
    ...store,
    mode,
    auditTrail: [
      {
        id: `audit-${Date.now()}`,
        action: "mode_changed",
        actor: "user",
        details: `Workspace mode switched to ${mode}.`,
        createdAt: new Date().toISOString(),
      },
      ...store.auditTrail,
    ].slice(0, 300),
  });
}

export async function addClientProfile(client: Omit<ClientProfile, "id">) {
  const store = await readStore();
  const next: ClientProfile = {
    id: `client-${Date.now()}`,
    ...client,
  };

  await writeStore({
    ...store,
    clients: [next, ...store.clients],
    activeClientId: next.id,
    auditTrail: [
      {
        id: `audit-${Date.now()}`,
        action: "client_added",
        actor: "user",
        details: `Client ${next.name} added to workspace.`,
        createdAt: new Date().toISOString(),
      },
      ...store.auditTrail,
    ].slice(0, 300),
  });

  return next;
}

export async function setActiveClient(clientId: string) {
  const store = await readStore();
  if (!store.clients.some((item) => item.id === clientId)) {
    return false;
  }

  await writeStore({
    ...store,
    activeClientId: clientId,
  });

  return true;
}

export async function getWorkspaceContext(): Promise<WorkspaceContextPayload> {
  const store = await readStore();
  return {
    workspaceName: store.workspaceName,
    mode: store.mode,
    clients: store.clients,
    activeClientId: store.activeClientId,
    deadlines: store.deadlines,
    auditTrail: store.auditTrail.slice(0, 20),
  };
}

export async function addAuditTrailEntry(entry: Omit<AuditTrailEntry, "id" | "createdAt">) {
  const store = await readStore();

  await writeStore({
    ...store,
    auditTrail: [
      {
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        ...entry,
      },
      ...store.auditTrail,
    ].slice(0, 300),
  });
}

export async function appendTransactions(records: StoredTransaction[]) {
  const store = await readStore();
  const merged = [...records, ...store.transactions].slice(0, 1000);
  await writeStore({
    ...store,
    transactions: merged,
    auditTrail: [
      {
        id: `audit-${Date.now()}`,
        action: "transactions_imported",
        actor: "user",
        details: `${records.length} transactions imported.`,
        createdAt: new Date().toISOString(),
        resource: "upload",
        severity: "info" as const,
      },
      ...store.auditTrail,
    ].slice(0, 300),
  });

  return merged.length;
}

export async function getPolicyRules() {
  const store = await readStore();
  return store.policyRules;
}

export async function addPolicyRule(rule: PolicyRule) {
  const store = await readStore();
  await writeStore({
    ...store,
    policyRules: [rule, ...store.policyRules],
    auditTrail: [
      {
        id: `audit-${Date.now()}`,
        action: "policy_rule_added",
        actor: "user",
        details: `Policy rule ${rule.name} added.`,
        createdAt: new Date().toISOString(),
      },
      ...store.auditTrail,
    ].slice(0, 300),
  });
}

export async function reorderPolicyRules(orderedIds: string[]) {
  const store = await readStore();
  const byId = new Map(store.policyRules.map((rule) => [rule.id, rule]));

  const ordered = orderedIds
    .map((id) => byId.get(id))
    .filter((rule): rule is PolicyRule => Boolean(rule));

  const missing = store.policyRules.filter((rule) => !orderedIds.includes(rule.id));

  await writeStore({
    ...store,
    policyRules: [...ordered, ...missing],
    auditTrail: [
      {
        id: `audit-${Date.now()}`,
        action: "policy_rules_reordered",
        actor: "user",
        details: "Policy rule priority updated.",
        createdAt: new Date().toISOString(),
      },
      ...store.auditTrail,
    ].slice(0, 300),
  });
}

export async function appendIntegrationAlert(alert: IntegrationAlert) {
  const store = await readStore();
  await writeStore({
    ...store,
    integrationAlerts: [alert, ...store.integrationAlerts].slice(0, 50),
  });
}

export async function getIntegrationAlerts() {
  const store = await readStore();
  return store.integrationAlerts;
}

export async function getIntegrationJobs() {
  const store = await readStore();
  return store.integrationJobs;
}

export async function getIntegrationReceipts() {
  const store = await readStore();
  return store.integrationReceipts;
}

export async function getDeadLetters() {
  const store = await readStore();
  return store.deadLetters;
}

export async function addIntegrationJob(job: IntegrationDeliveryJob) {
  const store = await readStore();
  await writeStore({
    ...store,
    integrationJobs: [job, ...store.integrationJobs].slice(0, 200),
  });
}

export async function updateIntegrationJob(job: IntegrationDeliveryJob) {
  const store = await readStore();
  await writeStore({
    ...store,
    integrationJobs: store.integrationJobs.map((item) => (item.id === job.id ? job : item)),
  });
}

export async function addIntegrationReceipt(receipt: IntegrationDeliveryReceipt) {
  const store = await readStore();
  await writeStore({
    ...store,
    integrationReceipts: [receipt, ...store.integrationReceipts].slice(0, 500),
  });
}

export async function addDeadLetterLog(deadLetter: DeadLetterLog) {
  const store = await readStore();
  await writeStore({
    ...store,
    deadLetters: [deadLetter, ...store.deadLetters].slice(0, 200),
  });
}
