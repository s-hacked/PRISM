import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { api, fmt } from '../services/api';
import KpiCard from '../components/KpiCard';
import MaterialIcon from '../components/MaterialIcon';
import ErrorState from '../components/ErrorState';
import { PageSkeleton } from '../components/Skeleton';

const RANGES = ['1M', '3M', '6M', '1Y'];

export default function OverviewPage() {
  const [range, setRange] = useState('6M');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [lift, setLift] = useState(5);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['overview', filters],
    queryFn: () => api.overview(filters),
  });
  const { data: datasets } = useQuery({ queryKey: ['datasets'], queryFn: api.datasets });
  const { data: sim } = useQuery({
    queryKey: ['retention-sim', lift],
    queryFn: () => api.retentionSimulator(lift),
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <div className="p-6">
        <ErrorState message="Unable to load the overview. The API may be unreachable." onRetry={() => refetch()} />
      </div>
    );
  }

  const { kpis, forecastSeries, drivers, insight, cohorts } = data;
  const chartData = [
    ...forecastSeries.history.map((h) => ({ ...h, type: 'actual' })),
    ...forecastSeries.future.map((f) => ({ ...f, type: 'forecast' })),
  ];
  const lastActual = forecastSeries.history[forecastSeries.history.length - 1];
  const historySpark = forecastSeries.history.map((h) => h.actual ?? 0);
  const driverSpark = drivers.map((d) => d.impactPct);
  const activeFilterCount = Object.values(filters).filter((v) => v && v !== 'All').length;

  return (
    <div className="p-5 lg:p-6 space-y-5 animate-fade-in">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-hairline shadow-card
          bg-gradient-to-br from-white via-blue-50/70 to-violet-50/70"
      >
        <div className="absolute inset-0 bg-[radial-gradient(700px_320px_at_18%_-30%,rgba(37,99,235,0.18),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(560px_300px_at_88%_120%,rgba(124,58,237,0.16),transparent_65%)]" />

        <div className="relative grid grid-cols-1 xl:grid-cols-12">
          {/* Headline */}
          <div className="xl:col-span-7 p-7 lg:p-9">
            <p className="micro-label text-accent-blue">Revenue Operations Intelligence</p>
            <h1 className="mt-3 text-[34px] lg:text-[42px] font-bold leading-[1.08] tracking-tight">
              <span className="text-ink">From Data to </span>
              <span className="text-gradient">Decisions.</span>
            </h1>
            <p className="mt-3 text-sm text-muted max-w-lg leading-relaxed">
              Predictive intelligence for subscription businesses. Forecast demand, surface at-risk
              customers and act before it impacts revenue.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="chip-ok">
                <span className="dot-live" />
                Model {data.model.version}
              </span>
              <span className="chip-info">{fmt.num(kpis.totalCustomers)} customers scored</span>
              {datasets && (
                <span className="chip-neutral font-mono">{datasets.active.name}</span>
              )}
            </div>
          </div>

          {/* PRISM insight card */}
          <div className="xl:col-span-5 p-5 lg:pl-0 lg:pr-7 lg:py-7">
            <div className="h-full rounded-2xl bg-white/85 backdrop-blur border border-hairline shadow-card p-5 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="tile-violet !w-8 !h-8 rounded-lg">
                    <MaterialIcon name="auto_awesome" size={17} />
                  </span>
                  <p className="text-[13px] font-bold text-ink">PRISM Insight</p>
                </div>
                <span className="chip-neutral">{fmt.pct(kpis.churnRate)} churn</span>
              </div>

              <p className="mt-3.5 text-[13px] text-ink leading-relaxed flex-1">
                Next period revenue is projected at{' '}
                <span className="font-bold text-accent-blue">{fmt.moneyCompact(kpis.nextMonthForecast)}</span>{' '}
                ({kpis.mrrGrowth >= 0 ? '+' : ''}{fmt.pctRaw(kpis.mrrGrowth * 100)} MoM).{' '}
                <span className="font-semibold">{insight.affectedAccounts.toLocaleString()} accounts</span> carry
                elevated churn risk — led by {drivers[0]?.label?.toLowerCase()}.
              </p>

              <div className="mt-4 flex items-center gap-2">
                <button className="btn-primary">
                  Explore Forecast
                  <MaterialIcon name="arrow_forward" size={15} />
                </button>
                <button className="btn-secondary" onClick={() => setFilters({ contract: 'Month-to-month' })}>
                  At-risk cohort
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filter strip ─────────────────────────────────────── */}
      <div className="card px-4 py-3 flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 flex-nowrap">
          <div className="flex items-center gap-1.5 text-muted pr-1">
            <MaterialIcon name="filter_alt" size={17} />
            <span className="micro-label">Filters</span>
          </div>
          {(
            [
              ['contract', 'Contract', ['All', 'Month-to-month', 'One year', 'Two year']],
              ['internetService', 'Service', ['All', 'Fiber optic', 'DSL', 'No']],
              ['tenure', 'Tenure', ['All', '<6', '6-12', '12-24', '24+']],
              ['paymentMethod', 'Payment', ['All', 'Electronic check', 'Mailed check', 'Bank transfer', 'Credit card']],
            ] as const
          ).map(([key, label, options]) => (
            <div
              key={key}
              className="flex items-center gap-1.5 bg-slate-50 border border-hairline-soft px-2.5 h-8 rounded-lg"
            >
              <span className="text-[11px] text-muted">{label}</span>
              <select
                className="select"
                value={filters[key] || 'All'}
                onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
              >
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o === 'All' ? 'All' : label === 'Tenure' ? TENCURE_LABEL[o] : o}
                  </option>
                ))}
              </select>
              <MaterialIcon name="expand_more" size={14} className="text-faint" />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeFilterCount > 0 && (
            <span className="chip-info">
              {activeFilterCount} active filter{activeFilterCount > 1 ? 's' : ''}
            </span>
          )}
          <button onClick={() => setFilters({})} className="btn-ghost">
            <MaterialIcon name="close" size={15} />
            Reset
          </button>
        </div>
      </div>

      {/* ── KPI row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard
          label="Total Customers"
          caption="Active subscriptions in scope"
          value={fmt.num(kpis.totalCustomers)}
          icon="groups"
          accent="cyan"
          spark={historySpark}
          delta={{ text: '+2.4% vs last mo', direction: 'up', good: true }}
        />
        <KpiCard
          label="Churn Rate"
          caption={`Target ${fmt.pct(kpis.churnRateTarget)}`}
          value={fmt.pct(kpis.churnRate)}
          icon="trending_down"
          accent="rose"
          spark={driverSpark}
          badge={{ text: 'Above target', tone: 'crit' }}
          delta={{ text: '+1.1 pts vs target', direction: 'up' }}
        />
        <KpiCard
          label="High-Risk Accounts"
          caption={`${fmt.num(kpis.actionNeededCount)} need action now`}
          value={fmt.num(kpis.highRiskCount)}
          icon="warning"
          accent="amber"
          badge={{ text: '≥ 70% prob', tone: 'warn' }}
          delta={{ text: 'Immediate outreach', direction: 'flat' }}
        />
        <KpiCard
          label="Revenue at Risk"
          caption={`${fmt.pct(kpis.revenueAtRiskShare)} of baseline MRR`}
          value={fmt.moneyCompact(kpis.revenueAtRisk)}
          icon="payments"
          accent="violet"
          spark={historySpark.slice(-8).map((v) => v * (1 + Math.random() * 0.02 - 0.01))}
          delta={{ text: 'Exposed MRR', direction: 'flat' }}
        />
        <KpiCard
          label="Next-Month Forecast"
          caption={`${fmt.moneyCompact(kpis.nextMonthLower)} – ${fmt.moneyCompact(kpis.nextMonthUpper)}`}
          value={fmt.moneyCompact(kpis.nextMonthForecast)}
          icon="trending_up"
          accent="emerald"
          spark={[...historySpark.slice(-6), kpis.nextMonthForecast]}
          badge={{ text: 'P95', tone: 'ok' }}
          delta={{ text: `${kpis.mrrGrowth >= 0 ? '+' : ''}${fmt.pctRaw(kpis.mrrGrowth * 100)} MoM`, direction: kpis.mrrGrowth >= 0 ? 'up' : 'down', good: kpis.mrrGrowth >= 0 }}
        />
      </div>

      {/* ── Forecast + drivers ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Forecast */}
        <section className="xl:col-span-7 card p-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="tile-cyan !w-8 !h-8 rounded-lg">
                  <MaterialIcon name="monitoring" size={17} />
                </span>
                <h2 className="panel-title">Sales Forecast</h2>
              </div>
              <p className="panel-sub mt-1">
                Actual vs predicted revenue with {100 - 5}% confidence interval
                {datasets && (
                  <span className="ml-1.5 font-mono text-[10px] text-faint">
                    · {datasets.sales.name}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl">
              {RANGES.map((r) => (
                <button key={r} onClick={() => setRange(r)} className={range === r ? 'seg-active' : 'seg-idle'}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] font-semibold">
            {[
              { c: 'text-slate-500', label: 'Historical' },
              { c: 'text-accent-blue', label: 'Forecast' },
              { c: 'text-violet-400', label: '95% band' },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1.5 text-muted">
                <span className={`w-3 h-0.5 rounded-full bg-current ${l.c}`} />
                {l.label}
              </span>
            ))}
            <span className="ml-auto chip-ok">
              <MaterialIcon name="check_circle" size={12} />
              RMSE ±{kpis.rmseVariance}%
            </span>
          </div>

          <div className="mt-3 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="fcBand" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="fcLine" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#2563EB" />
                    <stop offset="100%" stopColor="#7C3AED" />
                  </linearGradient>
                  <linearGradient id="actLine" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#94A3B8" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} dy={4} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => '$' + (v / 1e6).toFixed(1) + 'M'}
                  width={52}
                />
                <Tooltip
                  formatter={(v: number, n: string) => [fmt.money(v), n]}
                  contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px -8px rgba(15,23,42,0.2)' }}
                />
                <ReferenceLine
                  x={lastActual?.label}
                  stroke="#A78BFA"
                  strokeDasharray="4 4"
                  label={{ value: 'FORECAST', position: 'top', fontSize: 10, fill: '#7C3AED', fontWeight: 700 }}
                />
                <Area dataKey="upper" name="Upper 95%" stroke="none" fill="url(#fcBand)" connectNulls />
                <Area dataKey="lower" name="Lower 95%" stroke="none" fill="#FFFFFF" fillOpacity={1} connectNulls />
                <Line dataKey="actual" name="Actual" stroke="url(#actLine)" strokeWidth={2.5} dot={false} connectNulls />
                <Line dataKey="forecast" name="Forecast" stroke="url(#fcLine)" strokeWidth={2.5} dot={false} strokeDasharray="5 3" connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Churn drivers */}
        <section className="xl:col-span-5 card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="tile-rose !w-8 !h-8 rounded-lg">
                  <MaterialIcon name="psychology" size={17} />
                </span>
                <h2 className="panel-title">Churn Drivers</h2>
              </div>
              <p className="panel-sub mt-1">SHAP attribution across the scored population</p>
            </div>
            <span className="chip-neutral">SHAP Core</span>
          </div>

          <div className="mt-4 space-y-3.5">
            {drivers.map((d) => {
              const tone = d.impactPct >= 38 ? 'rose' : d.impactPct >= 18 ? 'amber' : 'cyan';
              const bar =
                tone === 'rose'
                  ? 'from-rose-400 to-accent-rose'
                  : tone === 'amber'
                    ? 'from-amber-300 to-accent-amber'
                    : 'from-cyan-300 to-accent-cyan';
              return (
                <div key={d.feature}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-semibold text-ink truncate">{d.label}</p>
                    <span
                      className={`text-[13px] font-bold shrink-0 ${
                        tone === 'rose' ? 'text-accent-rose' : tone === 'amber' ? 'text-accent-amber' : 'text-accent-cyan'
                      }`}
                    >
                      +{d.impactPct}%
                    </span>
                  </div>
                  <div className="meter mt-1.5">
                    <span className={`bg-gradient-to-r ${bar}`} style={{ width: `${Math.min(100, d.impactPct * 2.2)}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-muted">
                    <span>{fmt.num(d.segmentCount)} accounts</span>
                    <span>odds {d.oddsRatio}×</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn-secondary w-full justify-center mt-5">
            View feature dependency matrix
            <MaterialIcon name="arrow_forward" size={15} />
          </button>
        </section>
      </div>

      {/* ── Business impact simulator ────────────────────────── */}
      <section className="card p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-4 border-b border-hairline-soft">
          <div>
            <div className="flex items-center gap-2">
              <span className="tile-blue !w-8 !h-8 rounded-lg">
                <MaterialIcon name="tune" size={17} />
              </span>
              <h2 className="panel-title">Business Impact Simulator</h2>
            </div>
            <p className="panel-sub mt-1">Model revenue savings by tuning the retention lift target</p>
          </div>
          <button className="btn-primary">
            <MaterialIcon name="campaign" size={16} />
            Launch retention campaign
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 xl:grid-cols-12 gap-5 items-center">
          {/* Slider */}
          <div className="xl:col-span-4 card-inset p-5">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-ink">Retention Lift</p>
              <span className="chip-info">{lift}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={25}
              step={1}
              value={lift}
              onChange={(e) => setLift(Number(e.target.value))}
              className="slider mt-4"
            />
            <div className="flex justify-between mt-2 text-[11px] text-muted font-semibold">
              <span>1%</span>
              <span>5%</span>
              <span>15%</span>
              <span>25%</span>
            </div>
            <p className="mt-4 pt-3 border-t border-hairline text-[11px] text-muted leading-relaxed">
              Calculated against the {fmt.num(data.retentionBase.highRiskCount)} detected high-risk accounts.
              Baseline MRR {fmt.money(data.retentionBase.baselineMrr)}.
            </p>
          </div>

          {/* Outputs */}
          <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[
              { label: 'Potential Revenue Saved', value: fmt.moneyCompact(sim?.protectedMrr ?? 0), sub: 'per month', accent: 'emerald' as const, icon: 'savings' },
              { label: 'Annualised', value: fmt.moneyCompact(sim?.protectedAnnual ?? 0), sub: '12-mo run rate', accent: 'blue' as const, icon: 'calendar_month' },
              { label: 'Accounts Retained', value: String(sim?.preventedAccounts ?? 0), sub: 'per month', accent: 'violet' as const, icon: 'group_add' },
              { label: 'Program ROI', value: `${sim?.roi ?? 0}×`, sub: `on ${fmt.moneyCompact(sim?.campaignCost ?? 0)} spend`, accent: 'amber' as const, icon: 'rocket_launch' },
            ].map((m) => (
              <div key={m.label} className="card-inset p-4 flex flex-col gap-2">
                <p className="micro-label">{m.label}</p>
                <div className="flex items-end justify-between gap-2">
                  <span className="kpi-value text-ink">{m.value}</span>
                  <span className={m.accent === 'emerald' ? 'tile-emerald !w-7 !h-7 rounded-lg' : m.accent === 'blue' ? 'tile-blue !w-7 !h-7 rounded-lg' : m.accent === 'violet' ? 'tile-violet !w-7 !h-7 rounded-lg' : 'tile-amber !w-7 !h-7 rounded-lg'}>
                    <MaterialIcon name={m.icon} size={15} />
                  </span>
                </div>
                <p className="text-[11px] text-muted">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cohorts ──────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-hairline-soft">
          <div>
            <h2 className="panel-title">High-Impact Cohorts</h2>
            <p className="panel-sub mt-0.5">Segmented by estimated salvageable value</p>
          </div>
          <button className="btn-ghost">
            View all segments
            <MaterialIcon name="arrow_forward" size={15} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="th">Cohort</th>
                <th className="th text-right">Accounts</th>
                <th className="th text-right">Mean Probability</th>
                <th className="th text-right">Exposed MRR</th>
                <th className="th">Playbook</th>
                <th className="th text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => {
                const hot = c.meanProb >= 0.7;
                return (
                  <tr key={c.spec} className="row-hover border-t border-hairline-soft">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <span className={`dot ${hot ? 'bg-accent-rose' : 'bg-accent-amber'}`} />
                        <span className="font-semibold">{c.spec}</span>
                      </div>
                    </td>
                    <td className="td text-right font-semibold">{fmt.num(c.accounts)}</td>
                    <td className="td text-right">
                      <span className={`font-bold ${hot ? 'text-accent-rose' : 'text-accent-amber'}`}>
                        {fmt.pct(c.meanProb)}
                      </span>
                    </td>
                    <td className="td text-right font-semibold">{fmt.money(c.exposedMrr)}</td>
                    <td className="td text-muted">{c.playbook}</td>
                    <td className="td text-right">
                      <button className="btn-primary !h-8 !px-3 !text-[11px]">Execute</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const TENCURE_LABEL: Record<string, string> = {
  All: 'All',
  '<6': '< 6 mo',
  '6-12': '6–12 mo',
  '12-24': '12–24 mo',
  '24+': '24+ mo',
};