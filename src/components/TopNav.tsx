import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MaterialIcon from './MaterialIcon';
import logoUrl from '../assets/prism-logo.png';

// PRISM logo mark — crystal prism icon from the Stitch design files.
export function LogoMark({ size = 30 }: { size?: number }) {
  return <img src={logoUrl} alt="PRISM" style={{ width: size, height: size, objectFit: 'contain' }} className="shrink-0" />;
}

const WORKFLOW = ['Predict', 'Explain', 'Prioritize', 'Act', 'Monitor'];

interface Props {
  onOpenAssistant: () => void;
  lastUpdated: number;
}

/** Slim top command bar: workflow breadcrumb, search, settings, account. */
export default function TopNav({ onOpenAssistant, lastUpdated }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const session = JSON.parse(localStorage.getItem('prism_session') || '{}');
  const initials = (session.name || session.email || 'AK')
    .split(' ')
    .map((w: string) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const signOut = () => {
    localStorage.removeItem('prism_session');
    navigate('/signin');
  };

  return (
    <header className="h-16 shrink-0 bg-white/80 backdrop-blur-xl border-b border-hairline flex items-center gap-4 px-5">
      {/* Workflow breadcrumb */}
      <div className="hidden md:flex items-center gap-1.5 min-w-0">
        {WORKFLOW.map((step, i) => (
          <div key={step} className="flex items-center gap-1.5">
            {i > 0 && <MaterialIcon name="arrow_forward" size={12} className="text-faint" />}
            <span className="text-[11px] font-semibold text-muted whitespace-nowrap">{step}</span>
          </div>
        ))}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:flex items-center w-[280px] xl:w-[340px]">
        <MaterialIcon name="search" size={18} className="absolute left-3.5 text-faint pointer-events-none" />
        <input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchValue.trim()) {
              navigate(`/customers?q=${encodeURIComponent(searchValue.trim())}`);
              setSearchValue('');
            }
          }}
          className="input pl-10 pr-12"
          placeholder="Search store, product, customer…"
          type="text"
        />
        <kbd className="absolute right-3 text-[10px] font-semibold text-faint bg-slate-100 rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </div>

      <button onClick={onOpenAssistant} className="btn-icon" title="PRISM Copilot">
        <MaterialIcon name="auto_awesome" size={19} className="text-accent-violet" />
      </button>
      <button className="btn-icon" title="Settings">
        <MaterialIcon name="settings" size={19} />
      </button>

      {/* Account menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-blue to-accent-violet
            text-white text-[11px] font-bold flex items-center justify-center
            shadow-[0_4px_14px_-4px_rgba(79,70,229,0.7)] transition-transform duration-150 hover:scale-105"
          title="Account"
        >
          {initials}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-12 w-60 bg-white rounded-2xl border border-hairline shadow-popover py-1.5 z-50 animate-slide-up">
            <div className="px-4 py-3 border-b border-hairline-soft">
              <p className="text-[13px] font-bold text-ink">{session.name || 'Analyst'}</p>
              <p className="text-[11px] text-muted truncate">{session.email || 'analyst@prism'}</p>
              <p className="text-[10px] text-faint mt-1">
                Session · {new Date(lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            {[
              { icon: 'person', label: 'Account settings' },
              { icon: 'tune', label: 'Preferences' },
              { icon: 'receipt_long', label: 'Billing & usage' },
              { icon: 'help', label: 'Documentation' },
            ].map((row) => (
              <button
                key={row.label}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-ink
                  transition-colors duration-150 hover:bg-slate-50"
              >
                <MaterialIcon name={row.icon} size={18} className="text-muted" />
                {row.label}
              </button>
            ))}
            <div className="my-1 border-t border-hairline-soft" />
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold text-accent-rose
                transition-colors duration-150 hover:bg-rose-50"
            >
              <MaterialIcon name="logout" size={18} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}