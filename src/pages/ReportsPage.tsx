import { useQuery } from '@tanstack/react-query';
import { api, fmt } from '../services/api';
import MaterialIcon from '../components/MaterialIcon';
import ErrorState from '../components/ErrorState';
import { PageSkeleton } from '../components/Skeleton';

const REPORTS = [
  { name: 'Monthly Executive Intelligence Brief', type: 'PDF', desc: 'KPI summary, churn drivers, forecast and retention recommendations for leadership.', date: '2 hours ago', size: '2.4 MB' },
  { name: 'Q3 Churn Vulnerability Deck', type: 'PPTX', desc: 'Cohort-level churn analysis with SHAP driver attribution and playbook triggers.', date: 'Yesterday', size: '5.1 MB' },
  { name: 'SOC 2 Pack', type: 'PDF', desc: 'Model governance, validation reports and audit trail for compliance review.', date: '3 days ago', size: '1.8 MB' },
  { name: 'Forecast Model Card', type: 'XLSX', desc: 'Holdout backtest metrics, residual analysis and feature importance weights.', date: 'Aug 18', size: '840 KB' },
  { name: 'Cohort Retention Analysis', type: 'PDF', desc: 'High-impact cohort segmentation with salvageable revenue estimates.', date: 'Aug 17', size: '1.2 MB' },
  { name: 'Data Drift Audit', type: 'PDF', desc: 'Population stability index across all monitored features with trend analysis.', date: 'Aug 15', size: '620 KB' },
];

const PIPELINES = [
  { name: 'Slack Webhook Streams', desc: 'Real-time churn alerts to #revenue-ops', status: 'Active', icon: 'forum' },
  { name: 'Executive Email Digest', desc: 'Weekly Mon 8:00 AM UTC (14 recipients)', status: 'Active', icon: 'mail' },
  { name: 'Warehouse Ingestion Sync', desc: 'Snowflake / BigQuery daily at 02:00 UTC', status: 'Active', icon: 'cloud_sync' },
];

export default function ReportsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['datasets'],
    queryFn: api.datasets,
  });

  if (isLoading) return <PageSkeleton />;
  if (isError) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        <ErrorState message="Unable to load reports." onRetry={() => refetch()} />
      </div>
    );
  }

  const downloadReport = () => {
    const a = document.createElement('a');
    a.href = api.generateReport();
    a.download = 'prism_executive_brief.csv';
    a.click();
  };

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-5 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-primary uppercase mb-1">
            <span>Telemetry Workspace</span>
            <span className="text-outline-variant">•</span>
            <span className="text-on-surface-variant font-medium">Production Inference Engine v4.2</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Predictive Reports &amp; Briefs</h1>
          <p className="text-xs text-on-surface-variant mt-1">Generated from the active dataset with full model provenance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <MaterialIcon name="schedule" size={16} className="text-on-surface-variant" />
            Schedule Recurring Brief
          </button>
          <button onClick={downloadReport} className="btn-primary">
            <MaterialIcon name="add" size={16} />
            New Custom Report
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-on-surface-variant mb-1">
            <MaterialIcon name="timer" size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Projected Net ARR</span>
          </div>
          <p className="text-xl font-bold text-on-surface font-mono">{fmt.moneyCompact(data?.salesHistory.rows ? 1126346 : 0)}</p>
          <p className="text-[11px] text-emerald-700 font-medium">88.4% Confidence Interval</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-on-surface-variant mb-1">
            <MaterialIcon name="savings" size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Salvaged Exposure</span>
          </div>
          <p className="text-xl font-bold text-on-surface font-mono">742 accounts</p>
          <p className="text-[11px] text-on-surface-variant">Proactive playbook execution</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-on-surface-variant mb-1">
            <MaterialIcon name="sync_alt" size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Stability Index</span>
          </div>
          <p className="text-xl font-bold text-on-surface font-mono">0.08</p>
          <p className="text-[11px] text-emerald-700 font-medium">PSI Optimal — No covariate divergence</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-on-surface-variant mb-1">
            <MaterialIcon name="dataset" size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Dataset</span>
          </div>
          <p className="text-sm font-bold text-on-surface truncate">{data?.active.name}</p>
          <p className="text-[11px] text-on-surface-variant">{fmt.num(data?.active.rows ?? 0)} records</p>
        </div>
      </div>

      {/* Report list */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 bg-surface-container-low">
          <h3 className="text-sm font-semibold text-on-surface">Generated Reports</h3>
        </div>
        <div className="divide-y divide-surface-container">
          {REPORTS.map((r) => (
            <div key={r.name} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-surface-container-low/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
                  <MaterialIcon name="description" size={18} className="text-on-surface-variant" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-on-surface truncate">{r.name}</p>
                    <span className="chip-info shrink-0">{r.type}</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant truncate">{r.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] text-on-surface-variant hidden sm:block">{r.date}</span>
                <button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant" title="Download">
                  <MaterialIcon name="download" size={16} />
                </button>
                <button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant" title="Share">
                  <MaterialIcon name="send" size={16} />
                </button>
                <button className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant" title="More">
                  <MaterialIcon name="more_vert" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery pipelines */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">Delivery Pipelines</h3>
            <p className="text-[11px] text-on-surface-variant">3 Active</p>
          </div>
          <button className="btn-ghost text-[11px]">
            <MaterialIcon name="add_link" size={14} />
            Configure New Integration
          </button>
        </div>
        <div className="space-y-2.5">
          {PIPELINES.map((p) => (
            <div key={p.name} className="flex items-center justify-between bg-surface-container-low rounded-lg px-3.5 py-2.5">
              <div className="flex items-center gap-3">
                <MaterialIcon name={p.icon} size={18} className="text-primary" />
                <div>
                  <p className="text-xs font-semibold text-on-surface">{p.name}</p>
                  <p className="text-[11px] text-on-surface-variant">{p.desc}</p>
                </div>
              </div>
              <span className="chip-healthy">{p.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
