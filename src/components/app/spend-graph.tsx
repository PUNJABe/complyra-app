import type { SpendGraph } from "@/lib/types";

const colorByType: Record<SpendGraph["nodes"][number]["type"], string> = {
  employee: "#b58e63",
  merchant: "#5f788e",
  category: "#2f5f69",
};

function nodePosition(index: number, total: number) {
  const angle = (Math.PI * 2 * index) / Math.max(total, 1);
  const cx = 50 + Math.cos(angle) * 36;
  const cy = 50 + Math.sin(angle) * 30;
  return { cx, cy };
}

export function SpendGraphCard({ graph }: { graph: SpendGraph }) {
  const positions = new Map<string, { cx: number; cy: number }>();
  graph.nodes.forEach((node, index) => {
    positions.set(node.id, nodePosition(index, graph.nodes.length));
  });

  const maxWeight = Math.max(...graph.edges.map((edge) => edge.weight), 1);

  return (
    <article className="rounded-2xl border border-ink/10 bg-white/82 p-5">
      <h3 className="text-base font-semibold">Spending Behavior Graph</h3>
      <p className="mt-1 text-sm text-ink/65">Employee → Merchant → Category relationship map.</p>

      <svg viewBox="0 0 100 100" className="mt-4 h-72 w-full rounded-xl bg-canvas/60 p-2" role="img" aria-label="Spending graph">
        {graph.edges.map((edge) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          const opacity = 0.2 + (edge.weight / maxWeight) * 0.7;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              x1={from.cx}
              y1={from.cy}
              x2={to.cx}
              y2={to.cy}
              stroke="rgba(24,34,48,0.55)"
              strokeOpacity={opacity}
              strokeWidth={0.45 + (edge.weight / maxWeight) * 1.2}
            />
          );
        })}

        {graph.nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          return (
            <g key={node.id}>
              <circle cx={pos.cx} cy={pos.cy} r={3.1} fill={colorByType[node.type]} />
              <text x={pos.cx} y={pos.cy + 6} textAnchor="middle" fontSize="2.6" fill="#182230">
                {node.label.slice(0, 14)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-ink/15 bg-canvas px-2 py-1">Employee nodes</span>
        <span className="rounded-full border border-ink/15 bg-canvas px-2 py-1">Merchant nodes</span>
        <span className="rounded-full border border-ink/15 bg-canvas px-2 py-1">Category nodes</span>
      </div>
    </article>
  );
}
