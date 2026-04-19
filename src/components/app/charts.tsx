import type { DonutChartData, LineChartData, StackedBarData } from "@/lib/types";

const palette = ["#b58e63", "#5f788e", "#2f5f69", "#8d6f8f", "#6b7280"];

export function LineChartCard({ data }: { data: LineChartData }) {
  const max = Math.max(...data.points.map((p) => p.value), 1);
  const points = data.points
    .map((point, index) => {
      const x = (index / Math.max(data.points.length - 1, 1)) * 100;
      const y = 100 - (point.value / max) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <article className="rounded-2xl border border-ink/10 bg-white/80 p-5">
      <h3 className="text-base font-semibold">{data.title}</h3>
      <div className="mt-4">
        <svg viewBox="0 0 100 100" className="h-44 w-full" preserveAspectRatio="none" role="img" aria-label={data.title}>
          <polyline fill="none" stroke="rgba(24,34,48,0.18)" strokeWidth="0.8" points="0,100 100,100" />
          <polyline fill="none" stroke="url(#lineGradient)" strokeWidth="2.2" points={points} />
          <defs>
            <linearGradient id="lineGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#b58e63" />
              <stop offset="100%" stopColor="#5f788e" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-2 text-center text-xs text-ink/55">
        {data.points.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </article>
  );
}

export function DonutChartCard({ data }: { data: DonutChartData }) {
  const total = data.segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const arcs = data.segments.reduce<Array<{ d: string; fill: string; label: string; value: number }>>(
    (acc, segment, index) => {
      const currentStart = acc.length === 0 ? 0 : acc.reduce((sum, entry) => sum + (entry.value / total) * 360, 0);
      const sweep = (segment.value / total) * 360;
      const end = currentStart + sweep;
      const largeArc = sweep > 180 ? 1 : 0;

      const x1 = 50 + 38 * Math.cos((Math.PI * currentStart) / 180);
      const y1 = 50 + 38 * Math.sin((Math.PI * currentStart) / 180);
      const x2 = 50 + 38 * Math.cos((Math.PI * end) / 180);
      const y2 = 50 + 38 * Math.sin((Math.PI * end) / 180);

      acc.push({
        d: `M 50 50 L ${x1} ${y1} A 38 38 0 ${largeArc} 1 ${x2} ${y2} Z`,
        fill: palette[index % palette.length],
        label: segment.label,
        value: segment.value,
      });

      return acc;
    },
    []
  );

  return (
    <article className="rounded-2xl border border-ink/10 bg-white/80 p-5">
      <h3 className="text-base font-semibold">{data.title}</h3>
      <div className="mt-4 grid items-center gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <svg viewBox="0 0 100 100" className="mx-auto h-36 w-36" role="img" aria-label={data.title}>
          {arcs.map((arc) => (
            <path key={arc.label} d={arc.d} fill={arc.fill} opacity={0.92} />
          ))}
          <circle cx="50" cy="50" r="18" fill="#f6f3ee" />
        </svg>
        <div className="space-y-2 text-sm">
          {arcs.map((arc) => {
            const pct = Math.round((arc.value / total) * 100);
            return (
              <div key={arc.label} className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-ink/75">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: arc.fill }} />
                  {arc.label}
                </span>
                <span className="font-medium">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

export function StackedBarCard({ data }: { data: StackedBarData }) {
  const totals = data.bars.map((bar) => bar.segments.reduce((sum, segment) => sum + segment.value, 0));
  const max = Math.max(...totals, 1);

  return (
    <article className="rounded-2xl border border-ink/10 bg-white/80 p-5">
      <h3 className="text-base font-semibold">{data.title}</h3>
      <div className="mt-4 space-y-4">
        {data.bars.map((bar) => {
          const total = bar.segments.reduce((sum, segment) => sum + segment.value, 0);
          const widthScale = (total / max) * 100;

          return (
            <div key={bar.label}>
              <div className="mb-1 flex items-center justify-between text-xs text-ink/65">
                <span>{bar.label}</span>
                <span>{Math.round(total).toLocaleString()}</span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-canvas" style={{ width: `${Math.max(widthScale, 18)}%` }}>
                {bar.segments.map((segment, index) => {
                  const segmentTotal = total || 1;
                  const segmentWidth = (segment.value / segmentTotal) * 100;
                  return (
                    <div
                      key={`${bar.label}-${segment.label}`}
                      style={{
                        width: `${segmentWidth}%`,
                        backgroundColor: palette[index % palette.length],
                      }}
                      title={`${segment.label}: ${Math.round(segment.value).toLocaleString()}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
