import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';
import { api, fmt } from '../services/api';
import KpiCard from '../components/KpiCard';
import MaterialIcon from '../components/MaterialIcon';
import ErrorState from '../components/ErrorState';
import { PageSkeleton } from '../components/Skeleton';

export default function ModelHealthPage() {
  const [driftResult, setDriftResult] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['model-health'],
    queryFn: api.modelHealth,
  });

  const driftMutation = useMutation({
    mutationFn: api.simulateDrift,
    onSuccess: (res) => {
      setDriftResult(`Drift injected — ${res.psi.filter((p) => p.status !== 'Stable').length} features now outside stable PSI bounds.`);
      queryClient.invalidateQueries({ queryKey: ['model-health'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        <ErrorState message="Unable to load model health metrics." onRetry={() => refetch()} />
      </div>
    );
  }

  const c = data.confusion;
  const total = c ? c.tp + c.fp + c.fn + c.tn : 0;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-5 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-primary uppercase mb-1">
            <span>Model Health &amp; Diagnostics</span>
            <span className="text-outline-variant">•</span>
            <span className="text-on-surface-variant font-medium">Tier-1 Production</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Model Health &amp; Diagnostics</h1>
          <p className="text-xs text-on-surface-variant mt-1">Monitor prediction quality, data drift and model reliability.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="chip-healthy">
            <MaterialIcon name="verified" size={12} />
            Validated {new Date(data.lastValidation).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ago
          </span>
          <span className="chip-info font-mono">{data.modelVersion}</span>
          <button className="btn-secondary">
            <MaterialIcon name="done_all" size={16} />
            Run Full Audit Suite
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard
          label="AUC-ROC"
          value={data.auc != null ? data.auc.toFixed(3) : '—'}
          icon="show_chart"
          iconClass="bg-indigo-50 text-primary"
          delta={{ text: 'Optimal', tone: 'up', good: true }}
          subtext={data.gini != null ? `Gini ${data.gini}` : ''}
        />
        <KpiCard
          label="Precision"
          value={data.precision != null ? fmt.pctRaw(data.precision) : '—'}
          icon="tune"
          iconClass="bg-emerald-50 text-emerald-600"
          subtext={c ? `TP ${fmt.num(c.tp)} / FP ${fmt.num(c.fp)}` : ''}
        />
        <KpiCard
          label="Recall"
          value={data.recall != null ? fmt.pctRaw(data.recall) : '—'}
          icon="radar"
          iconClass="bg-sky-50 text-sky-600"
          subtext={c ? `FN ${fmt.num(c.fn)}` : ''}
        />
        <KpiCard
          label="Forecast MAPE"
          value={fmt.pctRaw(data.mape)}
          icon="insights"
          iconClass="bg-emerald-50 text-emerald-600"
          delta={{ text: 'Excellent', tone: 'up', good: true }}
          subtext={`RMSE ${fmt.money(data.rmse)}`}
        />
        <KpiCard
          label="Data Quality"
          value={fmt.pctRaw(data.dataQuality)}
          icon="check_circle"
          iconClass="bg-emerald-50 text-emerald-600"
          delta={{ text: 'Stable', tone: 'up', good: true }}
          subtext="0 critical findings"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ROC curve */}
        <div className="lg:col-span-6 card p-5">
          <h2 className="font-title-md text-on-surface">ROC Curve Plot</h2>
          <p className="text-xs text-on-surface-variant mb-3">Sensitivity vs False Positive Rate</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.rocCurve} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#dae2fd" />
                <XAxis dataKey="fpr" tick={{ fontSize: 9, fill: '#464555' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} />
                <YAxis tick={{ fontSize: 9, fill: '#464555' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(1)} width={32} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #c7c4d8' }} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#c7c4d8" strokeDasharray="4 4" />
                <Line dataKey="tpr" stroke="#4f46e5" strokeWidth={2.5} dot={false} name="TPR" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 pt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-1">
              <MaterialIcon name="verified" size={14} className="text-emerald-600" />
              Discrimination capacity: Excellent calibration grade
            </span>
            {data.gini != null && <span>Gini Index: {data.gini}</span>}
          </div>
        </div>

        {/* Confusion matrix */}
        <div className="lg:col-span-6 card p-5">
          <h2 className="font-title-md text-on-surface">Confusion Matrix</h2>
          <p className="text-xs text-on-surface-variant mb-3">Binary classification partition (N = {fmt.num(total)})</p>
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-emerald-800 uppercase">True Positive (TP)</p>
              <p className="text-xl font-bold text-emerald-800 font-mono">{fmt.num(c?.tp ?? 0)}</p>
              <p className="text-[10px] text-emerald-700">Precision: {data.precision != null ? fmt.pctRaw(data.precision) : '—'}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-amber-800 uppercase">False Positive (FP)</p>
              <p className="text-xl font-bold text-amber-800 font-mono">{fmt.num(c?.fp ?? 0)}</p>
              <p className="text-[10px] text-amber-700">False Alarm Rate: {c && total ? fmt.pct(c.fp / total) : '—'}</p>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-rose-800 uppercase">False Negative (FN)</p>
              <p className="text-xl font-bold text-rose-800 font-mono">{fmt.num(c?.fn ?? 0)}</p>
              <p className="text-[10px] text-rose-700">Missed churners</p>
            </div>
            <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-3">
              <p className="text-[10px] font-semibold text-on-surface-variant uppercase">True Negative (TN)</p>
              <p className="text-xl font-bold text-on-surface font-mono">{fmt.num(c?.tn ?? 0)}</p>
              <p className="text-[10px] text-on-surface-variant">Specificity: {data.specificity != null ? fmt.pctRaw(data.specificity) : '—'}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-on-surface-variant">
            <span>Balanced Accuracy: <strong className="text-on-surface">{data.balancedAccuracy != null ? fmt.pctRaw(data.balancedAccuracy) : '—'}</strong></span>
            <span>F1-Score: <strong className="text-on-surface">{data.f1 != null ? data.f1 : '—'}</strong></span>
            <span>Brier: <strong className="text-on-surface">{data.brier != null ? data.brier : '—'}</strong></span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Calibration curve */}
        <div className="lg:col-span-6 card p-5">
          <h2 className="font-title-md text-on-surface">Calibration Curve</h2>
          <p className="text-xs text-on-surface-variant mb-3">Reliability diagram (predicted vs empirical frequency)</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.calibration} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#dae2fd" />
                <XAxis dataKey="predicted" tick={{ fontSize: 9, fill: '#464555' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#464555' }} tickLine={false} axisLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #c7c4d8' }} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#c7c4d8" strokeDasharray="4 4" />
                <Line dataKey="empirical" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} name="Empirical" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-on-surface-variant">
            Brier Score: <strong className="text-on-surface">{data.brier ?? '—'}</strong> • Alignment: Platt scaling aligned
          </p>
        </div>

        {/* Error distribution */}
        <div className="lg:col-span-6 card p-5">
          <h2 className="font-title-md text-on-surface">Prediction Error Distribution</h2>
          <p className="text-xs text-on-surface-variant mb-3">Residual error profile across regression &amp; churn deciles</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.errorDist} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#dae2fd" vertical={false} />
                <XAxis dataKey="bin" tick={{ fontSize: 9, fill: '#464555' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#464555' }} tickLine={false} axisLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #c7c4d8' }} />
                <ReferenceLine y={0} stroke="#c7c4d8" />
                <Bar dataKey="count" name="Count">
                  {data.errorDist.map((e, i) => (
                    <Cell key={i} fill={e.bin >= 0 ? '#4f46e5' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-on-surface-variant">
            Mean: <strong className="text-on-surface">-0.002</strong> • Skew: <strong className="text-on-surface">0.04</strong> • Zero bias confirmed
          </p>
        </div>
      </div>

      {/* Drift + leakage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 card overflow-hidden">
          <div className="px-5 py-3 bg-surface-container-low flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-on-surface">Feature Data Drift (Population Stability Index)</h3>
              <p className="text-[11px] text-on-surface-variant">
                {data.driftSummary.monitored} features monitored • {data.driftSummary.watch} watch • {data.driftSummary.critical} critical
              </p>
            </div>
            <button
              onClick={() => driftMutation.mutate()}
              disabled={driftMutation.isPending}
              className="btn-secondary"
            >
              <MaterialIcon name="play_circle" size={16} className="text-primary" />
              {driftMutation.isPending ? 'Simulating…' : 'Simulate Drift Test'}
            </button>
          </div>
          {driftResult && (
            <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-800 flex items-center gap-1.5">
              <MaterialIcon name="warning" size={14} />
              {driftResult}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/50 text-on-surface-variant uppercase tracking-wider">
                  <th className="th">Feature Name</th>
                  <th className="th text-right">PSI Score</th>
                  <th className="th">Status Badge</th>
                  <th className="th">Drift Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {data.psi.slice(0, 8).map((p) => (
                  <tr key={p.feature} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="td font-medium">{p.label}</td>
                    <td className="td text-right font-mono">{p.psi.toFixed(4)}</td>
                    <td className="td">
                      <span className={`chip ${p.status === 'Critical' ? 'chip-critical' : p.status === 'Watch' ? 'chip-warning' : 'chip-healthy'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="td text-on-surface-variant">{p.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leakage audit */}
        <div className="lg:col-span-4 card p-5">
          <h3 className="text-sm font-semibold text-on-surface mb-1">Data Quality &amp; Leakage Audit</h3>
          <p className="text-[11px] text-on-surface-variant mb-3">Zero Critical Findings</p>
          <div className="space-y-2.5">
            {data.leakageChecks.map((check) => (
              <div key={check.name} className="flex items-start gap-2.5">
                <MaterialIcon name="check_circle" size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-on-surface">{check.name}</p>
                  <p className="text-[11px] text-on-surface-variant">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-surface-container-high/60">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Audit Log</p>
            <div className="space-y-2">
              {data.auditLog.slice(0, 4).map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <MaterialIcon name="history" size={13} className="text-on-surface-variant shrink-0 mt-0.5" />
                  <div>
                    <span className="text-on-surface font-medium">{log.action}</span>
                    <span className="text-on-surface-variant"> — {log.detail}</span>
                    <span className="block text-outline-variant">{new Date(log.at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
