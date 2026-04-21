"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkspaceContextPayload } from "@/lib/types";

export default function AuditLogsPage() {
  const [workspace, setWorkspace] = useState<WorkspaceContextPayload | null>(null);
  const [error, setError] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load audit logs.");
        setWorkspace((await response.json()) as WorkspaceContextPayload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unexpected audit logs error.");
      }
    };

    void run();
  }, []);

  const users = useMemo(() => {
    if (!workspace) return [];
    return Array.from(new Set(workspace.auditTrail.map((entry) => entry.actor)));
  }, [workspace]);

  const filtered = useMemo(() => {
    if (!workspace) return [];
    return workspace.auditTrail.filter((entry) => {
      const byUser = userFilter === "all" || entry.actor === userFilter;
      const byAction = actionFilter === "all" || entry.action.toLowerCase().includes(actionFilter.toLowerCase());
      const byDate = !dateFilter || entry.createdAt.startsWith(dateFilter);
      return byUser && byAction && byDate;
    });
  }, [workspace, userFilter, actionFilter, dateFilter]);

  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!workspace) return <div className="h-40 animate-pulse rounded-2xl bg-canvas" />;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-canvas/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1E3A8A]">Audit Logs</p>
        <h2 className="mt-2 text-2xl font-semibold">Activity Timeline</h2>
        <p className="mt-1 text-sm text-ink/70">Track who accessed your data, what they viewed/exported, and from which device.</p>
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink/10 bg-white/85 p-4">
        <input
          type="date"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
          className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        />
        <select
          value={userFilter}
          onChange={(event) => setUserFilter(event.target.value)}
          className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All users</option>
          {users.map((user) => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        >
          <option value="all">All actions</option>
          <option value="access">Access</option>
          <option value="report">Report</option>
          <option value="upload">Upload</option>
          <option value="download">Download</option>
          <option value="export">Export</option>
          <option value="policy">Policy</option>
        </select>
      </section>

      <section className="space-y-3">
        {filtered.map((entry) => (
          <article key={entry.id} className="rounded-2xl border border-ink/10 bg-white/88 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink/85">{entry.action}</p>
              <span className="rounded-full border border-ink/15 bg-canvas/70 px-2 py-1 text-[11px] text-ink/65">{new Date(entry.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm text-ink/70">{entry.details}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink/55">
              <span>Actor: {entry.actor}</span>
              {entry.resource && <span className="rounded-full border border-ink/15 bg-canvas/70 px-2 py-0.5">Resource: {entry.resource}</span>}
              {entry.ip && <span className="rounded-full border border-ink/15 bg-canvas/70 px-2 py-0.5">IP: {entry.ip}</span>}
              {entry.userAgent && <span className="rounded-full border border-ink/15 bg-canvas/70 px-2 py-0.5">Device: {entry.userAgent.slice(0, 42)}</span>}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
