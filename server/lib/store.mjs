// Central server-side state: active dataset, trained model, metrics,
// drift state, dataset history and jobs. All mutations flow through
// recomputeAll() so every endpoint reflects the currently active dataset.
import { generateSeedCustomers, generateSeedSales } from './seed.mjs';
import {
  engineerFeatures, trainLogistic, predictProba, explainPrediction,
  globalDriverImportance, evaluateBinary, rocCurve, calibrationCurve, FEATURES,
} from './churnModel.mjs';
import { forecastRevenue } from './forecast.mjs';
import { mean, std, roundTo } from './stats.mjs';

const now = Date.now();
const fmtTime = (ts) => new Date(ts).toISOString();

const seedCustomers = generateSeedCustomers(10000, 42);
const seedSales = generateSeedSales(36, 7, 10000);

export const store = {
  customers: seedCustomers,
  sales: seedSales,
  model: null,
  modelVersion: 'v2.4.1-prod',
  modelTrainedAt: fmtTime(now - 1000 * 60 * 30),
  predictions: [], // per-customer { prob, riskTier, healthScore, drivers, topReason, action }
  drivers: [],
  forecastCache: null,
  activeDataset: {
    name: 'customers_q3.csv',
    type: 'customers',
    rows: 10000,
    columns: 15,
    sizeBytes: 2400000,
    uploadedAt: fmtTime(now - 1000 * 60 * 3),
    missingValues: 0,
    duplicates: 0,
    validation: 'passed',
    source: 'seed',
  },
  salesDataset: {
    name: 'historical_sales_2023_2024.csv',
    type: 'sales',
    rows: 36,
    columns: 5,
    sizeBytes: 48000,
    uploadedAt: fmtTime(now - 1000 * 60 * 60 * 5),
    missingValues: 0,
    duplicates: 0,
    validation: 'passed',
  },
  datasetHistory: [
    { name: 'customers_q3.csv', type: 'customers', rows: 10000, status: 'Active', uploadedBy: 'system@prism', uploadedAt: fmtTime(now - 1000 * 60 * 3) },
    { name: 'historical_sales_2023_2024.csv', type: 'sales', rows: 36, status: 'Synchronized', uploadedBy: 'billing-sync', uploadedAt: fmtTime(now - 1000 * 60 * 60 * 5) },
    { name: 'customers_q2_final.csv', type: 'customers', rows: 9420, status: 'Archived', uploadedBy: 'm.chen@prism', uploadedAt: fmtTime(now - 1000 * 60 * 60 * 24 * 32) },
    { name: 'customers_cohort_eval_oct.csv', type: 'customers', rows: 3150, status: 'Evaluated', uploadedBy: 'a.roy@prism', uploadedAt: fmtTime(now - 1000 * 60 * 60 * 24 * 6) },
  ],
  drift: {
    injected: null,
    psi: [],
    auditLog: [
      { at: fmtTime(now - 1000 * 60 * 14), action: 'PSI recalculated', status: 'Normal', detail: 'Computing Kolmogorov-Smirnov across 18 features' },
      { at: fmtTime(now - 1000 * 60 * 14), action: 'Record verification', status: 'Passed', detail: 'Verifying 10k records — 0 anomalies' },
    ],
  },
  jobs: new Map(),
  lastUpdated: now,
  retentionEvents: [],
};

function riskTierOf(p) {
  if (p >= 0.7) return 'Critical';
  if (p >= 0.5) return 'High';
  if (p >= 0.3) return 'Medium';
  return 'Low';
}

function recommendedAction(drivers, contract, tenure, monthlyCharges) {
  const top = drivers[0]?.feature;
  if (top === 'contract_m2m') {
    return 'Offer a 12-month contract lock-in with a 10% loyalty discount to convert from month-to-month billing.';
  }
  if (top === 'no_tech_support') {
    return 'Bundle technical support add-on in the next renewal outreach; support coverage reduces churn materially.';
  }
  if (top === 'internet_fiber') {
    return 'Schedule a fiber service-quality audit and proactive onboarding check-in for this fiber account.';
  }
  if (top === 'payment_electronic') {
    return 'Migrate to autopay (bank transfer or credit card) and offer a small recurring billing credit.';
  }
  if (top === 'tenure') {
    return 'Trigger high-touch onboarding playbook — short-tenure accounts need fast time-to-value milestones.';
  }
  if (top === 'monthly_charges' || top === 'charges_per_tenure') {
    return 'Review plan fit: propose a right-sized plan or annualized pricing to lower effective monthly charges.';
  }
  if (top === 'no_online_security') {
    return 'Attach online security add-on via targeted upsell campaign before the next billing cycle.';
  }
  return 'Assign to standard retention watchlist with quarterly business review.';
}

// Recompute model, predictions, drivers, forecast and all derived
// aggregates for the currently active dataset. Called after every
// successful upload / reprocess / drift simulation.
export function recomputeAll() {
  const t0 = Date.now();
  const rows = store.customers;
  const featureMatrix = rows.map((r) => {
    const eng = engineerFeatures(r);
    return FEATURES.map((f) => eng[f.key]);
  });
  const hasLabels = rows.some((r) => r.churn === 0 || r.churn === 1);

  if (hasLabels && rows.length >= 50) {
    const labels = rows.map((r) => (r.churn === 1 || r.churn === '1' || r.churn === true ? 1 : 0));
    store.model = trainLogistic(featureMatrix, labels, { epochs: 250 });
    store.modelVersion = 'v2.4.' + (1 + (store.retentionEvents.length % 9)) + '-retrained';
    store.modelTrainedAt = fmtTime(Date.now());
  } else if (!store.model) {
    // First boot path (seed data always has labels, so this is a safety net).
    store.model = trainLogistic(featureMatrix, rows.map(() => 0), {});
  }

  // Score every customer + compute per-customer SHAP attributions.
  store.predictions = rows.map((r, i) => {
    const prob = predictProba(store.model, featureMatrix[i]);
    const drivers = explainPrediction(store.model, featureMatrix[i]);
    return {
      prob,
      riskTier: riskTierOf(prob),
      healthScore: Math.round((1 - prob) * 100),
      drivers,
      topReason: drivers[0]?.label || 'Model baseline',
      action: recommendedAction(drivers, r.contract, r.tenure, r.monthlyCharges),
    };
  });

  store.drivers = globalDriverImportance(store.model, featureMatrix);
  store.forecastCache = forecastRevenue(store.sales, 6, 95);

  // Drift: PSI per feature = sum over bins of (cur% - ref%) * ln(cur%/ref%)
  const ref = store.drift.injected ? null : featureMatrix;
  store.drift.psi = FEATURES.map((f, j) => {
    const col = featureMatrix.map((row) => row[j]);
    const refCol = ref ? ref.map((row) => row[j]) : col;
    const psi = computePsi(refCol, col);
    const status = psi > 0.25 ? 'Critical' : psi > 0.1 ? 'Watch' : 'Stable';
    return {
      feature: f.key,
      label: f.label,
      psi: roundTo(psi, 4),
      status,
      trend: psi > 0.1 ? 'Rising' : psi > 0.02 ? 'Flat' : 'Falling',
    };
  }).sort((a, b) => b.psi - a.psi);

  store.lastUpdated = Date.now();
  return Date.now() - t0;
}

function computePsi(refCol, curCol) {
  const edges = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0001];
  const refCounts = new Array(edges.length - 1).fill(0);
  const curCounts = new Array(edges.length - 1).fill(0);
  refCol.forEach((v) => {
    for (let b = 0; b < edges.length - 1; b += 1) {
      if (v >= edges[b] && v < edges[b + 1]) { refCounts[b] += 1; break; }
    }
  });
  curCol.forEach((v) => {
    for (let b = 0; b < edges.length - 1; b += 1) {
      if (v >= edges[b] && v < edges[b + 1]) { curCounts[b] += 1; break; }
    }
  });
  let psi = 0;
  for (let b = 0; b < refCounts.length; b += 1) {
    const refP = Math.max(1e-4, refCounts[b] / Math.max(1, refCol.length));
    const curP = Math.max(1e-4, curCounts[b] / Math.max(1, curCol.length));
    psi += (curP - refP) * Math.log(curP / refP);
  }
  return psi;
}

// Initial computation at boot.
recomputeAll();
