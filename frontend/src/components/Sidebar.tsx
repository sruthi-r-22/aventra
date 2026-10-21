import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Wallet, Clock, CheckSquare,
  Users, Sparkles, ChevronRight, Plus, Activity,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Sidebar() {
  const { activeEvent } = useApp();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/events', icon: Calendar, label: 'My Events' },
    { to: '/budget', icon: Wallet, label: 'Budget' },
    { to: '/timeline', icon: Clock, label: 'Timeline' },
    {
      to: '/tasks',
      icon: CheckSquare,
      label: 'Tasks',
      badge: activeEvent ? `${activeEvent.task_count - activeEvent.completed_tasks}` : undefined,
    },
    { to: '/vendors', icon: Users, label: 'Vendors' },
    { to: '/ai-workspace', icon: Sparkles, label: 'AI Workspace', isAi: true },
  ];

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-100 flex flex-col shrink-0 select-none">
      {/* Brand Logo matching Aventik reference typography */}
      <div className="px-6 py-6 border-b border-gray-100/80 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center shadow-xs">
          <Activity size={18} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-[17px] font-black text-[#1a2b4a] tracking-tight">Aventra</span>
          <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase leading-none mt-0.5">PlanForge</p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1" aria-label="Main navigation">
        {navItems.map(({ to, icon: Icon, label, badge, isAi }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all relative group
              ${isActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-white' : isAi ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-600'} />
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {badge}
                  </span>
                )}
                {isActive && !badge && <ChevronRight size={14} className="text-white/70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Active Event Card matching Aventik reference blue card style */}
      {activeEvent && (
        <div className="px-3 pb-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-white/10 blur-xs pointer-events-none" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100">Active Event</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                activeEvent.feasibility_status === 'feasible'
                  ? 'bg-emerald-400 text-emerald-950'
                  : activeEvent.feasibility_status === 'infeasible'
                  ? 'bg-rose-400 text-rose-950'
                  : 'bg-amber-300 text-amber-950'
              }`}>
                {activeEvent.feasibility_status}
              </span>
            </div>
            <p className="text-[14px] font-bold truncate leading-tight">{activeEvent.name}</p>
            <p className="text-[11px] text-blue-100/90 mt-1">{activeEvent.event_date}</p>
            <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-[11px] text-blue-100">
              <span>{activeEvent.days_remaining} days left</span>
              <span className="font-semibold">{activeEvent.completed_tasks}/{activeEvent.task_count} tasks</span>
            </div>
          </div>
        </div>
      )}

      {/* New Event Action */}
      <div className="p-3 border-t border-gray-100">
        <button
          type="button"
          onClick={() => navigate('/events?create=true')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-gray-300 text-[13px] font-semibold text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer"
        >
          <Plus size={16} />
          Create Event
        </button>
      </div>
    </aside>
  );
}
