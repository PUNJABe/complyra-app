"use client";

import { useEffect, useState } from "react";
import { DepartmentLeaderboard } from "@/components/app/department-leaderboard";
import { CostOptimizationWidget } from "@/components/app/cost-optimization-widget";
import { AuditComplianceReport } from "@/components/app/audit-compliance-report";
import type { DepartmentScore } from "@/lib/types";

// Mock data for insights
const mockDepartments: DepartmentScore[] = [
  { name: "Engineering", compliance: 94, violations: 2, totalTransactions: 156, trend: "up" },
  { name: "Marketing", compliance: 87, violations: 6, totalTransactions: 142, trend: "stable" },
  { name: "Sales", compliance: 91, violations: 3, totalTransactions: 128, trend: "up" },
  { name: "Operations", compliance: 76, violations: 12, totalTransactions: 198, trend: "down" },
  { name: "Finance", compliance: 98, violations: 1, totalTransactions: 89, trend: "stable" },
];

const mockOptimizations = [
  {
    id: "1",
    title: "Consolidate Travel Vendors",
    description: "Switch primary travel booking to corporate rate provider",
    currentSpend: 24500,
    potentialSavings: 3675,
    savingsPercentage: 15,
    category: "Travel",
    priority: "high" as const,
  },
  {
    id: "2",
    title: "Negotiate SaaS Renewal",
    description: "Aggregate usage across teams for volume discount",
    currentSpend: 18900,
    potentialSavings: 5670,
    savingsPercentage: 30,
    category: "Software",
    priority: "high" as const,
  },
  {
    id: "3",
    title: "Switch Meal Service Provider",
    description: "Use preferred catering vendor for 20% savings",
    currentSpend: 8400,
    potentialSavings: 1680,
    savingsPercentage: 20,
    category: "Meals",
    priority: "medium" as const,
  },
  {
    id: "4",
    title: "Optimize Shipping Costs",
    description: "Consolidate shipments and negotiate carrier rates",
    currentSpend: 12300,
    potentialSavings: 1845,
    savingsPercentage: 15,
    category: "Logistics",
    priority: "medium" as const,
  },
];

const mockComplianceMetrics = [
  {
    name: "Policy Adherence",
    status: "compliant" as const,
    percentage: 94,
    description: "94% of transactions comply with spending policies",
  },
  {
    name: "Approval Rate",
    status: "compliant" as const,
    percentage: 98,
    description: "98% of flagged items properly reviewed and approved",
  },
  {
    name: "Documentation",
    status: "warning" as const,
    percentage: 81,
    description: "Some receipts missing - 81% of transactions fully documented",
  },
  {
    name: "Audit Trail",
    status: "compliant" as const,
    percentage: 100,
    description: "100% of transactions have complete audit trail",
  },
];

export default function InsightsPage() {
  const [data, setData] = useState<{ optimizations: typeof mockOptimizations; compliance: typeof mockComplianceMetrics; departments: typeof mockDepartments } | null>(
    null
  );

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setData({
        optimizations: mockOptimizations,
        compliance: mockComplianceMetrics,
        departments: mockDepartments,
      });
    }, 500);
  }, []);

  if (!data) {
    return <p className="text-sm text-ink/70">Loading insights...</p>;
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-white/85 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/55">Advanced Features</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Insights & Optimization</h2>
        <p className="mt-1 text-sm text-ink/70">Team performance, cost savings, and compliance reporting</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DepartmentLeaderboard data={data.departments} />
        <AuditComplianceReport
          period="Q1 2026"
          metrics={data.compliance}
          totalTransactions={713}
          flaggedTransactions={43}
          complianceRate={94}
        />
      </section>

      <CostOptimizationWidget optimizations={data.optimizations} />
    </div>
  );
}
