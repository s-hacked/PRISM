// Sales forecasting engine: Holt's linear trend method with residual-based
// prediction intervals. Also computes holdout backtest metrics (MAPE / RMSE).
import { mean, std, normInv, roundTo } from './stats.mjs';

const Z = { 80: 1.2816, 95: 1.96 };

function holtFit(series, alpha = 0.45, beta = 0.08) {
  let level = series[0];
  let trend = series.length > 1 ? series[1] - series[0] : 0;
  const fitted = [level];
  for (let i = 1; i < series.length; i += 1) {
    const prevLevel = level;
    level = alpha * series[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    fitted.push(level + trend);
  }
  return { level, trend, fitted };
}

export function forecastRevenue(series, horizon = 3, confidence = 95) {
  const values = series.map((s) => s.revenue);
  const z = Z[confidence] || 1.96;

  // Holdout backtest: fit on all but the last 6 points, predict the last 6.
  const holdoutSize = Math.min(6, Math.max(2, Math.floor(values.length / 6)));
  const trainSlice = values.slice(0, values.length - holdoutSize);
  const holdoutFit = holtFit(trainSlice);
  const holdoutPred = [];
  for (let h = 1; h <= holdoutSize; h += 1) {
    holdoutPred.push(holdoutFit.level + holdoutFit.trend * h);
  }
  const actualHoldout = values.slice(values.length - holdoutSize);
  const residuals = actualHoldout.map((a, i) => a - holdoutPred[i]);
  const mape = mean(actualHoldout.map((a, i) => Math.abs((a - holdoutPred[i]) / a))) * 100;
  const rmse = Math.sqrt(mean(residuals.map((r) => r * r)));
  const sigma = Math.max(std(residuals), rmse * 0.6, values[values.length - 1] * 0.012);

  // Final model on full history.
  const fit = holtFit(values);
  const future = [];
  const lastDate = new Date(`${series[series.length - 1].month}-01`);
  for (let h = 1; h <= horizon; h += 1) {
    const d = new Date(lastDate.getFullYear(), lastDate.getMonth() + h, 1);
    const point = fit.level + fit.trend * h;
    const interval = z * sigma * Math.sqrt(h);
    future.push({
      month: d.toISOString().slice(0, 7),
      label: d.toLocaleString('en-US', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2),
      forecast: roundTo(point, 0),
      lower: roundTo(Math.max(0, point - interval), 0),
      upper: roundTo(point + interval, 0),
      // naive baseline: last observed value carried forward
      baselineNaive: roundTo(values[values.length - 1], 0),
    });
  }

  // Historical + holdout series for the chart.
  const history = series.map((s, i) => ({
    month: s.month,
    label: monthLabel(s.month),
    actual: s.revenue,
  }));
  const holdoutSeries = actualHoldout.map((a, i) => ({
    month: series[values.length - holdoutSize + i].month,
    label: monthLabel(series[values.length - holdoutSize + i].month),
    actual: a,
    holdout: roundTo(holdoutPred[i], 0),
  }));

  const nextMonth = future[0];
  const baselineImprovement =
    values.length > 0
      ? roundTo(((nextMonth.forecast - nextMonth.baselineNaive) / nextMonth.baselineNaive) * 100, 1)
      : 0;

  return {
    history,
    holdoutSeries,
    future,
    horizon,
    confidence,
    sigma: roundTo(sigma, 0),
    metrics: {
      mape: roundTo(mape, 1),
      rmse: roundTo(rmse, 0),
      baselineImprovement,
      holdoutSize,
    },
    nextMonth: {
      label: nextMonth.label,
      point: nextMonth.forecast,
      lower: nextMonth.lower,
      upper: nextMonth.upper,
    },
  };
}

function monthLabel(month) {
  const d = new Date(`${month}-01`);
  return d.toLocaleString('en-US', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(2);
}

// Confidence dispersion (density) curve around the next-period forecast.
export function confidenceDensity(nextMonth, sigma) {
  const pts = [];
  const lo = nextMonth.lower - sigma * 0.5;
  const hi = nextMonth.upper + sigma * 0.5;
  const center = (nextMonth.lower + nextMonth.upper) / 2;
  const width = Math.max(1, nextMonth.upper - nextMonth.lower) / 2;
  for (let i = 0; i <= 60; i += 1) {
    const x = lo + ((hi - lo) * i) / 60;
    const z = (x - center) / (width / 1.96);
    pts.push({ x: roundTo(x, 0), y: roundTo(Math.exp(-(z * z) / 2), 4) });
  }
  const p10 = center - 1.2816 * width / 1.96;
  const p50 = center;
  const p90 = center + 1.2816 * width / 1.96;
  return { points: pts, p10: roundTo(p10, 0), p50: roundTo(p50, 0), p90: roundTo(p90, 0) };
}
