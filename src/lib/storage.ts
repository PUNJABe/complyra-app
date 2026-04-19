import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  DeadLetterLog,
  IntegrationAlert,
  IntegrationDeliveryJob,
  IntegrationDeliveryReceipt,
  PolicyRule,
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
  await writeStore({
    ...store,
    workspaceName,
    departments,
  });
}

export async function appendTransactions(records: StoredTransaction[]) {
  const store = await readStore();
  const merged = [...records, ...store.transactions].slice(0, 1000);
  await writeStore({
    ...store,
    transactions: merged,
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
