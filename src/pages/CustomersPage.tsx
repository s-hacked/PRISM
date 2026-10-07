import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, fmt } from '../services/api';
import MaterialIcon from '../components/MaterialIcon';
import ErrorState from '../components/ErrorState';
import { TableSkeleton } from '../components/Skeleton';
import Drawer from '../components/Drawer';
import type { CustomerDetail } from '../types';

const TIERS = ['All Tiers', 'Enterprise', 'Mid-Market', 'SMB'];
const INDUSTRIES = ['All Verticals', 'SaaS & Tech', 'Retail & E-commerce', 'Healthcare', 'Financial Services', 'Logistics', 'Media & Entertainment', 'Manufacturing', 'Education'];
const HEALTH = ['Any Score', 'High (>75%)', 'Neutral (50-75%)', 'Critical (<50%)'];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('All Tiers');
  const [industry, setIndustry] = useState('All Verticals');
  const [health, setHealth] = useState('Any Score');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      search: search || undefined,
      tier: tier !== 'All Tiers' ? tier : undefined,
      industry: industry !== 'All Verticals' ? industry : undefined,
      health: health !== 'Any Score' ? health : undefined,
      sort: 'probability',
      dir: 'desc' as const,
      page,
      pageSize: 12,
    }),
    [search, tier, industry, health, page],
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

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-5 animate-fade-in">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-primary uppercase mb-1">
            <span>Customer Directory</span>
            <span className="text-outline-variant">•</span>
            <span className="text-on-surface-variant font-medium">Full Book</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Customer Intelligence</h1>
          <p className="text-xs text-on-surface-variant mt-1">Complete account directory with predictive health scoring.</p>
        </div>
        <button className="btn-secondary self-start md:self-auto">
          <MaterialIcon name="file_download" size={16} className="text-on-surface-variant" />
          Export Directory
        </button>
      </div>

      {/* Filters */}
      <div className="card p-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <MaterialIcon name="search" size={18} className="absolute left-3 top-2 text-on-surface-variant" />
            <input
              className="input w-full pl-9"
              placeholder="Search by name, domain, or ID…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              type="text"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { label: 'Tier', value: tier, setter: setTier, options: TIERS },
              { label: 'Industry', value: industry, setter: setIndustry, options: INDUSTRIES },
              { label: 'Health Range', value: health, setter: setHealth, options: HEALTH },
            ]).map((f) => (
              <div key={f.label} className="flex items-center gap-1.5 bg-surface-container-low px-2.5 py-1 rounded-lg">
                <span className="text-on-surface-variant text-[11px]">{f.label}:</span>
                <select
                  className="select font-semibold"
                  value={f.value}
                  onChange={(e) => { f.setter(e.target.value); setPage(1); }}
                >
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <button className="btn-ghost text-[11px]">
              <MaterialIcon name="tune" size={16} />
              More Filters
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1">
          <button className="px-3 py-1 rounded-full bg-primary-container text-on-primary text-[11px] font-semibold whitespace-nowrap shadow-xs">
            All Accounts ({fmt.num(data?.total ?? 0)})
          </button>
          <button className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-[11px] font-medium whitespace-nowrap transition-colors">
            Critical Churn Risk ({fmt.num(data?.summary.highRisk ?? 0)})
          </button>
          <button className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-[11px] font-medium whitespace-nowrap transition-colors">
            Enterprise ({fmt.num(Math.round((data?.total ?? 0) * 0.15))})
          </button>
          <button className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high text-[11px] font-medium whitespace-nowrap transition-colors">
            Stable / Healthy
          </button>
        </div>
      </div>

      {/* Table + detail */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-8 card overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-surface-container-low flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-on-surface">Accounts Displayed:</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px] font-medium">
                {rows.length} of {fmt.num(data?.total ?? 0)} matches
              </span>
            </div>
            <div className="flex items-center gap-2 text-on-surface-variant text-xs">
              <span>
                Sorted by: <strong className="text-on-surface text-xs">Risk Severity (Desc)</strong>
              </span>
            </div>
          </div>
          {isLoading ? (
            <TableSkeleton rows={10} />
          ) : isError ? (
            <ErrorState message="Unable to load customers." onRetry={() => refetch()} />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50 text-on-surface-variant uppercase tracking-wider h-9">
                      <th className="pl-4 pr-1 py-2 w-8">
                        <input type="checkbox" className="w-3.5 h-3.5 rounded text-primary-container cursor-pointer" />
                      </th>
                      <th className="px-2 py-2">Organization</th>
                      <th className="px-2 py-2">Health Score</th>
                      <th className="px-2 py-2 text-right">Churn Risk</th>
                      <th className="px-2 py-2 text-right">Expansion</th>
                      <th className="px-2 py-2 text-right">ARR Stake</th>
                      <th className="px-2 py-2">Primary Driver</th>
                      <th className="pr-4 pl-1 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container">
                    {rows.map((r) => (
                      <tr
                        key={r.customerId}
                        onClick={() => setDetailId(r.customerId)}
                        className="hover:bg-surface-container-low transition-colors cursor-pointer group"
                      >
                        <td className="pl-4 pr-1 py-2.5">
                          <input type="checkbox" className="w-3.5 h-3.5 rounded text-primary-container cursor-pointer" />
                        </td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {r.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                                {r.name}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-on-surface-variant">
                                <span className="truncate">{r.domain}</span>
                                <span className="text-outline">•</span>
                                <span className="px-1 rounded bg-surface-container text-[10px]">{r.tier.toUpperCase()}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`text-[13px] font-bold ${r.healthScore < 40 ? 'text-error' : r.healthScore < 60 ? 'text-amber-600' : 'text-emerald-700'}`}>
                              {r.healthScore}%
                            </span>
                            <div className="w-16 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${r.healthScore < 40 ? 'bg-error' : r.healthScore < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${r.healthScore}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap text-[13px] font-bold">
                          <span className={r.churnProbability >= 0.7 ? 'text-error' : r.churnProbability >= 0.5 ? 'text-amber-600' : 'text-on-surface-variant'}>
                            {fmt.pct(r.churnProbability)}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap text-[13px] text-on-surface-variant">{r.expansion}%</td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap text-[13px] font-bold text-on-surface">{fmt.money(r.arr)}</td>
                        <td className="px-2 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${r.churnProbability >= 0.7 ? 'bg-rose-50 text-error' : 'bg-surface-container text-on-surface-variant'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${r.churnProbability >= 0.7 ? 'bg-error' : 'bg-outline'}`} />
                            {r.topReason}
                          </span>
                        </td>
                        <td className="pr-4 pl-1 py-2.5 text-right">
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
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-outline-variant/20 text-[11px] text-on-surface-variant">
                <span>
                  Page <strong className="text-on-surface">{page}</strong> of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-1 rounded hover:bg-surface-container disabled:opacity-30">
                    <MaterialIcon name="chevron_left" size={14} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <button key={p} onClick={() => setPage(p)} className={`w-6 h-6 rounded text-[11px] font-medium ${p === page ? 'bg-primary text-white' : 'hover:bg-surface-container text-on-surface'}`}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-1 rounded hover:bg-surface-container disabled:opacity-30">
                    <MaterialIcon name="chevron_right" size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail drawer */}
        <div className="xl:col-span-4">
          {detailId ? (
            <CustomerDrawer detail={detail} loading={detailLoading} onClose={() => setDetailId(null)} />
          ) : (
            <div className="card p-6 text-center text-on-surface-variant">
              <MaterialIcon name="person_search" size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs">Select a customer to view predictive deep-dive</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerDrawer({ detail, loading, onClose }: { detail?: CustomerDetail; loading: boolean; onClose: () => void }) {
  if (loading || !detail) {
    return (
      <div className="card p-6 space-y-3 animate-pulse">
        <div className="h-5 w-32 bg-surface-container rounded" />
        <div className="h-24 bg-surface-container rounded" />
        <div className="h-4 w-full bg-surface-container rounded" />
      </div>
    );
  }
  return (
    <Drawer open onClose={onClose} width="max-w-sm">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary font-bold text-sm flex items-center justify-center">
              {detail.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">{detail.name}</p>
              <p className="text-[11px] text-on-surface-variant font-mono">{detail.customerId}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-container-low rounded-lg p-2.5">
            <p className="text-[10px] text-on-surface-variant uppercase">Churn Probability</p>
            <p className={`text-lg font-bold font-mono ${detail.churnProbability >= 0.7 ? 'text-error' : 'text-on-surface'}`}>
              {fmt.pct(detail.churnProbability)}
            </p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-2.5">
            <p className="text-[10px] text-on-surface-variant uppercase">ARR at Stake</p>
            <p className="text-lg font-bold font-mono text-on-surface">{fmt.money(detail.arr)}</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-2.5">
            <p className="text-[10px] text-on-surface-variant uppercase">Tenure</p>
            <p className="text-lg font-bold text-on-surface">{detail.tenure} mo</p>
          </div>
          <div className="bg-surface-container-low rounded-lg p-2.5">
            <p className="text-[10px] text-on-surface-variant uppercase">Contract</p>
            <p className="text-sm font-bold text-on-surface">{detail.contract}</p>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Top Risk Drivers</p>
          <div className="space-y-1.5">
            {detail.drivers.map((d, i) => (
              <div key={d.feature} className="flex items-center justify-between bg-surface-container-low rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-on-surface font-medium">{i + 1}. {d.label}</span>
                <span className={`text-xs font-bold font-mono ${d.direction === 'up' ? 'text-error' : 'text-emerald-700'}`}>
                  {d.direction === 'up' ? '+' : ''}{(d.contribution * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p className="text-[11px] font-semibold text-primary mb-1">Recommended Action</p>
          <p className="text-xs text-on-surface leading-relaxed">{detail.recommendedAction}</p>
        </div>
        <button className="btn-primary w-full justify-center">
          <MaterialIcon name="send" size={16} />
          Send Retention Playbook
        </button>
      </div>
    </Drawer>
  );
}
