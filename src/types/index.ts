// Shared TypeScript types for the PRISM Predictive Intelligence frontend.
// These mirror the JSON shapes returned by the Express API.

export interface KpiData {
  totalCustomers: number;
  churnRate: number;
  churnRateTarget: number;
  highRiskCount: number;
  actionNeededCount: number;
  revenueAtRisk: number;
  baselineMrr: number;
  revenueAtRiskShare: number;
  nextMonthForecast: number;
  nextMonthLower: number;
  nextMonthUpper: number;
  mrrGrowth: number;
  rmseVariance: number;
}

export interface ForecastPoint {
  month: string;
  label: string;
  actual?: number;
  forecast?: number;
  lower?: number;
  upper?: number;
  holdout?: number;
  baselineNaive?: number;
}

export interface ChurnDriver {
  feature: string;
  label: string;
  impactPct: number;
  prevalence: number;
  oddsRatio: number;
  segmentCount: number;
}

export interface Cohort {
  spec: string;
  accounts: number;
  meanProb: number;
  exposedMrr: number;
  playbook: string;
}

export interface Insight {
  title: string;
  impact: string;
  text: string;
  affectedAccounts: number;
}

export interface OverviewData {
  kpis: KpiData;
  forecastSeries: { history: ForecastPoint[]; future: ForecastPoint[] };
  drivers: ChurnDriver[];
  insight: Insight;
  cohorts: Cohort[];
  retentionBase: { highRiskCount: number; baselineMrr: number };
  model: { version: string; trainedAt: string };
  lastUpdated: number;
}

export interface RetentionSim {
  lift: number;
  cohortSize: number;
  cohortMrr: number;
  saveRate: number;
  protectedMrr: number;
  protectedAnnual: number;
  preventedAccounts: number;
  campaignCost: number;
  roi: number;
  baselineMrr: number;
}

export interface CustomerRow {
  customerId: string;
  name: string;
  domain: string;
  tier: string;
  industry: string;
  tenure: number;
  contract: string;
  internetService: string;
  paymentMethod: string;
  monthlyCharge: number;
  totalCharges: number;
  arr: number;
  churnProbability: number;
  riskTier: 'Critical' | 'High' | 'Medium' | 'Low';
  healthScore: number;
  expansion: number;
  revenueAtRisk: number;
  topReason: string;
}

export interface CustomerListResponse {
  rows: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: { avgProb: number; highRisk: number; arrAtStake: number };
}

export interface CustomerDriver {
  feature: string;
  label: string;
  contribution: number;
  direction: 'up' | 'down';
}

export interface CustomerDetail {
  customerId: string;
  name: string;
  domain: string;
  tier: string;
  industry: string;
  tenure: number;
  contract: string;
  internetService: string;
  paymentMethod: string;
  techSupport?: string;
  onlineSecurity?: string;
  paperlessBilling?: string;
  monthlyCharge: number;
  totalCharges: number;
  arr: number;
  churnProbability: number;
  riskTier: string;
  healthScore: number;
  revenueAtRisk: number;
  engagementDelta?: number;
  seats?: number;
  drivers: CustomerDriver[];
  allDrivers: CustomerDriver[];
  recommendedAction: string;
  percentile: number;
}

export interface ForecastData {
  horizon: number;
  confidence: number;
  history: ForecastPoint[];
  holdoutSeries: ForecastPoint[];
  future: ForecastPoint[];
  metrics: { mape: number; rmse: number; baselineImprovement: number; holdoutSize: number };
  nextMonth: { label: string; point: number; lower: number; upper: number };
  sigma: number;
  density: { points: { x: number; y: number }[]; p10: number; p50: number; p90: number };
  featureImportance: { feature: string; pct: number }[];
  lastUpdated: number;
}

export interface ModelHealthData {
  modelVersion: string;
  lastValidation: string;
  auc: number | null;
  gini: number | null;
  precision: number | null;
  recall: number | null;
  specificity: number | null;
  balancedAccuracy: number | null;
  f1: number | null;
  confusion: { tp: number; fp: number; fn: number; tn: number } | null;
  brier: number | null;
  mape: number;
  rmse: number;
  dataQuality: number;
  rocCurve: { fpr: number; tpr: number }[];
  calibration: { bin: number; predicted: number; empirical: number; count: number }[];
  errorDist: { bin: number; count: number }[];
  psi: { feature: string; label: string; psi: number; status: string; trend: string }[];
  driftSummary: { monitored: number; watch: number; critical: number };
  leakageChecks: { name: string; status: string; detail: string }[];
  auditLog: { at: string; action: string; status: string; detail: string }[];
  hasLabels: boolean;
  lastUpdated: number;
}

export interface DatasetInfo {
  name: string;
  type: string;
  rows: number;
  columns: number;
  sizeBytes: number;
  uploadedAt: string;
  missingValues: number;
  duplicates: number;
  validation: string;
  source?: string;
}

export interface DatasetHistoryEntry {
  name: string;
  type: string;
  rows: number;
  status: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface DatasetsData {
  active: DatasetInfo;
  sales: DatasetInfo;
  history: DatasetHistoryEntry[];
  salesHistory: { rows: number; firstMonth: string; lastMonth: string };
  lastUpdated: number;
}

export interface JobStage {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface Job {
  jobId: string;
  type: string;
  fileName: string;
  status: 'queued' | 'validating' | 'processing' | 'predicting' | 'explaining' | 'completed' | 'failed';
  stage: string;
  stageLabel: string;
  progress: number;
  stages: JobStage[];
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  error: string | null;
  result: { rows?: number; columns?: number; missingCells?: number; duplicates?: number; hasLabels?: boolean; reprocessed?: boolean } | null;
}

export interface AssistantResponse {
  question: string;
  headline: string;
  answer: string;
  chips: string[];
  related: string[];
  answeredAt: string;
  dataset: string;
}

export interface ApiError {
  error: string;
}
