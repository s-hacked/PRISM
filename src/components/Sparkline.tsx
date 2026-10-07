interface Props {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  fill?: boolean;
  strokeWidth?: number;
}

/**
 * Compact inline trend line used inside KPI cards.
 * Renders a smoothed polyline with an optional gradient fill.
 */
export default function Sparkline({
  data,
  color = '#2563EB',
  width = 84,
  height = 28,
  fill = true,
  strokeWidth = 2,
}: Props) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = strokeWidth;
  const h = height - pad * 2;
  const w = width;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = pad + h - ((v - min) / range) * h;
    return [x, y] as const;
  });

  // Build a smooth path with cubic midpoints
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i += 1) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const mx = (px + cx) / 2;
    d += ` C ${mx},${py} ${mx},${cy} ${cx},${cy}`;
  }

  const id = `spark-${color.replace('#', '')}-${Math.round(width)}`;
  const linePath = `${d} L ${w},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${w} ${height}`} className="overflow-visible shrink-0">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {fill && <path d={linePath} fill={`url(#${id})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r={strokeWidth + 0.6} fill={color} />
    </svg>
  );
}