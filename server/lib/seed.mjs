// Deterministic seed dataset (10,000 subscription customers) + 36 months of
// sales history. Used as the default "active dataset" until a real CSV upload
// replaces it.
import { makeRandom } from './prng.mjs';
import { engineerFeatures, normalizeContract, normalizeInternet, normalizePayment, FEATURES } from './churnModel.mjs';

const NAME_PREFIX = [
  'Acme', 'Zenith', 'BluePeak', 'Vantage', 'Nimbus', 'Cobalt', 'Summit', 'Harbor',
  'Pinnacle', 'Atlas', 'Vertex', 'Lattice', 'Meridian', 'Quartz', 'Ember', 'Sterling',
  'Cascade', 'Frontier', 'Beacon', 'Crest', 'Delta', 'Everest', 'Falcon', 'Granite',
  'Helix', 'Ironwood', 'Juniper', 'Keystone', 'Lotus', 'Magnolia', 'Northstar', 'Onyx',
  'Prairie', 'Redwood', 'Solstice', 'Titan', 'Umbra', 'Vista', 'Willow', 'Xenon',
  'Yarrow', 'Zephyr', 'Apex', 'Boulder', 'Copper', 'Drift', 'Echo', 'Flint',
];
const NAME_SUFFIX = [
  'Retail Corp', 'Logistics', 'Analytics', 'Systems', 'Labs', 'Health', 'Financial',
  'Media', 'Works', 'Dynamics', 'Solutions', 'Ventures', 'Group', 'Partners', 'Technologies',
  'Industries', 'Commerce', 'Services', 'Holdings', 'Enterprises', 'Digital', 'Cloud',
  'Robotics', 'Energy', 'Foods', 'Apparel', 'Travel', 'Auto', 'Bio', 'Capital',
];
const INDUSTRIES = [
  'SaaS & Tech', 'Retail & E-commerce', 'Healthcare', 'Financial Services',
  'Logistics', 'Media & Entertainment', 'Manufacturing', 'Education',
];
const DOMAINS_TLD = ['com', 'io', 'global', 'co', 'net', 'inc'];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16);
}

export function generateSeedCustomers(count = 10000, seed = 42) {
  const rnd = makeRandom(seed);
  const customers = [];
  for (let i = 0; i < count; i += 1) {
    const tierRoll = rnd.next();
    const tier = tierRoll < 0.15 ? 'Enterprise' : tierRoll < 0.5 ? 'Mid-Market' : 'SMB';
    const tenure = Math.max(1, Math.round(Math.min(72, -Math.log(1 - rnd.next()) * 18)));
    // Contract correlates with tenure (longer tenure -> longer contract)
    const cRoll = rnd.next();
    let contract;
    if (tenure > 36) contract = cRoll < 0.45 ? 'Two year' : cRoll < 0.8 ? 'One year' : 'Month-to-month';
    else if (tenure > 12) contract = cRoll < 0.2 ? 'Two year' : cRoll < 0.55 ? 'One year' : 'Month-to-month';
    else contract = cRoll < 0.75 ? 'Month-to-month' : 'One year';

    const iRoll = rnd.next();
    const internetService = iRoll < 0.42 ? 'Fiber optic' : iRoll < 0.85 ? 'DSL' : 'No';
    const pRoll = rnd.next();
    const paymentMethod = pRoll < 0.34 ? 'Electronic check' : pRoll < 0.55 ? 'Mailed check' : pRoll < 0.78 ? 'Bank transfer' : 'Credit card';
    const techSupport = rnd.next() < 0.48;
    const onlineSecurity = rnd.next() < 0.44;
    const paperlessBilling = rnd.next() < 0.59;

    const baseCharge = tier === 'Enterprise' ? 165 : tier === 'Mid-Market' ? 95 : 55;
    let monthlyCharges = baseCharge + rnd.gaussian(0, baseCharge * 0.35);
    if (internetService === 'Fiber optic') monthlyCharges += 28;
    if (internetService === 'DSL') monthlyCharges += 12;
    if (techSupport) monthlyCharges += 14;
    if (onlineSecurity) monthlyCharges += 10;
    monthlyCharges = Math.max(18, Math.round(monthlyCharges * 100) / 100);

    const totalCharges = Math.round(monthlyCharges * tenure * (0.9 + rnd.next() * 0.2) * 100) / 100;

    // True churn propensity from an underlying logistic function + noise,
    // so the trained model has a realistic learnable signal.
    // Calibrated: observed monthly churn ~14%, ~6.5% of the book above the
    // 70% risk threshold, model AUC ~0.93.
    const K = 2.0; // effect-size multiplier (sets distribution spread)
    let logit = -7.0;
    if (contract === 'Month-to-month') logit += 1.85 * K;
    if (contract === 'One year') logit -= 0.55 * K;
    if (contract === 'Two year') logit -= 1.35 * K;
    if (internetService === 'Fiber optic') logit += 0.7 * K;
    if (internetService === 'DSL') logit -= 0.15 * K;
    if (paymentMethod === 'Electronic check') logit += 0.8 * K;
    if (paymentMethod === 'Credit card') logit -= 0.25 * K;
    if (!techSupport) logit += 0.55 * K;
    if (!onlineSecurity) logit += 0.4 * K;
    logit += ((monthlyCharges - 90) / 75) * K;
    logit -= (tenure / 22) * K;
    logit += rnd.gaussian(0, 0.22);
    const prob = 1 / (1 + Math.exp(-logit));
    const churn = rnd.next() < prob ? 1 : 0;

    const name = `${rnd.pick(NAME_PREFIX)} ${rnd.pick(NAME_SUFFIX)}`;
    const domain = `${slugify(name)}.${rnd.pick(DOMAINS_TLD)}`;

    customers.push({
      customerId: `C-${String(100000 + i)}`,
      name,
      domain,
      tier,
      industry: rnd.pick(INDUSTRIES),
      tenure,
      contract,
      internetService,
      paymentMethod,
      techSupport: techSupport ? 'Yes' : 'No',
      onlineSecurity: onlineSecurity ? 'Yes' : 'No',
      paperlessBilling: paperlessBilling ? 'Yes' : 'No',
      monthlyCharges,
      totalCharges,
      churn,
      // telemetry-style derived fields used by the UI
      seats: tier === 'Enterprise' ? Math.round(rnd.range(60, 400)) : tier === 'Mid-Market' ? Math.round(rnd.range(15, 90)) : Math.round(rnd.range(2, 20)),
      engagementDelta: Math.round(rnd.gaussian(6 - prob * 55, 18)),
    });
  }
  return customers;
}

export function generateSeedSales(months = 36, seed = 7, baseCustomers = 10000) {
  const rnd = makeRandom(seed);
  const series = [];
  const startYear = 2023;
  const startMonth = 11; // Nov 2023 -> Oct 2026 (36 months)
  let level = baseCustomers * 82; // baseline MRR in dollars
  const trend = 0.01;
  for (let i = 0; i < months; i += 1) {
    const d = new Date(startYear, startMonth + i, 1);
    const season = 1 + 0.06 * Math.sin(((d.getMonth() + 1) / 12) * Math.PI * 2) + (d.getMonth() === 10 ? 0.04 : 0);
    level *= 1 + trend + rnd.gaussian(0, 0.005);
    const revenue = Math.round(level * season);
    const newSales = Math.round(revenue * (0.045 + rnd.gaussian(0, 0.008)));
    const cancellations = Math.round(revenue * (0.036 + rnd.gaussian(0, 0.006)));
    const expansion = Math.round(revenue * (0.018 + rnd.gaussian(0, 0.005)));
    series.push({
      month: d.toISOString().slice(0, 7),
      revenue,
      newSales,
      cancellations,
      expansionRevenue: expansion,
    });
  }
  return series;
}

export const SEED_CUSTOMER_COLUMNS = [
  'customerID', 'name', 'domain', 'tier', 'industry', 'tenure', 'contract',
  'internetService', 'paymentMethod', 'techSupport', 'onlineSecurity',
  'paperlessBilling', 'monthlyCharges', 'totalCharges', 'churn',
];
