import MaterialIcon from './MaterialIcon';
import Sparkline from './Sparkline';

export type Accent = 'cyan' | 'blue' | 'violet' | 'emerald' | 'amber' | 'rose';

const ACCENT_HEX: Record<Accent, string> = {
  cyan: '#0891B2',
  blue: '#2563EB',
  violet: '#7C3AED',
  emerald: '#059669',
  amber: '#D97706',
  rose: '#E11D48',
};

const TILE: Record<Accent, string> = {
  cyan: 'tile-cyan',
  blue: 'tile-blue',
  violet: 'tile-violet',
  emerald: 'tile-emerald',
  amber: 'tile-amber',
  rose: 'tile-rose',
};

type BadgeTone = 'ok' | 'warn' | 'crit' | 'info' | 'neutral';

/** Accepts both the new telemetry delta shape and the legacy `tone` shape. */
interface Delta {
  text: string;
  direction?: 'up' | 'down' | 'flat';
  good?: boolean;
  tone?: 'up' | 'down' | 'neutral';
}

interface Props {
  label: string;
  value: string;
  caption?: string;
  /** Legacy alias for caption */
  subtext?: string;
  icon?: string;
  accent?: Accent;
  /** Legacy */
  iconClass?: string;
  delta?: Delta;
  badge?: { text: string; tone: BadgeTone | 'error' | 'warning' | 'success' };
  spark?: number[];
  className?: string;
}

const LEGACY_BADGE_TONE: Record<string, BadgeTone> = {
  error: 'crit',
  warning: 'warn',
  success: 'ok',
};

const BADGE_CLASS: Record<BadgeTone, string> = {
  ok: 'chip-ok',
  warn: 'chip-warn',
  crit: 'chip-crit',
  info: 'chip-info',
  neutral: 'chip-neutral',
};

/**
 * Dense telemetry KPI card — accent tile, headline metric,
 * directional delta and optional inline sparkline.
 */
export default function KpiCard({
  label,
  value,
  caption,
  subtext,
  icon,
  accent = 'blue',
  delta,
  badge,
  spark,
  className = '',
}: Props) {
  const hex = ACCENT_HEX[accent];
  const direction = delta?.direction ?? (delta?.tone === 'down' ? 'down' : delta?.tone === 'up' ? 'up' : 'flat');
  const good = delta?.good ?? (delta?.tone === 'down');
  const badgeTone: BadgeTone | undefined = badge
    ? LEGACY_BADGE_TONE[badge.tone] ?? (badge.tone as BadgeTone)
    : undefined;

  return (
    <div className={`card card-interactive p-4 flex flex-col gap-3 ${className}`}>
      {/* Head: label + tile / badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="micro-label">{label}</p>
          {(caption || subtext) && (
            <p className="text-[11px] text-muted mt-1 truncate">{caption ?? subtext}</p>
          )}
        </div>
        {badge && badgeTone ? (
          <span className={BADGE_CLASS[badgeTone]}>{badge.text}</span>
        ) : icon ? (
          <span className={TILE[accent]}>
            <MaterialIcon name={icon} size={21} />
          </span>
        ) : null}
      </div>

      {/* Body: value + sparkline */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="kpi-value text-ink truncate">{value}</p>
          {delta && (
            <div
              className={`flex items-center gap-1 mt-1.5 text-[11px] font-semibold ${
                good ? 'text-accent-emerald' : direction === 'flat' ? 'text-muted' : 'text-accent-rose'
              }`}
            >
              {direction !== 'flat' && (
                <MaterialIcon name={direction === 'up' ? 'north_east' : 'south_east'} size={13} />
              )}
              <span>{delta.text}</span>
            </div>
          )}
        </div>
        {spark && spark.length > 1 && <Sparkline data={spark} color={hex} width={82} height={30} />}
      </div>
    </div>
  );
}