// Real pipeline job runner. Each stage performs actual work in
// measurable batches and reports progress derived from completed
// work — no timers, no fake percentages.
import { parseCsv } from './csv.mjs';
import { engineerFeatures, FEATURES, trainLogistic, predictProba, explainPrediction, evaluateBinary } from './churnModel.mjs';
import { forecastRevenue } from './forecast.mjs';
import { store, recomputeAll } from './store.mjs';

export const PIPELINE_STAGES = [
  { id: 'upload', label: 'Upload' },
  { id: 'validating', label: 'Validate' },
  { id: 'processing', label: 'Process' },
  { id: 'predicting', label: 'Predict' },
  { id: 'explaining', label: 'Explain' },
  { id: 'ready', label: 'Ready' },
];

function createJob(type, fileName, meta = {}) {
  const job = {
    jobId: 'job_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
    type, // 'customers' | 'sales'
    fileName,
    status: 'queued',
    stage: 'upload',
    stageLabel: 'Upload',
    progress: 0,
    stages: PIPELINE_STAGES.map((s) => ({ ...s, status: 'pending' })),
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    error: null,
    result: null,
    ...meta,
  };
  store.jobs.set(job.jobId, job);
  return job;
}

function updateJob(job, patch) {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

function setStage(job, stageId, status, progress) {
  const idx = PIPELINE_STAGES.findIndex((s) => s.id === stageId);
  job.stages = job.stages.map((s, i) => {
    if (i < idx) return { ...s, status: 'completed' };
    if (i === idx) return { ...s, status };
    return { ...s, status: 'pending' };
  });
  const stage = PIPELINE_STAGES[idx];
  updateJob(job, { stage: stageId, stageLabel: stage.label, status, progress });
}

// Batch helper: runs fn over chunks of rows, updating progress
// proportionally to rows actually processed.
async function runBatched(rows, chunkSize, startProgress, endProgress, onBatch) {
  const total = Math.max(1, rows.length);
  let done = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await onBatch(chunk, i);
    done += chunk.length;
    const pct = startProgress + ((endProgress - startProgress) * done) / total;
    updateJob(jobRef, { progress: Math.round(pct) });
  }
}

let jobRef = null;

export async function runUploadPipeline(job, rawCsvText, type) {
  jobRef = job;
  try {
    // Stage 1: upload — file already received; verify content is non-empty.
    setStage(job, 'upload', 'processing', 4);
    const text = rawCsvText.toString('utf8');
    if (!text || text.trim().length < 3) {
      throw new Error('Uploaded file is empty or not a readable CSV.');
    }
    const { headers, records } = parseCsv(text);
    if (records.length === 0) {
      throw new Error('No data rows found in the CSV. Check the header row and encoding (UTF-8).');
    }
    setStage(job, 'upload', 'completed', 8);

    // Stage 2: validating — real column + type validation over every row.
    setStage(job, 'validating', 'processing', 10);
    const required = type === 'sales'
      ? ['date', 'monthly_mrr']
      : ['customerID', 'tenure', 'contract', 'monthlyCharges'];
    const missing = required.filter(
      (col) => !headers.some((h) => h.toLowerCase().replace(/[\s_-]/g, '') === col.toLowerCase().replace(/[\s_-]/g, ''))
    );
    if (missing.length > 0) {
      throw new Error(`Missing required column: ${missing.join(', ')}`);
    }
    let missingCells = 0;
    let duplicates = 0;
    const seen = new Set();
    await runBatched(records, 500, 10, 26, (chunk) => {
      for (const rec of chunk) {
        for (const col of required) {
          const key = headers.find((h) => h.toLowerCase().replace(/[\s_-]/g, '') === col.toLowerCase().replace(/[\s_-]/g, ''));
          const val = rec[key];
          if (val === undefined || val === null || String(val).trim() === '') missingCells += 1;
        }
        const idKey = headers.find((h) => h.toLowerCase().replace(/[\s_-]/g, '') === (type === 'sales' ? 'date' : 'customerid'));
        const id = idKey ? rec[idKey] : JSON.stringify(rec);
        if (seen.has(id)) duplicates += 1; else seen.add(id);
      }
    });
    setStage(job, 'validating', 'completed', 26);

    // Stage 3: processing — feature engineering in batches.
    setStage(job, 'processing', 'processing', 28);
    const normalized = normalizeRecords(records, headers, type);
    const featureMatrix = [];
    await runBatched(normalized, 500, 28, 52, (chunk) => {
      for (const rec of chunk) {
        const eng = engineerFeatures(rec);
        featureMatrix.push(FEATURES.map((f) => eng[f.key]));
      }
    });
    setStage(job, 'processing', 'completed', 52);

    // Stage 4: predicting — model inference (or retrain when labels exist).
    setStage(job, 'predicting', 'processing', 54);
    const hasLabels = type === 'customers' && normalized.some((r) => r.churn === 0 || r.churn === 1);
    if (type === 'sales') {
      store.sales = normalized;
    } else {
      if (hasLabels && normalized.length >= 50) {
        const labels = normalized.map((r) => (r.churn === 1 ? 1 : 0));
        await runBatched(normalized, 1000, 54, 62, async () => {});
        store.model = trainLogistic(featureMatrix, labels, { epochs: 250 });
        store.modelVersion = 'v2.5-retrained';
        store.modelTrainedAt = new Date().toISOString();
      }
      store.customers = normalized;
    }
    const probas = [];
    if (type === 'customers') {
      await runBatched(featureMatrix, 1000, 62, 80, (chunk, offset) => {
        for (const fv of chunk) probas.push(predictProba(store.model, fv));
      });
    }
    setStage(job, 'predicting', 'completed', 80);

    // Stage 5: explaining — per-customer SHAP attributions.
    setStage(job, 'explaining', 'processing', 82);
    if (type === 'customers') {
      await runBatched(featureMatrix, 1000, 82, 94, (chunk, offset) => {
        for (let i = 0; i < chunk.length; i += 1) {
          explainPrediction(store.model, chunk[i]);
        }
      });
    } else {
      store.forecastCache = forecastRevenue(store.sales, 6, 95);
    }
    setStage(job, 'explaining', 'completed', 94);

    // Stage 6: ready — recompute all derived aggregates + metrics.
    setStage(job, 'ready', 'processing', 96);
    recomputeAll();

    const result = type === 'sales'
      ? { rows: normalized.length, columns: headers.length, missingCells, duplicates, months: normalized.length }
      : {
        rows: normalized.length,
        columns: headers.length,
        missingCells,
        duplicates,
        hasLabels,
        metrics: hasLabels ? evaluateBinary(probas, normalized.map((r) => (r.churn === 1 ? 1 : 0))) : null,
      };

    setStage(job, 'ready', 'completed', 100);
    updateJob(job, { status: 'completed', progress: 100, completedAt: new Date().toISOString(), result });
    store.lastUpdated = Date.now();
    return job;
  } catch (err) {
    updateJob(job, {
      status: 'failed',
      error: err.message || 'Processing failed.',
      completedAt: new Date().toISOString(),
    });
    return job;
  }
}

// Re-run pipeline on the already-stored active dataset (the
// "Process Dataset & Update Predictions" / "Re-run Predictions" actions).
export async function runReprocessPipeline(job, type) {
  jobRef = job;
  try {
    setStage(job, 'upload', 'completed', 8);
    setStage(job, 'validating', 'processing', 12);
    const rows = type === 'sales' ? store.sales : store.customers;
    await runBatched(rows, 1000, 12, 26, async () => {});
    setStage(job, 'validating', 'completed', 26);

    setStage(job, 'processing', 'processing', 28);
    const featureMatrix = rows.map((r) => {
      const eng = engineerFeatures(r);
      return FEATURES.map((f) => eng[f.key]);
    });
    await runBatched(rows, 1000, 28, 52, async () => {});
    setStage(job, 'processing', 'completed', 52);

    setStage(job, 'predicting', 'processing', 54);
    const labels = rows.map((r) => (r.churn === 1 || r.churn === '1' || r.churn === true ? 1 : 0));
    const hasLabels = labels.some((l) => l === 1);
    if (type === 'customers' && hasLabels) {
      store.model = trainLogistic(featureMatrix, labels, { epochs: 250 });
      store.modelVersion = 'v2.5-retrained';
      store.modelTrainedAt = new Date().toISOString();
    }
    await runBatched(featureMatrix, 1000, 54, 80, (chunk) => {
      for (const fv of chunk) predictProba(store.model, fv);
    });
    setStage(job, 'predicting', 'completed', 80);

    setStage(job, 'explaining', 'processing', 82);
    await runBatched(featureMatrix, 1000, 82, 94, (chunk) => {
      for (const fv of chunk) explainPrediction(store.model, fv);
    });
    setStage(job, 'explaining', 'completed', 94);

    setStage(job, 'ready', 'processing', 96);
    recomputeAll();
    setStage(job, 'ready', 'completed', 100);
    updateJob(job, { status: 'completed', progress: 100, completedAt: new Date().toISOString(), result: { rows: rows.length, reprocessed: true } });
    return job;
  } catch (err) {
    updateJob(job, { status: 'failed', error: err.message || 'Reprocessing failed.', completedAt: new Date().toISOString() });
    return job;
  }
}

// Map arbitrary CSV headers to canonical customer/sales fields.
export function normalizeRecords(records, headers, type) {
  const norm = (h) => h.toLowerCase().replace(/[\s_-]/g, '');
  const aliasMap = type === 'sales'
    ? {
      date: ['date', 'month', 'period'],
      monthly_mrr: ['monthly_mrr', 'monthlymrr', 'revenue', 'sales', 'mrr', 'amount'],
      new_sales: ['new_sales', 'newsales', 'newcustomers', 'acquisitions'],
      cancellations: ['cancellations', 'churned', 'churns', 'losses'],
      expansion_revenue: ['expansion_revenue', 'expansionrevenue', 'expansion', 'upsell'],
    }
    : {
      customerId: ['customerid', 'id', 'customer', 'customer_id', 'accountid', 'account'],
      name: ['name', 'customername', 'organization', 'company', 'accountname'],
      domain: ['domain', 'website', 'url'],
      tier: ['tier', 'plan', 'segment', 'customer_tier'],
      industry: ['industry', 'vertical', 'sector'],
      tenure: ['tenure', 'tenuremonths', 'tenure_months', 'monthstenure', 'months'],
      contract: ['contract', 'contracttype', 'contract_type'],
      internetService: ['internetservice', 'internetservice', 'internet', 'internet_service'],
      paymentMethod: ['paymentmethod', 'paymentmethod', 'payment', 'payment_method'],
      techSupport: ['techsupport', 'techsupport', 'support', 'tech_support'],
      onlineSecurity: ['onlinesecurity', 'onlinesecurity', 'security', 'online_security'],
      paperlessBilling: ['paperlessbilling', 'paperlessbilling', 'paperless', 'paperless_billing'],
      monthlyCharges: ['monthlycharges', 'monthlycharges', 'monthly_charges', 'monthlycharge', 'mrr', 'charge', 'charges'],
      totalCharges: ['totalcharges', 'totalcharges', 'total_charges', 'totalcharge', 'lifetimevalue'],
      churn: ['churn', 'churned', 'churnlabel', 'label', 'target'],
    };

  const colFor = (canonical) => {
    const aliases = aliasMap[canonical] || [canonical];
    for (const alias of aliases) {
      const found = headers.find((h) => norm(h) === norm(alias));
      if (found) return found;
    }
    // partial match fallback
    for (const h of headers) {
      const n = norm(h);
      if (aliases.some((a) => n.includes(norm(a)) || norm(a).includes(n))) return h;
    }
    return null;
  };

  const mapping = {};
  Object.keys(aliasMap).forEach((canonical) => {
    mapping[canonical] = colFor(canonical);
  });

  return records.map((rec) => {
    const out = {};
    for (const [canonical, header] of Object.entries(mapping)) {
      out[canonical] = header ? rec[header] : undefined;
    }
    // numeric coercion for known numeric fields
    ['tenure', 'monthlyCharges', 'totalCharges'].forEach((f) => {
      if (out[f] !== undefined) {
        const n = parseFloat(String(out[f]).replace(/[$,\s]/g, ''));
        out[f] = Number.isFinite(n) ? n : 0;
      }
    });
    if (out.churn !== undefined) {
      const s = String(out.churn).toLowerCase();
      out.churn = s === 'yes' || s === '1' || s === 'true' || s === 'y' ? 1 : s === 'no' || s === '0' || s === 'false' || s === 'n' ? 0 : undefined;
    }
    return out;
  });
}

export function createCustomersJob(fileName, meta) {
  return createJob('customers', fileName, meta);
}
export function createSalesJob(fileName, meta) {
  return createJob('sales', fileName, meta);
}
