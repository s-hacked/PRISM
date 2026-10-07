// Standalone calibration: find (K, base) so the TRUE probability
// distribution has mean ~8% and ~7.4% of customers above 0.7.
import { makeRandom } from './prng.mjs';

const NAME_PREFIX = ['Acme','Zenith','BluePeak','Vantage','Nimbus','Cobalt','Summit','Harbor','Pinnacle','Atlas','Vertex','Lattice','Meridian','Quartz','Ember','Sterling','Cascade','Frontier','Beacon','Crest','Delta','Everest','Falcon','Granite','Helix','Ironwood','Juniper','Keystone','Lotus','Magnolia','Northstar','Onyx','Prairie','Redwood','Solstice','Titan','Umbra','Vista','Willow','Xenon','Yarrow','Zephyr','Apex','Boulder','Copper','Drift','Echo','Flint'];
const NAME_SUFFIX = ['Retail Corp','Logistics','Analytics','Systems','Labs','Health','Financial','Media','Works','Dynamics','Solutions','Ventures','Group','Partners','Technologies','Industries','Commerce','Services','Holdings','Enterprises','Digital','Cloud','Robotics','Energy','Foods','Apparel','Travel','Auto','Bio','Capital'];
const INDUSTRIES = ['SaaS & Tech','Retail & E-commerce','Healthcare','Financial Services','Logistics','Media & Entertainment','Manufacturing','Education'];

function gen(K, base, noise, count = 10000, seed = 42) {
  const rnd = makeRandom(seed);
  const probs = [];
  for (let i = 0; i < count; i += 1) {
    const tierRoll = rnd.next();
    const tier = tierRoll < 0.15 ? 'Enterprise' : tierRoll < 0.5 ? 'Mid-Market' : 'SMB';
    const tenure = Math.max(1, Math.round(Math.min(72, -Math.log(1 - rnd.next()) * 18)));
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
    const baseCharge = tier === 'Enterprise' ? 165 : tier === 'Mid-Market' ? 95 : 55;
    let monthlyCharges = baseCharge + rnd.gaussian(0, baseCharge * 0.35);
    if (internetService === 'Fiber optic') monthlyCharges += 28;
    if (internetService === 'DSL') monthlyCharges += 12;
    if (techSupport) monthlyCharges += 14;
    if (onlineSecurity) monthlyCharges += 10;
    monthlyCharges = Math.max(18, Math.round(monthlyCharges * 100) / 100);

    let logit = base;
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
    logit += rnd.gaussian(0, noise);
    probs.push(1 / (1 + Math.exp(-logit)));
  }
  const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
  const hi = probs.filter((p) => p >= 0.7).length / probs.length;
  const churn = probs.filter((p, i) => makeRandom(i + 1).next() < p).length / probs.length;
  return { mean, hi, churn };
}

for (const K of [2.0, 2.4, 2.8]) {
  for (const base of [-6.5, -7.0, -7.5, -8.0]) {
    const r = gen(K, base, 0.22);
    console.log(`K=${K} base=${base} -> mean=${(r.mean*100).toFixed(1)}% highRisk=${(r.hi*100).toFixed(1)}% churn=${(r.churn*100).toFixed(1)}%`);
  }
}
