import { requireSession } from "@/lib/auth";
import { mutateKV, readKV } from "@/lib/secure-kv";
import { classifyTransactions } from "@/lib/categorization";

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
  statementId?: string;
  direction?: "debit" | "credit";
  remark?: string;
  confidence?: number;
  needsReview?: boolean;
  reviewReasons?: string[];
  categorySource?: "rule" | "user" | "ai" | "unknown";
  suggestedCategory?: string;
  reviewedAt?: string;
};

export type MockStore = {
  revision?: number;
  deletedAt?: string;
  lastStatementAt?: string | null;
  merchantRules?: Record<string, string>;
  workspaceName: string;
  mode: WorkspaceMode;
  clients: ClientProfile[];
  activeClientId: string | null;
  deadlines: FilingDeadline[];
  auditTrail: AuditTrailEntry[];
  departments: string[];
  transactions: StoredTransaction[];
  activeStatementId: string | null;
  policyRules: PolicyRule[];
  integrationAlerts: IntegrationAlert[];
  integrationJobs: IntegrationDeliveryJob[];
  integrationReceipts: IntegrationDeliveryReceipt[];
  deadLetters: DeadLetterLog[];
  createdAt: string;
  updatedAt: string;
};

export function emptyStore(): MockStore {
  const now = new Date().toISOString();
  return {
    workspaceName: "My workspace",
    mode: "business",
    clients: [],
    activeClientId: null,
    deadlines: [],
    auditTrail: [],
    departments: [],
    transactions: [],
    activeStatementId: null,
    policyRules: [],
    integrationAlerts: [],
    integrationJobs: [],
    integrationReceipts: [],
    deadLetters: [],
    createdAt: now,
    updatedAt: now,
    revision: 0,
    lastStatementAt: null,
    merchantRules: {},
  };
}
export const workspaceKey = (userId: string) => `workspace:${userId}`;
export async function readUserStore(userId: string): Promise<MockStore> {
  return readKV(workspaceKey(userId), emptyStore());
}
export async function readStore(): Promise<MockStore> {
  return readUserStore((await requireSession()).userId);
}
export async function writeStore(data: MockStore) {
  const session = await requireSession();
  await mutateKV(workspaceKey(session.userId), emptyStore(), (current) => {
    if (current.deletedAt) throw new Error("Account workspace was deleted.");
    if ((current.revision ?? 0) !== (data.revision ?? 0))
      throw new Error("Workspace changed. Refresh and try again.");
    Object.assign(current, data, {
      revision: (current.revision ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  });
}
export async function mutateStore<R>(
  change: (store: MockStore) => R | Promise<R>,
) {
  const session = await requireSession();
  return mutateKV(workspaceKey(session.userId), emptyStore(), async (store) => {
    if (store.deletedAt) throw new Error("Account workspace was deleted.");
    const result = await change(store);
    store.revision = (store.revision ?? 0) + 1;
    store.updatedAt = new Date().toISOString();
    return result;
  });
}

export async function saveWorkspace(
  workspaceName: string,
  departments: string[],
) {
  const store = await readStore();
  const existingClient = store.clients.find(
    (item) => item.id === (store.activeClientId ?? ""),
  );
  const activeClientId = existingClient?.id ?? `client-${Date.now()}`;
  const nextClients = existingClient
    ? store.clients.map((item) =>
        item.id === existingClient.id ? { ...item, name: workspaceName } : item,
      )
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

export async function addAuditTrailEntry(
  entry: Omit<AuditTrailEntry, "id" | "createdAt">,
) {
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
  const classified = await classifyTransactions(
    records,
    store.merchantRules ?? {},
    (await requireSession()).aiEnabled,
  );
  const merged = [...classified, ...store.transactions];
  if (merged.length > 2000)
    throw new Error(
      "A workspace supports 2,000 active transactions. Export or replace your statement.",
    );
  await writeStore({
    ...store,
    transactions: merged,
    lastStatementAt: new Date().toISOString(),
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

export async function replaceTransactions(
  records: StoredTransaction[],
  statementId = `statement-${Date.now()}`,
) {
  const store = await readStore();
  if (records.length > 2000)
    throw new Error("Maximum 2,000 transactions per statement.");
  const classified = await classifyTransactions(
    records,
    store.merchantRules ?? {},
    (await requireSession()).aiEnabled,
  );
  const next = classified.map((record) => ({
    ...record,
    statementId,
  }));

  await writeStore({
    ...store,
    transactions: next,
    activeStatementId: statementId,
    lastStatementAt: new Date().toISOString(),
    auditTrail: [
      {
        id: `audit-${Date.now()}`,
        action: "transactions_replaced",
        actor: "user",
        details: `${records.length} statement transactions imported and active data reset.`,
        createdAt: new Date().toISOString(),
        resource: "upload",
        severity: "info" as const,
      },
      ...store.auditTrail,
    ].slice(0, 300),
  });

  return next.length;
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

  const missing = store.policyRules.filter(
    (rule) => !orderedIds.includes(rule.id),
  );

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
    integrationJobs: store.integrationJobs.map((item) =>
      item.id === job.id ? job : item,
    ),
  });
}

export async function addIntegrationReceipt(
  receipt: IntegrationDeliveryReceipt,
) {
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
