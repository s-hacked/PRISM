import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MaterialIcon from '../components/MaterialIcon';
import { LogoMark } from '../components/TopNav';

export default function SignUpPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid work email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem('prism_session', JSON.stringify({ email, name, at: Date.now() }));
      navigate('/overview');
    }, 600);
  };

  return (
    <div className="min-h-screen flex">
      <section className="hidden lg:flex w-1/2 flex-col justify-between p-12 min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-100 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-sky-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between w-full">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur border border-white/60 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">Live Telemetry Pipeline</span>
          </div>
        </div>
        <div className="relative z-10 w-full max-w-xl mx-auto my-auto space-y-4 py-8">
          <div className="bg-white/90 backdrop-blur rounded-2xl p-6 border border-white/80 shadow-xl shadow-primary/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Autonomous ML</span>
                <h2 className="text-base font-bold text-slate-900">Predictive Intelligence Platform</h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-primary text-xs font-semibold flex items-center gap-1.5 border border-indigo-100">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                99.98% SLA
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MaterialIcon name="troubleshoot" size={18} className="text-primary" />
                    <span className="text-xs font-semibold text-slate-900">Churn Risk</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">94.8%</span>
                </div>
                <div className="w-full bg-indigo-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '94.8%' }} />
                </div>
              </div>
              <div className="p-3.5 bg-sky-50/50 rounded-xl border border-sky-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MaterialIcon name="trending_up" size={18} className="text-sky-600" />
                    <span className="text-xs font-semibold text-slate-900">Revenue Forecast</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900">±2.1%</span>
                </div>
                <div className="w-full bg-sky-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: '82%' }} />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white/90 backdrop-blur rounded-2xl p-5 border border-white/80 shadow-xl shadow-primary/5 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <MaterialIcon name="shield_check" size={22} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Automated Data Drift Safeguards</p>
                <p className="text-xs text-slate-500">Live continuous KS-test feature variance indicator</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-700 uppercase">Guarded</span>
            </div>
          </div>
        </div>
        <div className="relative z-10 space-y-3 pt-4 border-t border-indigo-100/60">
          <p className="text-xs text-slate-600 font-medium text-center sm:text-left">
            Trusted by enterprise revenue operations &amp; machine learning teams at scale.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { icon: 'verified_user', label: 'SOC 2 Type II Certified' },
              { icon: 'lock', label: '256-bit TLS Encryption' },
              { icon: 'database', label: 'Zero Data Retention' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/70 backdrop-blur border border-white/80 shadow-sm">
                <MaterialIcon name={b.icon} size={18} className="text-primary" />
                <span className="text-xs font-semibold text-slate-900">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="w-full lg:w-1/2 flex flex-col justify-center p-8 sm:p-12 lg:p-16 min-h-screen">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex items-center gap-2.5 mb-8">
            <LogoMark size={36} />
            <div>
              <p className="text-base font-bold text-slate-900 tracking-tight">PRISM</p>
              <p className="text-[11px] text-slate-500">Predictive Intelligence</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
          <p className="text-sm text-slate-500 mt-1">Start predicting churn and forecasting revenue.</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="Alex Kumar"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="Min. 8 characters"
              />
            </div>
            {error && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <MaterialIcon name="error" size={14} />
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:bg-primary-container text-white font-medium text-sm rounded-lg tracking-wide shadow-md shadow-primary/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create account'}
              {!loading && <MaterialIcon name="arrow_forward" size={18} />}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/signin" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
        </div>
        <footer className="pt-6 mt-8 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>© 2025 PRISM Systems Inc.</span>
          <div className="flex items-center gap-4">
            <a className="hover:text-slate-900 transition" href="#">Documentation</a>
            <span className="text-slate-300">•</span>
            <a className="hover:text-slate-900 transition" href="#">API Status</a>
            <span className="text-slate-300">•</span>
            <a className="hover:text-slate-900 transition" href="#">Privacy</a>
          </div>
        </footer>
      </section>
    </div>
  );
}
