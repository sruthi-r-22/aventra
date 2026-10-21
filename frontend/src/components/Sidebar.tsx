import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  Clock,
  CheckSquare,
  Users,
  Sparkles,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Sidebar() {
  const { activeEvent } = useApp();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/events', icon: Calendar, label: 'My Events' },
    {
      to: '/tasks',
      icon: CheckSquare,
      label: 'Tasks',
      badge: activeEvent ? `${activeEvent.task_count - activeEvent.completed_tasks}` : undefined,
    },
    { to: '/timeline', icon: Clock, label: 'Timeline' },
    { to: '/budget', icon: Wallet, label: 'Budget' },
    { to: '/vendors', icon: Users, label: 'Vendors' },
    { to: '/ai-workspace', icon: Sparkles, label: 'AI Workspace' },
  ];

  return (
    <aside className="w-64 min-h-screen bg-[#F0F2EC] border-r border-[#E2E6DC] flex flex-col shrink-0 select-none transition-colors">
      {/* Brand Logo matching Aventra reference design */}
      <div
        onClick={() => navigate('/welcome')}
        className="px-6 py-6 flex items-center gap-3 cursor-pointer group"
        title="Go to Welcome Page"
      >
        {/* Dual organic pebble / leaf logo icon */}
        <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
          <div className="absolute left-0 top-0 w-5 h-7 bg-[#164B3D] rounded-[50%_50%_50%_50%/70%_70%_30%_30%] -rotate-12 transition-transform group-hover:scale-105" />
          <div className="absolute right-0 bottom-0 w-4 h-6 bg-[#52B9A3] rounded-[50%_50%_50%_50%/30%_30%_70%_70%] opacity-90 transition-transform group-hover:scale-105" />
        </div>

        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-[#17252B] leading-none">
            Aventra
          </span>
          <span className="text-[10px] text-[#66717A] font-medium tracking-wide mt-1">
            Powered by PlanForge
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1.5" aria-label="Main navigation">
        {navItems.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative group
              ${
                isActive
                  ? 'bg-[#E2E8DE] text-[#164B3D] font-bold shadow-2xs'
                  : 'text-[#66717A] hover:bg-white/60 hover:text-[#17252B]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.3 : 1.8}
                  className={isActive ? 'text-[#164B3D]' : 'text-[#66717A] group-hover:text-[#17252B]'}
                />
                <span className="flex-1 truncate">{label}</span>
                {badge && Number(badge) > 0 && (
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-[#164B3D]/10 text-[#164B3D]'
                        : 'bg-[#E2E8DE] text-[#66717A]'
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom CTA Card: Plan Smarter with AI (matching reference image) */}
      <div className="p-4">
        <div className="bg-white/95 rounded-2xl p-4 border border-[#E2E6DC] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center">
            <Sparkles size={18} strokeWidth={2.2} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#17252B] leading-snug">
              Plan smarter with AI
            </h4>
            <p className="text-xs text-[#66717A] mt-1 leading-relaxed">
              Get intelligent suggestions and real-time replanning.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/ai-workspace')}
            className="w-full bg-[#164B3D] hover:bg-[#0F382E] text-white py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-98"
          >
            <span>Open AI Workspace</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Settings / Footer item */}
      <div className="p-4 pt-1 border-t border-[#E2E6DC]/80">
        <button
          type="button"
          onClick={() => navigate('/events')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-[#66717A] hover:text-[#17252B] hover:bg-white/50 transition-colors cursor-pointer"
        >
          <Settings size={18} className="text-[#66717A]" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
