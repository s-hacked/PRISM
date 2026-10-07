import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { api, fmt } from '../services/api';
import KpiCard from '../components/KpiCard';
import MaterialIcon from '../components/MaterialIcon';
import ErrorState from '../components/ErrorState';
import { PageSkeleton, ChartSkeleton } from '../components/Skeleton';

const HORIZONS = [
  { value: 1, label: '1 Month' },
  { value: 3, label: '3 Months' },
  { value: 6, label: '6 Months' },
];
const CONFIDENCES = [
  { value: 80, label: '80% CI' },
  { value: 95, label: '95% CI' },
];

export default function ForecastPage() {
  const [horizon, setHorizon] = useState(3);
  const [confidence, setConfidence] = useState(95);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['forecast', horizon, confidence],
    queryFn: () => api.forecast(horizon, confidence),
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        <ErrorState message="Unable to load the forecast. Upload a sales history CSV to activate the forecasting engine." onRetry={() => refetch()} />
      </div>
    );
  }

  const chartData = [
    ...data.history.map((h) => ({ ...h, type: 'actual' })),
    ...data.holdoutSeries.map((h) => ({ ...h, type: 'holdout' })),
    ...data.future.map((f) => ({ ...f, type: 'forecast' })),
  ];
  const lastActual = data.history[data.history.length - 1];
  const nm = data.nextMonth;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-5 animate-fade-in">
      {/* Title + controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-primary uppercase mb-1">
            <span>Financial Telemetry &amp; Inference</span>
            <span className="text-outline-variant">•</span>
            <span className="text-on-surface-variant font-medium">Production Node #04</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Sales Forecast</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Trained Model: Holt Linear Trend • Holdout-verified backtest
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Horizon</span>
            <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/30">
              {HORIZONS.map((h) => (
                <button
                  key={h.value}
                  onClick={() => setHorizon(h.value)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${horizon === h.value ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Confidence</span>
            <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/30">
              {CONFIDENCES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setConfidence(c.value)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${confidence === c.value ? 'bg-surface-container-lowest text-primary font-semibold shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn-secondary">
            <MaterialIcon name="file_download" size={16} className="text-on-surface-variant" />
            Export Forecast CSV
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Next Month Forecast"
          value={fmt.moneyCompact(nm.point)}
          icon="insights"
          iconClass="bg-indigo-50 text-primary"
          subtext={nm.label}
        />
        <KpiCard
          label="Expected Range"
          value={`${fmt.moneyCompact(nm.lower)} – ${fmt.moneyCompact(nm.upper)}`}
          icon="tune"
          iconClass="bg-surface-container text-on-surface-variant"
          subtext={`${confidence}% prediction interval`}
        />
        <KpiCard
          label="Model MAPE"
          value={fmt.pctRaw(data.metrics.mape)}
          icon="precision_manufacturing"
          iconClass="bg-emerald-50 text-emerald-600"
          delta={{ text: 'Excellent', tone: 'up', good: true }}
          subtext={`Holdout backtest (${data.metrics.holdoutSize} months)`}
        />
        <KpiCard
          label="Baseline Improvement"
          value={`${data.metrics.baselineImprovement >= 0 ? '+' : ''}${data.metrics.baselineImprovement}%`}
          icon="trending_up"
          iconClass="bg-emerald-50 text-emerald-600"
          delta={{ text: 'vs naive baseline', tone: 'neutral' }}
          subtext={`RMSE ${fmt.money(data.metrics.rmse)}`}
        />
      </div>

      {/* Trajectory chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-title-md text-on-surface">Projected Revenue Trajectory &amp; Residual Bands</h2>
            <p className="text-xs text-on-surface-variant">Holdout-verified fit with {confidence}% confidence interval</p>
          </div>
          <span className="chip-info">Holdout Verified</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 mb-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-outline" />
            <span className="text-on-surface-variant">Historical Actuals</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-sky-500" />
            <span className="text-on-surface-variant">Holdout Fit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-primary-container" />
            <span className="text-on-surface">Forecast</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-primary-fixed rounded-xs" />
            <span className="text-on-surface-variant">{confidence}% Confidence Band</span>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#dae2fd" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#464555' }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: '#464555' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => '$' + (v / 1e6).toFixed(1) + 'M'}
                width={48}
              />
              <Tooltip
                formatter={(value: number, name: string) => [fmt.money(value), name]}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #c7c4d8' }}
              />
              <ReferenceLine
                x={lastActual?.label}
                stroke="#3525cd"
                strokeDasharray="3 3"
                label={{ value: 'FORECAST HORIZON', position: 'top', fontSize: 9, fill: '#3525cd', fontWeight: 600 }}
              />
              <Area dataKey="upper" stroke="none" fill="#dad7ff" fillOpacity={0.5} name="Upper bound" />
              <Area dataKey="lower" stroke="none" fill="#ffffff" fillOpacity={1} name="Lower bound" />
              <Line dataKey="actual" stroke="#777587" strokeWidth={2.5} dot={false} name="Historical" connectNulls />
              <Line dataKey="holdout" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="2 2" dot={false} name="Holdout fit" connectNulls />
              <Line dataKey="forecast" stroke="#4f46e5" strokeWidth={2.5} strokeDasharray="4 2" dot={false} name="Forecast" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Confidence dispersion */}
        <div className="lg:col-span-5 card p-5">
          <h2 className="font-title-md text-on-surface">Confidence Dispersion Curve</h2>
          <p className="text-xs text-on-surface-variant mb-3">Density of probable outcomes for next period revenue targets.</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.density.points} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#dae2fd" vertical={false} />
                <XAxis dataKey="x" tick={{ fontSize: 9, fill: '#464555' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => '$' + (v / 1e6).toFixed(1) + 'M'} width={48} />
                <YAxis tick={{ fontSize: 9, fill: '#464555' }} tickLine={false} axisLine={false} width={32} />
                <Tooltip formatter={(value: number, name: string) => [value, name]} contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #c7c4d8' }} />
                <Area dataKey="y" stroke="#4f46e5" fill="#dad7ff" fillOpacity={0.6} name="Density" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="bg-surface-container-low rounded-lg p-2">
              <p className="text-[10px] text-on-surface-variant">P10 Pessimistic</p>
              <p className="text-xs font-bold text-on-surface">{fmt.moneyCompact(data.density.p10)}</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-2">
              <p className="text-[10px] text-on-surface-variant">P50 Expected</p>
              <p className="text-xs font-bold text-primary">{fmt.moneyCompact(data.density.p50)}</p>
            </div>
            <div className="bg-surface-container-low rounded-lg p-2">
              <p className="text-[10px] text-on-surface-variant">P90 Optimistic</p>
              <p className="text-xs font-bold text-on-surface">{fmt.moneyCompact(data.density.p90)}</p>
            </div>
          </div>
        </div>

        {/* Feature importances */}
        <div className="lg:col-span-7 card p-5">
          <h2 className="font-title-md text-on-surface">Feature Importances</h2>
          <p className="text-xs text-on-surface-variant mb-4">Primary weighted drivers influencing projections.</p>
          <div className="space-y-4">
            {data.featureImportance.map((f) => (
              <div key={f.feature}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-on-surface font-semibold">{f.feature}</span>
                  <span className="text-on-surface-variant font-semibold">{f.pct}%</span>
                </div>
                <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-primary-container" style={{ width: `${Math.min(100, f.pct * 2.5)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Granular forecast table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 bg-surface-container-low flex items-center justify-between">
          <h3 className="text-sm font-semibold text-on-surface">Granular Forecast Table</h3>
          <button className="btn-ghost text-[11px]">
            <MaterialIcon name="file_download" size={14} />
            Download All Data
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant uppercase tracking-wider">
                <th className="th">Forecast Month</th>
                <th className="th text-right">Point Forecast</th>
                <th className="th text-right">Lower Bound ({confidence}%)</th>
                <th className="th text-right">Upper Bound ({confidence}%)</th>
                <th className="th text-right">Baseline Naive</th>
                <th className="th text-right">Variance / Lift</th>
                <th className="th text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {data.future.map((f) => {
                const point = f.forecast ?? 0;
                const lower = f.lower ?? 0;
                const upper = f.upper ?? 0;
                const naive = f.baselineNaive ?? 0;
                const lift = naive > 0 ? ((point - naive) / naive) * 100 : 0;
                return (
                  <tr key={f.month} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="td font-medium">{f.label}</td>
                    <td className="td text-right font-mono font-bold text-on-surface">{fmt.money(point)}</td>
                    <td className="td text-right font-mono text-on-surface-variant">{fmt.money(lower)}</td>
                    <td className="td text-right font-mono text-on-surface-variant">{fmt.money(upper)}</td>
                    <td className="td text-right font-mono text-on-surface-variant">{fmt.money(naive)}</td>
                    <td className={`td text-right font-mono font-semibold ${lift >= 0 ? 'text-emerald-700' : 'text-error'}`}>
                      {lift >= 0 ? '+' : ''}{lift.toFixed(1)}%
                    </td>
                    <td className="td text-right">
                      <button className="px-2.5 py-1 bg-primary-container text-on-primary rounded text-[11px] font-semibold hover:bg-primary transition-colors">
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
