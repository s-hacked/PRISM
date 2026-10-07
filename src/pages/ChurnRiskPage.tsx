import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, fmt } from '../services/api';
import KpiCard from '../components/KpiCard';
import MaterialIcon from '../components/MaterialIcon';
import ErrorState from '../components/ErrorState';
import { TableSkeleton } from '../components/Skeleton';
import Drawer from '../components/Drawer';
import type { CustomerRow, CustomerDetail } from '../types';

const RISK_TIERS = ['All', 'Critical', 'High', 'Medium', 'Low'];
const INDUSTRIES = ['All', 'SaaS & Tech', 'Retail & E-commerce', 'Healthcare', 'Financial Services', 'Logistics', 'Media & Entertainment', 'Manufacturing', 'Education'];
const HEALTH = ['Any Score', 'High (>75%)', 'Neutral (50-75%)', 'Critical (<50%)'];

export default function ChurnRiskPage() {
  const [search, setSearch] = useState('');
  const [riskTier, setRiskTier] = useState('All');
  const [industry, setIndustry] = useState('All');
  const [health, setHealth] = useState('Any Score');
  const [minProb, setMinProb] = useState(0);
  const [sort, setSort] = useState('probability');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const params = useMemo(
    () => ({
      search: search || undefined,
      riskTier: riskTier !== 'All' ? riskTier : undefined,
      industry: industry !== 'All' ? industry : undefined,
      health: health !== 'Any Score' ? health : undefined,
      minProb: minProb > 0 ? minProb : undefined,
      sort,
      dir,
      page,
      pageSize: 12,
    }),
    [search, riskTier, industry, health, minProb, sort, dir, page],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => api.customers(params),
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['customer', detailId],
    queryFn: () => api.customerDetail(detailId!),
    enabled: !!detailId,
  });

  const rows = data?.rows ?? [];
  const totalPages = data?.totalPages ?? 1;

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.customerId)));
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const exportCsv = () => {
    const url = api.exportCustomers({
      search: search || undefined,
      riskTier: riskTier !== 'All' ? riskTier : undefined,
      industry: industry !== 'All' ? industry : undefined,
      health: health !== 'Any Score' ? health : undefined,
      minProb: minProb > 0 ? minProb : undefined,
      sort,
      dir,
    });
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prism_churn_risk_register.csv';
    a.click();
  };

  const kpis = data?.summary;

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-5 animate-fade-in">
      {/* Title bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-primary uppercase mb-1">
            <span>Predictive Telemetry</span>
            <span className="text-outline-variant">•</span>
            <span className="text-on-surface-variant font-medium">Cohort Cluster v4.2</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              Churn Risk Intelligence &amp; Retention Playbooks
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-error border border-rose-200 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
              Live Alerting
            </span>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            High-propensity churn risk detections generated via Gradient Boosted SHAP explainability models.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button onClick={exportCsv} className="btn-secondary">
            <MaterialIcon name="file_download" size={16} className="text-on-surface-variant" />
            Export Risk Register
          </button>
          <button className="btn-primary">
            <MaterialIcon name="bolt" size={16} />
            + Bulk Retention Playbook
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Total At-Risk ARR"
          value={fmt.moneyCompact(kpis?.arrAtStake ?? 0)}
          icon="currency_exchange"
          iconClass="bg-rose-50 text-error"
          delta={{ text: '+14.2%', tone: 'up', good: false }}
          subtext={`${fmt.pct((kpis?.arrAtStake ?? 0) / 15000000)} of overall fleet ARR`}
        />
        <KpiCard
          label="Critical Risk Accounts"
          value={fmt.num(kpis?.highRisk ?? 0)}
          icon="warning"
          iconClass="bg-amber-50 text-amber-600"
          delta={{ text: 'Prob > 70%', tone: 'neutral' }}
          subtext="58 accounts added past 7d"
        />
        <KpiCard
          label="Average Churn Propensity"
          value={fmt.pct(kpis?.avgProb ?? 0)}
          icon="analytics"
          iconClass="bg-indigo-50 text-primary"
          delta={{ text: '-2.1% MoM', tone: 'down', good: true }}
          subtext="High confidence (95% CI ±1.8%)"
        />
        <KpiCard
          label="Potential Salvaged ARR"
          value={fmt.moneyCompact((kpis?.arrAtStake ?? 0) * 0.608)}
          icon="savings"
          iconClass="bg-emerald-50 text-emerald-600"
          delta={{ text: '60.8% Recapture', tone: 'up', good: true }}
          subtext="Via automated intervention triggers"
        />
      </div>

      {/* Filter bar */}
      <div className="card p-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <MaterialIcon name="search" size={18} className="absolute left-3 top-2 text-on-surface-variant" />
            <input
              className="input w-full pl-9"
              placeholder="Filter by organization, domain, or ID…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              type="text"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs bg-surface-container-low border border-outline-variant/30 px-2.5 py-1.5 rounded-lg text-on-surface cursor-pointer hover:bg-surface-container transition-colors">
              <span className="text-on-surface-variant text-[11px]">Risk Tier:</span>
              <select className="select font-semibold" value={riskTier} onChange={(e) => { setRiskTier(e.target.value); setPage(1); }}>
                {RISK_TIERS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <MaterialIcon name="expand_more" size={14} className="text-on-surface-variant" />
            </div>
            <div className="flex items-center gap-1 text-xs bg-surface-container-low border border-outline-variant/30 px-2.5 py-1.5 rounded-lg text-on-surface cursor-pointer hover:bg-surface-container transition-colors">
              <span className="text-on-surface-variant text-[11px]">Industry:</span>
              <select className="select font-semibold" value={industry} onChange={(e) => { setIndustry(e.target.value); setPage(1); }}>
                {INDUSTRIES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <MaterialIcon name="expand_more" size={14} className="text-on-surface-variant" />
            </div>
            <div className="flex items-center gap-1 text-xs bg-surface-container-low border border-outline-variant/30 px-2.5 py-1.5 rounded-lg text-on-surface cursor-pointer hover:bg-surface-container transition-colors">
              <span className="text-on-surface-variant text-[11px]">Health Score:</span>
              <select className="select font-semibold" value={health} onChange={(e) => { setHealth(e.target.value); setPage(1); }}>
                {HEALTH.map((t) => <option key={t}>{t}</option>)}
              </select>
              <MaterialIcon name="expand_more" size={14} className="text-on-surface-variant" />
            </div>
          </div>
        </div>
        {/* Risk threshold + segment pills */}
        <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
            <button
              onClick={() => { setMinProb(0); setPage(1); }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-colors ${minProb === 0 ? 'bg-primary text-white shadow-xs' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
            >
              All At-Risk ({fmt.num(data?.total ?? 0)})
            </button>
            <button
              onClick={() => { setMinProb(50); setPage(1); }}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${minProb === 50 ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-error" />
              High Churn Propensity &gt;50%
            </button>
            <button
              onClick={() => { setMinProb(70); setPage(1); }}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${minProb === 70 ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Critical &gt;70%
            </button>
            <button
              onClick={() => { setMinProb(80); setPage(1); }}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${minProb === 80 ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface hover:bg-surface-container'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Severe &gt;80%
            </button>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
            <span>
              Sort by: <strong className="text-on-surface font-semibold">{sort === 'probability' ? 'Churn Risk' : sort === 'arr' ? 'ARR at Stake' : sort === 'tenure' ? 'Tenure' : 'Health'} ({dir === 'desc' ? 'Desc' : 'Asc'})</strong>
            </span>
            <select
              className="select text-on-surface font-medium"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
            >
              <option value="probability">Churn Risk</option>
              <option value="arr">ARR at Stake</option>
              <option value="tenure">Tenure</option>
              <option value="health">Health</option>
              <option value="name">Name</option>
            </select>
            <button
              onClick={() => setDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
              className="p-1 hover:bg-surface-container rounded transition-colors text-on-surface"
              title="Toggle sort direction"
            >
              <MaterialIcon name="sort" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Table + detail drawer */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 card overflow-hidden flex flex-col">
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : isError ? (
            <ErrorState message="Unable to load customer predictions." onRetry={() => refetch()} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="h-10 bg-surface-container-low border-b border-outline-variant/30 text-on-surface-variant font-semibold uppercase tracking-wider select-none">
                      <th className="w-10 px-3 text-center">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded text-primary focus:ring-primary border-outline-variant/60 cursor-pointer"
                          checked={selected.size === rows.length && rows.length > 0}
                          onChange={toggleAll}
                        />
                      </th>
                      <th className="px-3 py-2">Organization / Domain</th>
                      <th className="px-3 py-2 w-28">Health Score</th>
                      <th className="px-3 py-2 text-right">Churn Risk</th>
                      <th className="px-3 py-2 text-right">Expansion</th>
                      <th className="px-3 py-2 text-right">ARR at Stake</th>
                      <th className="px-3 py-2">Primary Risk Driver</th>
                      <th className="px-3 py-2 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20">
                    {rows.map((r) => (
                      <tr
                        key={r.customerId}
                        onClick={() => setDetailId(r.customerId)}
                        className={`hover:bg-surface-container-low transition-colors cursor-pointer border-l-4 ${selected.has(r.customerId) ? 'bg-indigo-50/50 border-l-primary' : 'border-l-transparent'}`}
                      >
                        <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 rounded text-primary focus:ring-primary border-outline-variant/60 cursor-pointer"
                            checked={selected.has(r.customerId)}
                            onChange={() => toggleOne(r.customerId)}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary font-bold text-[11px] flex items-center justify-center shadow-xs shrink-0">
                              {r.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-on-surface text-[13px] truncate">{r.name}</span>
                                {r.riskTier === 'Critical' && <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />}
                              </div>
                              <span className="text-[11px] text-on-surface-variant font-mono truncate block">
                                {r.domain} • {r.tier}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-[11px] ${r.healthScore < 40 ? 'text-error' : r.healthScore < 60 ? 'text-amber-600' : 'text-on-surface-variant'}`}>
                              {r.healthScore}
                            </span>
                            <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${r.healthScore < 40 ? 'bg-error' : r.healthScore < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${r.healthScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold font-mono ${r.churnProbability >= 0.7 ? 'bg-rose-100 text-error' : r.churnProbability >= 0.5 ? 'bg-amber-100 text-amber-800' : 'bg-surface-container text-on-surface-variant'}`}>
                            {fmt.pct(r.churnProbability, 0)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-on-surface-variant">{r.expansion}%</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-on-surface">{fmt.money(r.arr)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${r.churnProbability >= 0.7 ? 'bg-rose-50 text-error' : 'bg-surface-container text-on-surface-variant'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${r.churnProbability >= 0.7 ? 'bg-error' : 'bg-outline'}`} />
                            {r.topReason}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDetailId(r.customerId); }}
                            className="p-1 hover:bg-surface-container rounded text-on-surface-variant hover:text-on-surface transition-colors"
                          >
                            <MaterialIcon name="chevron_right" size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-3 py-2.5 border-t border-outline-variant/20 text-[11px] text-on-surface-variant">
                <span>
                  Showing <strong className="text-on-surface">{rows.length > 0 ? (page - 1) * 12 + 1 : 0}–{(page - 1) * 12 + rows.length}</strong> of{' '}
                  <strong className="text-on-surface">{fmt.num(data?.total ?? 0)}</strong> accounts
                  {selected.size > 0 && <span className="ml-2 text-primary font-medium">• {selected.size} selected</span>}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-2 py-1 rounded hover:bg-surface-container disabled:opacity-30 transition-colors"
                  >
                    <MaterialIcon name="chevron_left" size={14} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-6 h-6 rounded text-[11px] font-medium transition-colors ${p === page ? 'bg-primary text-white' : 'hover:bg-surface-container text-on-surface'}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  {totalPages > 5 && <span className="px-1">…</span>}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-2 py-1 rounded hover:bg-surface-container disabled:opacity-30 transition-colors"
                  >
                    <MaterialIcon name="chevron_right" size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Customer detail drawer */}
        <CustomerDetailPanel
          detail={detail}
          loading={detailLoading}
          onClose={() => setDetailId(null)}
        />
      </div>
    </div>
  );
}

function CustomerDetailPanel({ detail, loading, onClose }: { detail?: CustomerDetail; loading: boolean; onClose: () => void }) {
  if (!detail && !loading) {
    return (
      <div className="xl:col-span-4 card p-6 text-center text-on-surface-variant">
        <MaterialIcon name="person_search" size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-xs">Select a customer to view predictive deep-dive</p>
      </div>
    );
  }
  if (loading || !detail) {
    return (
      <div className="xl:col-span-4 card p-6 space-y-3 animate-pulse">
        <div className="h-5 w-32 bg-surface-container rounded" />
        <div className="h-24 bg-surface-container rounded" />
        <div className="h-4 w-full bg-surface-container rounded" />
        <div className="h-4 w-2/3 bg-surface-container rounded" />
      </div>
    );
  }
  const probPct = detail.churnProbability * 100;
  return (
    <div className="xl:col-span-4 card overflow-hidden animate-slide-up">
      <div className="p-4 border-b border-outline-variant/20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary font-bold text-sm flex items-center justify-center">
              {detail.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-on-surface">{detail.name}</p>
                <span className={`chip ${detail.riskTier === 'Critical' ? 'chip-critical' : detail.riskTier === 'High' ? 'chip-warning' : 'chip-info'}`}>
                  {detail.riskTier}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant font-mono">
                ID: {detail.customerId} • {detail.tier}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-container text-on-surface-variant">
            <MaterialIcon name="close" size={16} />
          </button>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-low rounded-lg p-3">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Churn Probability</p>
            <p className={`text-xl font-bold font-mono mt-1 ${probPct >= 70 ? 'text-error' : probPct >= 50 ? 'text-amber-600' : 'text-on-surface'}`}>
              {fmt.pct(detail.churnProbability)}
            </p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">ARR at Stake</p>
            <p className="text-xl font-bold font-mono mt-1 text-on-surface">{fmt.money(detail.arr)}</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Revenue at Risk</p>
            <p className="text-xl font-bold font-mono mt-1 text-error">{fmt.money(detail.revenueAtRisk)}</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-3">
            <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">Health Score</p>
            <p className="text-xl font-bold font-mono mt-1 text-on-surface">{detail.healthScore}/100</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-surface-container-low/60 rounded-lg p-2">
            <p className="text-[10px] text-on-surface-variant">Tenure</p>
            <p className="text-sm font-bold text-on-surface">{detail.tenure} mo</p>
          </div>
          <div className="bg-surface-container-low/60 rounded-lg p-2">
            <p className="text-[10px] text-on-surface-variant">Contract</p>
            <p className="text-sm font-bold text-on-surface">{detail.contract}</p>
          </div>
          <div className="bg-surface-container-low/60 rounded-lg p-2">
            <p className="text-[10px] text-on-surface-variant">Monthly</p>
            <p className="text-sm font-bold text-on-surface">{fmt.money(detail.monthlyCharge)}</p>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Top Risk Drivers (SHAP)</p>
          <div className="space-y-2">
            {detail.drivers.map((d, i) => (
              <div key={d.feature} className="flex items-center justify-between bg-surface-container-low rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-surface-container text-on-surface-variant text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-xs text-on-surface font-medium">{d.label}</span>
                </div>
                <span className={`text-xs font-bold font-mono ${d.direction === 'up' ? 'text-error' : 'text-emerald-700'}`}>
                  {d.direction === 'up' ? '+' : ''}{(d.contribution * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary mb-1">
            <MaterialIcon name="psychology" size={14} />
            AI Prescriptive Playbook
          </div>
          <p className="text-xs text-on-surface leading-relaxed">{detail.recommendedAction}</p>
        </div>
        <button className="btn-primary w-full justify-center">
          <MaterialIcon name="send" size={16} />
          Send Retention Playbook
        </button>
      </div>
    </div>
  );
}
