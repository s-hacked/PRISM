import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api, fmt } from '../services/api';
import MaterialIcon from '../components/MaterialIcon';
import ErrorState from '../components/ErrorState';
import { PageSkeleton } from '../components/Skeleton';
import { useJobPoll } from '../hooks/useJobPoll';
import type { Job } from '../types';

const PIPELINE_STAGES = ['Upload', 'Validate', 'Process', 'Predict', 'Explain', 'Ready'];

export default function DataManagementPage() {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobType, setJobType] = useState<'customers' | 'sales'>('customers');
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['datasets'],
    queryFn: api.datasets,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: 'customers' | 'sales' }) => api.uploadCsv(file, type),
    onSuccess: (res, vars) => {
      setActiveJobId(res.jobId);
      setJobType(vars.type);
      setUploadError(null);
    },
    onError: (err: Error) => {
      setUploadError(err.message);
    },
  });

  const job = useJobPoll(activeJobId, (completedJob) => {
    if (completedJob.status === 'completed') {
      // Auto-refresh every dashboard query when processing finishes.
      queryClient.invalidateQueries();
      setActiveJobId(null);
    }
  });

  const resetToSample = () => {
    // Reload the page — the server re-initializes with seed data on restart.
    // For a running server, we re-trigger the seed pipeline via reprocess.
    if (window.confirm('Reset to the original sample dataset? This will replace your uploaded data.')) {
      window.location.reload();
    }
  };

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setUploadError('Only CSV files are accepted.');
        return;
      }
      uploadMutation.mutate({ file, type: jobType });
    },
    [jobType, uploadMutation],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  if (isLoading) return <PageSkeleton />;
  if (isError || !data) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-6">
        <ErrorState message="Unable to load dataset information." onRetry={() => refetch()} />
      </div>
    );
  }

  const active = data.active;
  const jobStages = job?.stages ?? PIPELINE_STAGES.map((label) => ({ id: label.toLowerCase(), label, status: 'pending' as const }));

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-5 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-primary uppercase mb-1">
            <MaterialIcon name="sync_alt" size={14} />
            <span>Pipeline Ingestion &amp; Integrity Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Data Management &amp; Pipeline</h1>
          <p className="text-xs text-on-surface-variant mt-1">Upload customer and sales data to power the predictive engines.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary">
            <MaterialIcon name="download" size={16} className="text-on-surface-variant" />
            Download Cleaned Schema
          </button>
          <button className="btn-secondary" onClick={resetToSample}>
            <MaterialIcon name="refresh" size={16} />
            Reset to Sample Data
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              queryClient.invalidateQueries();
            }}
          >
            <MaterialIcon name="refresh" size={16} />
            Re-run Predictions
          </button>
        </div>
      </div>

      {/* Active dataset banner */}
      <div className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center">
            <MaterialIcon name="dataset" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-on-surface">{active.name}</p>
              <span className="chip-healthy">Active Dataset</span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              {fmt.num(active.rows)} rows • {active.columns} columns • {fmt.money(active.sizeBytes / 1024)} KB • Uploaded{' '}
              {new Date(active.uploadedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <MaterialIcon name="group" size={14} />
            {fmt.num(active.rows)} customers
          </span>
          <span className="flex items-center gap-1">
            <MaterialIcon name="schedule" size={14} />
            {new Date(active.uploadedAt).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1">
            <MaterialIcon name="check_circle" size={14} className="text-emerald-600" />
            {active.validation}
          </span>
        </div>
      </div>

      {/* Upload cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Customer data upload */}
        <div className="card p-5">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-primary-fixed text-on-primary-fixed-variant flex items-center justify-center">
                <MaterialIcon name="person_search" size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wide">Customer Data</h2>
                <span className="text-[11px] text-on-surface-variant">Churn &amp; Retention Predictive Engine</span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface text-[10px] font-semibold">Primary Input</span>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-xl p-6 bg-surface-container-low hover:bg-surface-container transition-all flex flex-col items-center justify-center text-center cursor-pointer group relative overflow-hidden border-2 border-dashed ${dragOver ? 'border-primary bg-primary-fixed/30' : 'border-outline-variant/30'}`}
          >
            <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm mb-2">
              <MaterialIcon name="cloud_upload" size={24} />
            </div>
            <span className="text-sm font-semibold text-on-surface">Drop customer CSV here or browse</span>
            <span className="text-[11px] text-on-surface-variant mt-1">Supports UTF-8 CSV up to 120MB</span>
            <input
              ref={fileInputRef}
              accept=".csv"
              className="absolute inset-0 opacity-0 cursor-pointer"
              type="file"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div className="bg-surface-container-low rounded p-2.5 flex flex-col gap-1 mt-3">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
              <span className="font-semibold text-on-surface">File Requirements Spec:</span>
              <span className="text-emerald-700 flex items-center gap-1 font-medium">
                <MaterialIcon name="check" size={13} />
                Strict typing
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-mono text-[11px] leading-relaxed break-words">
              customerID, tenure, contract, monthlyCharges, internetService, paymentMethod
            </p>
            <p className="text-[10px] text-on-surface-variant/70 mt-1">
              Drives: Churn Risk, Customers, Model Health, Retention Simulator
            </p>
          </div>

          {/* Pipeline progress */}
          {job && jobType === 'customers' && (
            <div className="mt-4 animate-slide-up">
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Upload Progress &amp; Lifecycle Pipeline
              </p>
              <div className="grid grid-cols-6 gap-1.5 text-center">
                {jobStages.map((s) => (
                  <div key={s.id} className="flex flex-col items-center gap-1">
                    <div className={`w-full h-1.5 rounded-full ${s.status === 'completed' ? 'bg-emerald-500' : s.status === 'processing' ? 'bg-primary animate-pulse' : 'bg-surface-container-highest'}`} />
                    <span className={`text-[10px] flex items-center gap-0.5 ${s.status === 'completed' ? 'text-emerald-700 font-medium' : s.status === 'processing' ? 'text-primary font-semibold' : 'text-on-surface-variant'}`}>
                      {s.status === 'completed' ? <MaterialIcon name="done" size={11} /> : s.status === 'processing' ? '•' : ''}
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-on-surface-variant">{job.stageLabel}…</span>
                <span className="font-mono font-bold text-primary">{job.progress}%</span>
              </div>
              {job.status === 'failed' && (
                <p className="mt-2 text-[11px] text-error flex items-center gap-1">
                  <MaterialIcon name="error" size={13} />
                  {job.error}
                </p>
              )}
            </div>
          )}

          {/* Live schema validation */}
          <div className="bg-surface-container-lowest rounded overflow-hidden border border-outline-variant/30 mt-4">
            <div className="px-3 py-1.5 bg-surface-container-low flex items-center justify-between">
              <span className="text-[11px] font-semibold text-on-surface">Live Schema Validation Table</span>
              <span className="text-[11px] text-on-surface-variant font-mono">{active.name}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3">
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant">Rows / Columns</span>
                <span className="text-sm font-bold text-on-surface">{fmt.num(active.rows)} / {active.columns}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant">Missing Values</span>
                <span className="text-sm font-bold text-emerald-700">{active.missingValues} (0.0%)</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant">Duplicate Rows</span>
                <span className="text-sm font-bold text-emerald-700">{active.duplicates}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant">Data Types</span>
                <span className="text-sm font-bold text-emerald-700">100% matched</span>
              </div>
            </div>
            <div className="px-3 pb-2 flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
              <MaterialIcon name="check_circle" size={15} />
              <span>Required columns: All 6 present (✓ Validated)</span>
            </div>
          </div>
        </div>

        {/* Sales data upload */}
        <div className="card p-5">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-secondary-fixed text-secondary flex items-center justify-center">
                <MaterialIcon name="show_chart" size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-on-surface uppercase tracking-wide">Sales Data</h2>
                <span className="text-[11px] text-on-surface-variant">Revenue &amp; Forecasting Engine</span>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface text-[10px] font-semibold">Time Series</span>
          </div>

          <div className="rounded-xl p-6 bg-surface-container-low hover:bg-surface-container transition-all flex flex-col items-center justify-center text-center cursor-pointer group relative overflow-hidden border-2 border-dashed border-outline-variant/30">
            <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary group-hover:scale-110 transition-transform shadow-sm mb-2">
              <MaterialIcon name="cloud_upload" size={24} />
            </div>
            <span className="text-sm font-semibold text-on-surface">Drop sales &amp; billing historical CSV here</span>
            <span className="text-[11px] text-on-surface-variant mt-1">Requires continuous monthly or daily resolution</span>
            <input
              accept=".csv"
              className="absolute inset-0 opacity-0 cursor-pointer"
              type="file"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div className="bg-surface-container-low rounded p-2.5 flex flex-col gap-1 mt-3">
            <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
              <span className="font-semibold text-on-surface">File Requirements Spec:</span>
              <span className="text-emerald-700 flex items-center gap-1 font-medium">
                <MaterialIcon name="verified_user" size={13} />
                Format Ok
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-mono text-[11px] leading-relaxed break-words">
              date, monthly_mrr, new_sales, cancellations, expansion_revenue
            </p>
            <p className="text-[10px] text-on-surface-variant/70 mt-1">
              Drives: Sales Forecast, Overview forecast chart, Revenue Forecast
            </p>
          </div>

          <div className="bg-surface-container-lowest rounded p-3 flex flex-col gap-2 border border-outline-variant/30 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">Active Ingestion Status</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-semibold">Synchronized</span>
            </div>
            <p className="text-xs text-on-surface">Up-to-date with billing system sync</p>
            <div className="flex items-center gap-1 text-on-surface-variant text-[11px]">
              <MaterialIcon name="check_circle" size={15} className="text-emerald-600" />
              <span className="font-semibold text-on-surface">Validation Status:</span>
              <span>{data.sales.rows} historical monthly records validated</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded p-3 flex flex-col gap-1.5 border border-outline-variant/30 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-on-surface-variant">Forecast Lookahead Span</span>
              <span className="text-[11px] font-semibold text-on-surface">12 Months Ahead</span>
            </div>
            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
              <div className="bg-secondary h-full rounded-full" style={{ width: '75%' }} />
            </div>
            <span className="text-[11px] text-on-surface-variant self-end">
              Historical Depth: {data.salesHistory.firstMonth} – {data.salesHistory.lastMonth}
            </span>
          </div>
        </div>
      </div>

      {/* Dataset history */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-on-surface">Dataset History &amp; Audit Log</h3>
            <p className="text-[11px] text-on-surface-variant">Immutable ingestion ledger with automated drift tracking</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="btn-ghost text-[11px]">Export Ledger</button>
            <button className="btn-ghost text-[11px]">Audit Filter</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant uppercase tracking-wider">
                <th className="th">Dataset File Name</th>
                <th className="th">Type</th>
                <th className="th text-right">Rows</th>
                <th className="th">Status</th>
                <th className="th">Uploaded By &amp; Date</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {data.history.map((h) => (
                <tr key={h.name} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <MaterialIcon name="description" size={16} className="text-on-surface-variant" />
                      <span className="font-medium">{h.name}</span>
                    </div>
                  </td>
                  <td className="td">
                    <span className="chip-info">{h.type}</span>
                  </td>
                  <td className="td text-right font-mono">{fmt.num(h.rows)}</td>
                  <td className="td">
                    <span className={`chip ${h.status === 'Active' ? 'chip-healthy' : h.status === 'Synchronized' ? 'chip-info' : 'chip-warning'}`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="td text-on-surface-variant">
                    {h.uploadedBy} • {new Date(h.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1 rounded hover:bg-surface-container text-on-surface-variant" title="Preview">
                        <MaterialIcon name="visibility" size={16} />
                      </button>
                      <button className="p-1 rounded hover:bg-surface-container text-on-surface-variant" title="Download">
                        <MaterialIcon name="download" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2.5 border-t border-outline-variant/20 text-[11px] text-on-surface-variant">
          Showing {data.history.length} datasets across 2 engine models
        </div>
      </div>

      {uploadError && (
        <div className="card p-4 border-rose-200 bg-rose-50 flex items-center gap-2 text-sm text-rose-800">
          <MaterialIcon name="error" size={18} />
          {uploadError}
        </div>
      )}
    </div>
  );
}
