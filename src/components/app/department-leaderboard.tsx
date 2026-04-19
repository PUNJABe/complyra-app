"use client";

interface DepartmentScore {
  name: string;
  compliance: number;
  violations: number;
  totalTransactions: number;
  trend: "up" | "down" | "stable";
}

interface DepartmentLeaderboardProps {
  data: DepartmentScore[];
}

export function DepartmentLeaderboard({ data }: DepartmentLeaderboardProps) {
  const sorted = [...data].sort((a, b) => b.compliance - a.compliance);

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/80 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Compliance Leaderboard</h2>
        <span className="text-xs text-ink/60">Ranked by policy compliance %</span>
      </div>

      <div className="space-y-2">
        {sorted.map((dept, index) => (
          <div
            key={dept.name}
            className="flex items-center gap-4 rounded-lg border border-ink/10 bg-gradient-to-r from-white to-canvas/50 p-3 hover:border-ink/20 transition"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-accent to-highlight flex items-center justify-center text-white font-bold text-sm">
              {index + 1}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-ink/80">{dept.name}</p>
              <p className="text-xs text-ink/60">
                {dept.totalTransactions} transactions • {dept.violations} violations
              </p>
            </div>

            <div className="text-right">
              <p className={`text-2xl font-bold ${dept.compliance >= 90 ? "text-green-600" : dept.compliance >= 75 ? "text-amber-600" : "text-rose-600"}`}>
                {dept.compliance}%
              </p>
              <p className="text-xs text-ink/60">
                {dept.trend === "up" && "📈 Improving"}
                {dept.trend === "down" && "📉 Declining"}
                {dept.trend === "stable" && "➡️ Stable"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
