import { NavLink } from 'react-router-dom';
import MaterialIcon from './MaterialIcon';
import { LogoMark } from './TopNav';

const RAIL = [
  { to: '/overview', label: 'Overview', icon: 'home' },
  { to: '/forecast', label: 'Sales Forecast', icon: 'bar_chart' },
  { to: '/churn', label: 'Churn Intelligence', icon: 'diversity_3', alert: true },
  { to: '/customers', label: 'Customer Book', icon: 'groups' },
  { to: '/model-health', label: 'Model Health', icon: 'monitor_heart' },
  { to: '/data', label: 'Data Pipeline', icon: 'database' },
  { to: '/reports', label: 'Reports', icon: 'description' },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

/** Fixed left navigation rail. */
export default function Sidebar({ collapsed, onToggle }: Props) {
  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 bg-white/80 backdrop-blur-xl
        border-r border-hairline transition-[width] duration-200 ease-out ${
          collapsed ? 'w-[76px]' : 'w-[248px]'
        }`}
    >
      {/* Brand */}
      <div className={`h-16 flex items-center gap-3 px-4 shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <LogoMark size={30} />
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[17px] font-bold text-ink tracking-tight leading-none">PRISM</p>
            <p className="text-[10px] text-muted leading-none mt-1">Predictive Intelligence</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {RAIL.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `rail-item ${isActive ? 'rail-item-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`
            }
          >
            <MaterialIcon name={item.icon} size={20} />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {item.alert && !collapsed && <span className="ml-auto dot bg-accent-rose animate-pulse-soft" />}
            {item.alert && collapsed && (
              <span className="absolute right-3 top-2 dot bg-accent-rose animate-pulse-soft" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer insight + collapse control */}
      <div className="p-3 space-y-3 shrink-0">
        {!collapsed && (
          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/60 border border-hairline p-3.5">
            <p className="rail-caption">
              See what's coming.
              <br />
              Not just what happened.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <LogoMark size={18} />
              <div>
                <p className="text-[11px] font-bold text-ink leading-none">PRISM</p>
                <p className="text-[10px] text-muted leading-none mt-0.5">v2.4</p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-muted
            border border-hairline bg-white transition-colors duration-150 hover:bg-slate-50 hover:text-ink"
          title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          <MaterialIcon name={collapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'} size={18} />
          {!collapsed && <span className="text-[11px] font-semibold">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}