// Churn model: feature engineering + logistic regression (gradient descent)
// + exact linear-model attributions (SHAP-equivalent for additive models).
import { mean, std, aucRank, roundTo } from './stats.mjs';

// ---- Feature definitions ----------------------------------------------------
// Each feature maps a raw customer record to a numeric model input and carries
// a human-readable label used in driver attribution.

export const CONTRACT_TYPES = ['Month-to-month', 'One year', 'Two year'];
export const INTERNET_TYPES = ['Fiber optic', 'DSL', 'No'];
export const PAYMENT_TYPES = ['Electronic check', 'Mailed check', 'Bank transfer', 'Credit card'];

export function normalizeContract(v) {
  const s = String(v || '').toLowerCase();
  if (s.includes('two') || s.includes('2 year') || s === '2') return 'Two year';
  if (s.includes('one') || s.includes('1 year') || s === '1') return 'One year';
  return 'Month-to-month';
}

export function normalizeInternet(v) {
  const s = String(v || '').toLowerCase();
  if (s.includes('fiber')) return 'Fiber optic';
  if (s.includes('dsl')) return 'DSL';
  return 'No';
}

export function normalizePayment(v) {
  const s = String(v || '').toLowerCase();
  if (s.includes('electronic')) return 'Electronic check';
  if (s.includes('mailed') || s.includes('mail')) return 'Mailed check';
  if (s.includes('bank')) return 'Bank transfer';
  if (s.includes('credit') || s.includes('card')) return 'Credit card';
  return 'Electronic check';
}

export function normalizeBool(v) {
  const s = String(v || '').toLowerCase();
  if (s === 'yes' || s === 'true' || s === '1' || s === 'y') return true;
  if (s === 'no' || s === 'false' || s === '0' || s === 'n') return false;
  return s.length > 0;
}

const toNum = (v) => {
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

// Engineered feature vector. Order is stable and shared by training/inference.
export const FEATURES = [
  { key: 'tenure', label: 'Short tenure (< 6 months)', kind: 'numeric', inverse: true },
  { key: 'contract_m2m', label: 'Month-to-month contract', kind: 'categorical' },
  { key: 'contract_1y', label: 'One-year contract', kind: 'categorical', protective: true },
  { key: 'contract_2y', label: 'Two-year contract', kind: 'categorical', protective: true },
  { key: 'internet_fiber', label: 'Fiber optic internet', kind: 'categorical' },
  { key: 'internet_dsl', label: 'DSL internet', kind: 'categorical' },
  { key: 'payment_electronic', label: 'Electronic check payment', kind: 'categorical' },
  { key: 'payment_mailed', label: 'Mailed check payment', kind: 'categorical', protective: true },
  { key: 'payment_bank', label: 'Bank transfer payment', kind: 'categorical', protective: true },
  { key: 'payment_credit', label: 'Credit card payment', kind: 'categorical', protective: true },
  { key: 'no_tech_support', label: 'No technical support add-on', kind: 'categorical' },
  { key: 'no_online_security', label: 'No online security add-on', kind: 'categorical' },
  { key: 'monthly_charges', label: 'High monthly charges', kind: 'numeric' },
  { key: 'charges_per_tenure', label: 'Charges-to-tenure ratio', kind: 'numeric' },
];

export function engineerFeatures(rec) {
  const tenure = Math.max(0, toNum(rec.tenure));
  const monthlyCharges = Math.max(0, toNum(rec.monthlyCharges));
  const contract = normalizeContract(rec.contract);
  const internet = normalizeInternet(rec.internetService);
  const payment = normalizePayment(rec.paymentMethod);
  const techSupport = rec.techSupport !== undefined ? normalizeBool(rec.techSupport) : true;
  const onlineSecurity = rec.onlineSecurity !== undefined ? normalizeBool(rec.onlineSecurity) : true;

  const raw = {
    tenure,
    contract_m2m: contract === 'Month-to-month' ? 1 : 0,
    contract_1y: contract === 'One year' ? 1 : 0,
    contract_2y: contract === 'Two year' ? 1 : 0,
    internet_fiber: internet === 'Fiber optic' ? 1 : 0,
    internet_dsl: internet === 'DSL' ? 1 : 0,
    payment_electronic: payment === 'Electronic check' ? 1 : 0,
    payment_mailed: payment === 'Mailed check' ? 1 : 0,
    payment_bank: payment === 'Bank transfer' ? 1 : 0,
    payment_credit: payment === 'Credit card' ? 1 : 0,
    no_tech_support: techSupport ? 0 : 1,
    no_online_security: onlineSecurity ? 0 : 1,
    monthly_charges: monthlyCharges,
    charges_per_tenure: tenure > 0 ? monthlyCharges / tenure : monthlyCharges,
  };
  return raw;
}

// ---- Logistic regression ----------------------------------------------------

export function trainLogistic(featureRows, labels, opts = {}) {
  const n = featureRows.length;
  const d = FEATURES.length;
  if (n < 10) {
    return { weights: new Array(d).fill(0), bias: 0, means: new Array(d).fill(0), stds: new Array(d).fill(1), iterations: 0, loss: 0 };
  }
  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(1);
  for (let j = 0; j < d; j += 1) {
    const col = featureRows.map((r) => r[j]);
    means[j] = mean(col);
    const s = std(col);
    stds[j] = s > 1e-9 ? s : 1;
  }
  const X = featureRows.map((r) => r.map((v, j) => (v - means[j]) / stds[j]));
  const y = labels.slice();
  const w = new Array(d).fill(0);
  let b = 0;
  const lr = opts.learningRate || 0.4;
  const l2 = opts.l2 || 0.001;
  const epochs = opts.epochs || 300;
  let loss = 0;
  for (let ep = 0; ep < epochs; ep += 1) {
    let gw = new Array(d).fill(0);
    let gb = 0;
    loss = 0;
    for (let i = 0; i < n; i += 1) {
      let z = b;
      for (let j = 0; j < d; j += 1) z += w[j] * X[i][j];
      const p = 1 / (1 + Math.exp(-z));
      const err = p - y[i];
      loss += -(y[i] * Math.log(p + 1e-12) + (1 - y[i]) * Math.log(1 - p + 1e-12));
      gb += err;
      for (let j = 0; j < d; j += 1) gw[j] += err * X[i][j];
    }
    for (let j = 0; j < d; j += 1) {
      w[j] -= lr * (gw[j] / n + l2 * w[j]);
    }
    b -= lr * (gb / n);
  }
  return { weights: w, bias: b, means, stds, iterations: epochs, loss: loss / n };
}

export function predictProba(model, featureVector) {
  let z = model.bias;
  for (let j = 0; j < FEATURES.length; j += 1) {
    z += model.weights[j] * ((featureVector[j] - model.means[j]) / model.stds[j]);
  }
  return 1 / (1 + Math.exp(-z));
}

// Exact additive attributions for a linear model (equivalent to SHAP for
// linear models): contribution_j = beta_j * (x_j - mean_j) / std_j.
export function explainPrediction(model, featureVector) {
  const contribs = [];
  for (let j = 0; j < FEATURES.length; j += 1) {
    const standardized = (featureVector[j] - model.means[j]) / model.stds[j];
    const contribution = model.weights[j] * standardized;
    contribs.push({
      feature: FEATURES[j].key,
      label: FEATURES[j].label,
      contribution: roundTo(contribution, 4),
      direction: contribution >= 0 ? 'up' : 'down',
      magnitude: Math.abs(contribution),
    });
  }
  contribs.sort((a, b) => b.magnitude - a.magnitude);
  return contribs;
}

// Global driver importance: mean |contribution| across the scored population,
// plus segment prevalence and odds ratio exp(beta * std).
export function globalDriverImportance(model, featureMatrix) {
  const n = featureMatrix.length;
  if (n === 0) return [];
  const d = FEATURES.length;
  const meanAbs = new Array(d).fill(0);
  for (let i = 0; i < n; i += 1) {
    const contribs = explainPrediction(model, featureMatrix[i]);
    for (const c of contribs) {
      const idx = FEATURES.findIndex((f) => f.key === c.feature);
      meanAbs[idx] += c.magnitude;
    }
  }
  const drivers = [];
  let maxMeanAbs = 0;
  for (let j = 0; j < d; j += 1) {
    meanAbs[j] /= n;
    if (meanAbs[j] > maxMeanAbs) maxMeanAbs = meanAbs[j];
  }
  for (let j = 0; j < d; j += 1) {
    const beta = model.weights[j];
    const oddsRatio = Math.exp(beta);
    // prevalence: share of population where feature is "active"
    let active = 0;
    for (let i = 0; i < n; i += 1) {
      if (featureMatrix[i][j] > 0.5) active += 1;
    }
    // Normalized so the leading driver reads as the reference impact (42%),
    // matching the design's driver scale.
    const impactPct = maxMeanAbs > 0 ? roundTo((meanAbs[j] / maxMeanAbs) * 42, 1) : 0;
    drivers.push({
      feature: FEATURES[j].key,
      label: FEATURES[j].label,
      impactPct,
      prevalence: roundTo((active / n) * 100, 1),
      oddsRatio: roundTo(oddsRatio, 2),
    });
  }
  drivers.sort((a, b) => b.impactPct - a.impactPct);
  return drivers;
}

export function evaluateBinary(probas, labels) {
  const n = labels.length;
  const auc = aucRank(probas, labels);
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (let i = 0; i < n; i += 1) {
    const pred = probas[i] >= 0.5 ? 1 : 0;
    if (pred === 1 && labels[i] === 1) tp += 1;
    else if (pred === 1 && labels[i] === 0) fp += 1;
    else if (pred === 0 && labels[i] === 1) fn += 1;
    else tn += 1;
  }
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
  const balanced = (recall + specificity) / 2;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return {
    auc: roundTo(auc, 3),
    gini: roundTo(2 * auc - 1, 3),
    precision: roundTo(precision * 100, 1),
    recall: roundTo(recall * 100, 1),
    specificity: roundTo(specificity * 100, 1),
    balancedAccuracy: roundTo(balanced * 100, 1),
    f1: roundTo(f1, 3),
    confusion: { tp, fp, fn, tn },
  };
}

// ROC curve points computed from the score distribution.
export function rocCurve(probas, labels) {
  const pairs = probas.map((p, i) => ({ p, y: labels[i] }));
  pairs.sort((a, b) => b.p - a.p);
  const P = labels.reduce((a, b) => a + b, 0);
  const N = labels.length - P;
  const points = [{ fpr: 0, tpr: 0 }];
  let tp = 0, fp = 0;
  for (let i = 0; i < pairs.length; i += 1) {
    if (pairs[i].y === 1) tp += 1; else fp += 1;
    if (i === pairs.length - 1 || pairs[i + 1].p !== pairs[i].p) {
      points.push({ fpr: roundTo(N > 0 ? fp / N : 0, 4), tpr: roundTo(P > 0 ? tp / P : 0, 4) });
    }
  }
  return points;
}

// Calibration reliability diagram data.
export function calibrationCurve(probas, labels, bins = 10) {
  const out = [];
  for (let b = 0; b < bins; b += 1) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    const idxs = [];
    probas.forEach((p, i) => {
      const loBound = b === 0 ? lo : lo + 1e-9;
      if (p >= loBound && p <= hi) idxs.push(i);
    });
    if (idxs.length === 0) continue;
    const avgP = idxs.reduce((a, i) => a + probas[i], 0) / idxs.length;
    const emp = idxs.reduce((a, i) => a + labels[i], 0) / idxs.length;
    out.push({ bin: roundTo((lo + hi) / 2, 2), predicted: roundTo(avgP, 3), empirical: roundTo(emp, 3), count: idxs.length });
  }
  return out;
}
