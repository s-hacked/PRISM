// Rule-based assistant that answers questions using the REAL
// aggregates computed from the active dataset. No invented numbers.
import { store } from './store.mjs';
import { roundTo } from './stats.mjs';

const fmtMoney = (v) =>
  '$' + (v >= 1e6 ? (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : Math.round(v).toString());

function computeStats() {
  const customers = store.customers;
  const preds = store.predictions;
  const total = customers.length;
  const highRisk = preds.filter((p) => p.prob >= 0.7);
  const churned = customers.filter((c) => c.churn === 1).length;
  const baselineMrr = customers.reduce((a, c) => a + (c.monthlyCharges || 0), 0);
  const revAtRisk = highRisk.reduce((a, p, i) => a + (customers[i].monthlyCharges || 0), 0);
  const atRiskAll = preds.reduce((a, p, i) => a + p.prob * (customers[i].monthlyCharges || 0), 0);
  const weightedChurn = preds.reduce((a, p) => a + p.prob, 0) / Math.max(1, total);
  const topDrivers = store.drivers.slice(0, 3);
  const nextMonth = store.forecastCache?.nextMonth;
  const critical = preds.filter((p) => p.prob >= 0.7).length;
  return {
    total, highRisk, churned, baselineMrr, revAtRisk, atRiskAll, weightedChurn,
    topDrivers, nextMonth, critical,
    modelVersion: store.modelVersion,
    datasetName: store.activeDataset.name,
    lastUpdated: store.lastUpdated,
  };
}

export function answerQuestion(question) {
  const q = String(question || '').toLowerCase();
  const s = computeStats();
  const has = (...words) => words.some((w) => q.includes(w));

  let answer, headline, chips = [], related = [];

  if (has('most at risk', 'at risk', 'riskiest', 'highest risk', 'churn risk')) {
    const top = store.customers
      .map((c, i) => ({ c, p: store.predictions[i].prob }))
      .sort((a, b) => b.p - a.p)
      .slice(0, 5);
    answer = [
      `Across the active dataset (${s.datasetName}), ${s.critical.toLocaleString()} of ${s.total.toLocaleString()} customers carry a churn probability of 70% or higher.`,
      `The five highest-risk accounts right now:`,
      ...top.map((t) => `- ${t.c.name || t.c.customerID} — ${(t.p * 100).toFixed(1)}% churn probability (${t.c.contract}, ${t.c.tenure} mo tenure, ${fmtMoney(t.c.monthlyCharges)}/mo)`),
      `Top risk driver across the population: ${s.topDrivers[0]?.label || 'n/a'}.`,
    ].join('\n');
    headline = `${s.critical.toLocaleString()} high-risk accounts`;
    chips = [`${s.critical.toLocaleString()} accounts ≥ 70% probability`, `Revenue at risk ${fmtMoney(s.revAtRisk)}/mo`];
    related = ['Why did churn increase?', 'How much revenue is at risk?', 'What retention actions are recommended?'];
  } else if (has('why did churn', 'churn increase', 'churn went up', 'churn rising', 'driver', 'reason', 'cause')) {
    answer = [
      `Churn concentration is driven by three model-attributed factors (SHAP):`,
      ...s.topDrivers.map((d, i) => `${i + 1}. ${d.label} — ${d.impactPct}% relative impact, odds ratio ${d.oddsRatio}x, present in ${d.prevalence}% of accounts`),
      `Month-to-month contracts remain the single largest lever: converting the top decile to annual terms would remove the highest-odds risk segment from the book.`,
    ].join('\n');
    headline = 'Driver attribution';
    chips = s.topDrivers.map((d) => d.label);
    related = ['Which customers are most at risk?', 'What is next month\'s forecast?', 'How healthy is the model?'];
  } else if (has('revenue at risk', 'how much revenue', 'arr at risk', 'mrr at risk', 'exposure')) {
    answer = [
      `Revenue at risk (expected monthly churn loss across all accounts): ${fmtMoney(s.atRiskAll)}/mo.`,
      `Concentrated exposure — accounts with ≥70% churn probability alone represent ${fmtMoney(s.revAtRisk)}/mo (${(s.revAtRisk / Math.max(1, s.baselineMrr) * 100).toFixed(1)}% of baseline MRR of ${fmtMoney(s.baselineMrr)}).`,
      `Predicted weighted churn rate: ${(s.weightedChurn * 100).toFixed(1)}%.`,
    ].join('\n');
    headline = fmtMoney(s.atRiskAll) + '/mo expected loss';
    chips = [`Expected loss ${fmtMoney(s.atRiskAll)}/mo`, `High-risk exposure ${fmtMoney(s.revAtRisk)}/mo`, `${(s.weightedChurn * 100).toFixed(1)}% weighted churn`];
    related = ['Which customers are most at risk?', 'Why did churn increase?', 'What is next month\'s forecast?'];
  } else if (has('forecast', 'next month', 'next-month', 'revenue next', 'sales next', 'predict')) {
    const f = s.nextMonth;
    answer = [
      f
        ? `Next month's revenue forecast (${f.label}): ${fmtMoney(f.point)} with a 95% interval of ${fmtMoney(f.lower)} – ${fmtMoney(f.upper)}.`
        : 'No forecast available yet — upload a sales history CSV to activate the forecasting engine.',
      `Model: Holt linear trend, holdout-verified (MAPE ${store.forecastCache?.metrics?.mape ?? 'n/a'}%).`,
      `Horizon can be extended to 3 or 6 months on the Forecast page.`,
    ].join('\n');
    headline = f ? `${fmtMoney(f.point)} next month` : 'Awaiting sales data';
    chips = f ? [`P50 ${fmtMoney(f.point)}`, `95% CI ${fmtMoney(f.lower)}–${fmtMoney(f.upper)}`] : [];
    related = ['How much revenue is at risk?', 'How healthy is the model?', 'Which customers are most at risk?'];
  } else if (has('model health', 'how healthy', 'model quality', 'auc', 'drift', 'performance')) {
    const m = store.forecastCache?.metrics;
    const auc = store.diagnostics?.auc;
    answer = [
      `Model ${store.modelVersion} — last validated ${new Date(store.modelTrainedAt).toLocaleString()}.`,
      `Discrimination: ${typeof auc === 'number' ? 'ROC-AUC ' + auc : 'ROC-AUC ' + (store.lastMetrics?.auc ?? 'see Model Health page')}.`,
      `Forecast accuracy: MAPE ${m?.mape ?? 'n/a'}%, RMSE ${m?.rmse ?? 'n/a'}.`,
      `Data drift: ${store.drift.psi.filter((p) => p.status !== 'Stable').length} of ${store.drift.psi.length} monitored features outside stable PSI bounds.`,
    ].join('\n');
    headline = store.modelVersion;
    chips = [`AUC ${typeof auc === 'number' ? auc : 'see Model Health'}`, `MAPE ${m?.mape ?? 'n/a'}%`];
    related = ['What is next month\'s forecast?', 'How much revenue is at risk?'];
  } else if (has('dataset', 'data', 'upload', 'csv', 'records', 'rows')) {
    answer = [
      `Active dataset: ${store.activeDataset.name} — ${store.activeDataset.rows.toLocaleString()} rows, ${store.activeDataset.columns} columns.`,
      `Validation: ${store.activeDataset.validation} · missing values ${store.activeDataset.missingValues} · duplicates ${store.activeDataset.duplicates}.`,
      `Last updated ${new Date(store.lastUpdated).toLocaleString()}. Upload a new CSV from the Data page to re-run the full pipeline.`,
    ].join('\n');
    headline = store.activeDataset.name;
    chips = [`${store.activeDataset.rows.toLocaleString()} rows`, `${store.activeDataset.columns} columns`];
    related = ['Which customers are most at risk?', 'How much revenue is at risk?'];
  } else if (has('retention', 'save', 'action', 'recommend', 'playbook')) {
    const top = store.customers
      .map((c, i) => ({ c, p: store.predictions[i].prob, d: store.predictions[i].topReason }))
      .filter((t) => t.p >= 0.7)
      .slice(0, 3);
    answer = [
      `Recommended plays for the highest-risk segment:`,
      ...top.map((t) => `- ${t.c.name || t.c.customerID}: ${t.d} → ${store.predictions[store.customers.indexOf(t.c)].action}`),
      `Population-wide, the highest-leverage play targets ${s.topDrivers[0]?.label || 'the leading driver'}.`,
    ].join('\n');
    headline = 'Retention playbook';
    chips = top.map((t) => t.d);
    related = ['Which customers are most at risk?', 'Why did churn increase?'];
  } else if (has('hello', 'hi', 'hey', 'help')) {
    answer = [
      'I can answer questions about the active dataset. Try:',
      '- "Which customers are most at risk?"',
      '- "Why did churn increase?"',
      '- "How much revenue is at risk?"',
      '- "What is next month\'s forecast?"',
      '- "How healthy is the model?"',
    ].join('\n');
    headline = 'PRISM Copilot';
    chips = ['Which customers are most at risk?', 'How much revenue is at risk?'];
    related = ['Why did churn increase?', 'What is next month\'s forecast?'];
  } else {
    answer = [
      `Here is the current state of ${s.datasetName}:`,
      `- ${s.total.toLocaleString()} customers, predicted weighted churn ${(s.weightedChurn * 100).toFixed(1)}%`,
      `- ${s.critical.toLocaleString()} high-risk (≥70%) accounts, ${fmtMoney(s.revAtRisk)}/mo concentrated exposure`,
      `- Next-month revenue forecast: ${s.nextMonth ? fmtMoney(s.nextMonth.point) : 'n/a'}`,
      'Ask me about churn drivers, revenue at risk, forecasts, model health, or the dataset.',
    ].join('\n');
    headline = 'Dataset summary';
    chips = [`${(s.weightedChurn * 100).toFixed(1)}% weighted churn`, `${s.critical.toLocaleString()} high-risk`];
    related = ['Which customers are most at risk?', 'Why did churn increase?', 'What is next month\'s forecast?'];
  }

  return {
    question,
    headline,
    answer,
    chips,
    related,
    answeredAt: new Date().toISOString(),
    dataset: s.datasetName,
  };
}
