/** Lightweight server-rendered SVG bar chart (no chart library needed). */
export function BarChart({ data, color, label }: { data: Array<{ date: string; value: number }>; color: string; label: string }) {
  const W = 720, H = 160, PAD_L = 32, PAD_B = 22, PAD_T = 8;
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const bw = (W - PAD_L) / data.length;
  const y = (v: number) => PAD_T + (H - PAD_T - PAD_B) * (1 - v / nice);
  const tickEvery = Math.ceil(data.length / 7);
  const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label} per day`}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line x1={PAD_L} x2={W} y1={y(nice * f)} y2={y(nice * f)} stroke="#eadfd7" strokeDasharray={f ? "3 4" : undefined} />
          <text x={PAD_L - 6} y={y(nice * f) + 3} textAnchor="end" fontSize="10" fill="#7a6a62">{Math.round(nice * f)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const h = H - PAD_B - y(d.value);
        return (
          <g key={d.date}>
            <rect x={PAD_L + i * bw + bw * 0.18} y={y(d.value)} width={Math.max(1, bw * 0.64)} height={Math.max(0, h)} rx={Math.min(3, bw * 0.3)} fill={color}>
              <title>{`${fmt(d.date)}: ${d.value} ${label.toLowerCase()}`}</title>
            </rect>
            {i % tickEvery === 0 && (
              <text x={PAD_L + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="#7a6a62">{fmt(d.date)}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function niceMax(v: number) {
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}
