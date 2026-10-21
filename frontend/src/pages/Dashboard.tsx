import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, CheckCircle2, AlertTriangle, ArrowUpRight,
  ShieldCheck, Share2, Plus, Sparkles, Clock, Sliders
} from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, Cell, XAxis, Tooltip } from 'recharts';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import MiniCalendar from '../components/MiniCalendar';
import CreateEventModal from '../components/CreateEventModal';
import { formatINR, formatDate } from '../utils/format';

function getMatchedVendorLabel(task: any, vendors: any[]): string {
  if (!vendors || vendors.length === 0) return 'In-house / Organizer';
  const text = ((task.name || '') + ' ' + (task.description || '')).toLowerCase();

  for (const v of vendors) {
    const cat = (v.category || '').toLowerCase();
    const parts = cat.split(/[\s/&,]+/);
    if (parts.some((p: string) => p.length > 3 && text.includes(p))) {
      return v.category;
    }
  }
  if (text.includes('venue') || text.includes('hall') || text.includes('location')) {
    const v = vendors.find(x => (x.category || '').toLowerCase().includes('venue'));
    if (v) return v.category;
  }
  if (text.includes('cater') || text.includes('food') || text.includes('menu') || text.includes('dinner') || text.includes('lunch')) {
    const v = vendors.find(x => (x.category || '').toLowerCase().includes('cater') || (x.category || '').toLowerCase().includes('food'));
    if (v) return v.category;
  }
  if (text.includes('photo') || text.includes('video') || text.includes('camera')) {
    const v = vendors.find(x => (x.category || '').toLowerCase().includes('photo') || (x.category || '').toLowerCase().includes('video'));
    if (v) return v.category;
  }
  if (text.includes('cake') || text.includes('bakery')) {
    const v = vendors.find(x => (x.category || '').toLowerCase().includes('cake') || (x.category || '').toLowerCase().includes('bakery'));
    if (v) return v.category;
  }
  if (text.includes('music') || text.includes('dj') || text.includes('sound') || text.includes('band')) {
    const v = vendors.find(x => (x.category || '').toLowerCase().includes('sound') || (x.category || '').toLowerCase().includes('music') || (x.category || '').toLowerCase().includes('dj'));
    if (v) return v.category;
  }
  if (text.includes('decor') || text.includes('flower') || text.includes('floral')) {
    const v = vendors.find(x => (x.category || '').toLowerCase().includes('decor') || (x.category || '').toLowerCase().includes('flower') || (x.category || '').toLowerCase().includes('florist'));
    if (v) return v.category;
  }
  return 'In-house / Organizer';
}

export default function Dashboard() {
  const { activeEvent, activeEventId, refreshActiveEvent, refreshEvents } = useApp();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'schedule' | 'timeline' | 'tasks' | 'planforge'>('schedule');
  const [budgetData, setBudgetData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [validation, setValidation] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load event-specific details
  useEffect(() => {
    if (!activeEventId) return;

    let mounted = true;
    async function loadData() {
      try {
        const [b, t, v, act, val] = await Promise.all([
          api.getBudget(activeEventId!).catch(() => null),
          api.listTasks(activeEventId!).catch(() => []),
          api.listVendors(activeEventId!).catch(() => []),
          api.getActivities(activeEventId!).catch(() => []),
          api.validatePlan(activeEventId!).catch(() => null),
        ]);

        if (mounted) {
          setBudgetData(b);
          setTasks(t);
          setVendors(v);
          setActivities(act);
          setValidation(val);
        }
      } catch (err) {
        console.error('Error loading dashboard data', err);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [activeEventId]);

  const handleTaskStatusChange = async (taskId: string, currentStatus: string) => {
    if (!activeEventId) return;
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateTaskStatus(activeEventId, taskId, newStatus);
      const updated = await api.listTasks(activeEventId);
      setTasks(updated);
      refreshActiveEvent();
    } catch (e) {
      console.error('Failed to update task status', e);
    }
  };

  if (!activeEvent) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
            <Calendar size={28} />
          </div>
          <h2 className="text-xl font-bold text-[#1a2b4a] mb-2">No Active Event Selected</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Get started by creating your first celebration or event. Choose between Manual Planner or AI Planner with PlanForge optimization.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            Create Event
          </button>
        </div>
        <CreateEventModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
      </div>
    );
  }

  // Exact distinct budget metrics sourced from backend calculations
  const totalBudget = activeEvent.total_budget || 0;
  const allocatedBudget = budgetData?.allocated_budget ?? activeEvent.allocated_budget ?? 0;
  const unallocatedBudget = budgetData?.unallocated_budget ?? Math.max(0, totalBudget - allocatedBudget);
  const actualSpent = budgetData?.actual_expenses ?? activeEvent.actual_expenses ?? 0;
  const unspentBudget = budgetData?.unspent_budget ?? Math.max(0, totalBudget - actualSpent);
  const isFeasible = validation ? validation.is_feasible : activeEvent.feasibility_status === 'feasible';

  const allocatedPct = Math.round((allocatedBudget / (totalBudget || 1)) * 100);
  const spentPct = Math.round((actualSpent / (totalBudget || 1)) * 100);

  // Real task distribution data for the velocity sparkline
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const blockedCount = tasks.filter(t => t.status === 'blocked').length;

  const realTaskVelocityData = [
    { name: 'Pending', count: pendingCount, fill: '#94a3b8' },
    { name: 'In Progress', count: inProgressCount, fill: '#38bdf8' },
    { name: 'Completed', count: completedCount, fill: '#2563eb' },
    { name: 'Blocked', count: blockedCount, fill: '#f43f5e' },
  ];

  const taskProgressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const isManualMode = activeEvent.planning_mode === 'manual';

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-[#f4f6f8]">
      {/* Center Main Dashboard Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
        {/* Top Header Row matching visual reference */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#1a2b4a] tracking-tight">Project Dashboard</h1>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isManualMode ? 'bg-gray-100 text-gray-700' : 'bg-indigo-50 text-indigo-700'
              }`}>
                {isManualMode ? <Sliders size={11} /> : <Sparkles size={11} />}
                {isManualMode ? 'Manual Planner' : 'AI Planner'}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 mt-0.5 flex items-center gap-1.5">
              <span>{formatDate(new Date().toISOString())}</span>
              <span className="text-gray-300">•</span>
              <span className="text-blue-600 font-bold uppercase">{activeEvent.event_type}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200/80 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Calendar size={14} className="text-gray-500" />
              <span>This week</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/ai-workspace')}
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200/80 text-[13px] font-semibold text-blue-600 hover:bg-blue-50/50 shadow-2xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={14} className="text-blue-600" />
              <span>AI Replan</span>
            </button>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={15} />
              <span>+ Event</span>
            </button>
          </div>
        </div>

        {/* Hero Card matching Aventik reference with 3 distinct metrics + Glowing Blue Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Left 8 cols: Running events info and 3 metrics */}
          <div className="xl:col-span-8 flex flex-col justify-between space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Running event</span>
                <h2 className="text-2xl font-black text-[#1a2b4a] mt-0.5 tracking-tight">{activeEvent.name}</h2>
                <p className="text-[13px] font-semibold text-gray-500 mt-1">
                  Scheduled for {formatDate(activeEvent.event_date)} • {activeEvent.location}
                </p>
              </div>

              {/* Guest avatars stack */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center">AK</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">RM</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">PS</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-purple-500 text-white text-[11px] font-bold flex items-center justify-center">
                    +{activeEvent.guest_count}
                  </div>
                </div>
                <button
                  type="button"
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                  title="Share event"
                >
                  <Share2 size={13} />
                </button>
              </div>
            </div>

            {/* 3 Metrics Row: Total Budget, Planned Allocation, Actual Spending */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4">
                <p className="text-xl font-black text-[#1a2b4a] tracking-tight">{formatINR(totalBudget)}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-1">Total Budget</p>
                <div className="mt-2 text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                  <span>Authorized Ceiling Cap</span>
                </div>
              </div>

              <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4">
                <p className="text-xl font-black text-[#1a2b4a] tracking-tight">{formatINR(allocatedBudget)}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-1">Planned Allocation</p>
                <div className="mt-2 text-[11px] font-semibold text-blue-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>{allocatedPct}% allocated • {formatINR(unallocatedBudget)} unallocated</span>
                </div>
              </div>

              <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-4">
                <p className="text-xl font-black text-[#1a2b4a] tracking-tight">{formatINR(actualSpent)}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mt-1">Actual Spending</p>
                <div className="mt-2 text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>{spentPct}% disbursed from cap</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 4 cols: Glowing Solid Blue Card: Unspent Funds (Remaining Cash) */}
          <div className="xl:col-span-4 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white flex flex-col justify-between shadow-md relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10 blur-md pointer-events-none" />

            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs">
                <ShieldCheck size={20} strokeWidth={2.5} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-100/90">
                PlanForge Engine
              </span>
            </div>

            <div className="my-4">
              <span className="text-3xl font-black tracking-tight block">
                {formatINR(unspentBudget)}
              </span>
              <p className="text-[13px] text-blue-100/90 font-medium mt-1">
                Available After Commitments
              </p>
              <p className="text-[11px] text-blue-200 mt-0.5">
                After spending and vendor commitments
              </p>
              <p className="text-[11px] text-blue-200 mt-0.5">
                {formatINR(unallocatedBudget)} unallocated to categories
              </p>
            </div>

            <div className="pt-3 border-t border-white/15 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isFeasible ? (
                  <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-300 shrink-0" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isFeasible ? 'Constraints Feasible' : 'Conflicts Detected'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/ai-workspace')}
                className="text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Audit</span>
                <ArrowUpRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Tabs Section */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          {/* Tabs header matching visual reference */}
          <div className="px-6 border-b border-gray-100 flex items-center gap-8">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`py-4 text-[13px] font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'schedule'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              Schedule & Plan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timeline')}
              className={`py-4 text-[13px] font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'timeline'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              Timeline Bar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`py-4 text-[13px] font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'tasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              Tasks Checklist ({completedCount}/{tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('planforge')}
              className={`py-4 text-[13px] font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'planforge'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}
            >
              PlanForge Audit
            </button>
          </div>

          {/* TAB 1: Schedule Table matching Aventik reference */}
          {activeTab === 'schedule' && (
            <div className="p-6">
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">
                  {isManualMode
                    ? 'No tasks created yet. Click "Tasks" in the sidebar to add your first preparation item.'
                    : 'No tasks scheduled.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        <th className="pb-3 font-semibold">Deadline</th>
                        <th className="pb-3 font-semibold">Event / Task</th>
                        <th className="pb-3 font-semibold">Priority</th>
                        <th className="pb-3 font-semibold">Vendor / Service</th>
                        <th className="pb-3 font-semibold">Owner</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tasks.slice(0, 8).map((task) => {
                        const matchedVendorLabel = getMatchedVendorLabel(task, vendors);
                        const isComplete = task.status === 'completed';
                        return (
                          <tr key={task.id} className="hover:bg-gray-50/70 transition-colors group">
                            <td className="py-3.5 text-gray-500 font-medium">
                              {formatDate(task.due_date || activeEvent.event_date)}
                            </td>
                            <td className="py-3.5 font-bold text-[#1a2b4a]">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleTaskStatusChange(task.id, task.status)}
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                                    isComplete
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-gray-300 hover:border-blue-500'
                                  }`}
                                >
                                  {isComplete && <CheckCircle2 size={12} />}
                                </button>
                                <span className={isComplete ? 'line-through text-gray-400' : ''}>
                                  {task.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 text-gray-500 font-medium capitalize">
                              <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold ${
                                task.priority === 'critical' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="py-3.5 text-gray-600 font-medium">
                              <span className="px-2 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[11px] text-gray-700 font-medium">
                                {matchedVendorLabel}
                              </span>
                            </td>
                            <td className="py-3.5 text-gray-600 font-medium">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                                  {task.assigned_to ? task.assigned_to[0] : 'O'}
                                </div>
                                <span className="text-xs">{task.assigned_to || 'Organizer'}</span>
                              </div>
                            </td>
                            <td className="py-3.5">
                              <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase ${
                                isComplete
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : task.status === 'in_progress'
                                  ? 'bg-blue-50 text-blue-600'
                                  : 'bg-amber-50 text-amber-600'
                              }`}>
                                {task.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Embedded Schedule Activities */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                {activities && activities.length > 0 ? (
                  <div className="space-y-2">
                    {activities.map((act) => (
                      <div key={act.id} className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                          {act.entity_type ? act.entity_type.charAt(0).toUpperCase() : 'A'}
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#1a2b4a] truncate">{act.action}</p>
                          {act.details && (
                            <p className="text-xs text-gray-500 line-clamp-2 bg-gray-50 p-1 rounded-lg border border-gray-100 mt-1">
                              {act.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-3 text-center bg-gray-50 rounded-xl">
                    No scheduled activities yet. Add tasks or create a timeline to start organizing your event.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Timeline Bar */}
          {activeTab === 'timeline' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1a2b4a]">Task Dependency Timeline</h3>
                <span className="text-xs text-gray-400 font-semibold">{tasks.length} Total tasks</span>
              </div>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="bg-gray-50/70 border border-gray-100 rounded-xl p-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <Clock size={16} className="text-blue-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-[13px] font-bold text-[#1a2b4a] truncate">{task.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {task.due_date ? `Deadline: ${formatDate(task.due_date)}` : 'No explicit deadline'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-gray-500">{task.duration_days} day(s)</span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-700'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Tasks Checklist */}
          {activeTab === 'tasks' && (
            <div className="p-6 space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleTaskStatusChange(task.id, task.status)}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <p className={`text-[13px] font-bold ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-[#1a2b4a]'}`}>
                        {task.name}
                      </p>
                      <p className="text-[11px] text-gray-400">Due: {formatDate(task.due_date || activeEvent.event_date)}</p>
                    </div>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                    task.priority === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: PlanForge Audit */}
          {activeTab === 'planforge' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#1a2b4a]">PlanForge Deterministic Constraint Verification</h3>
                  <p className="text-xs text-gray-500">Evaluates budget caps, mandatory costs, task dependencies, and deadlines.</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isFeasible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {validation?.overall_status || activeEvent.feasibility_status}
                </span>
              </div>

              {validation && (
                <div className="space-y-4 pt-2">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">Engine Summary</h4>
                    <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed font-mono">
                      {validation.summary}
                    </p>
                  </div>

                  {validation.violations && validation.violations.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                      <h4 className="text-xs font-bold uppercase text-rose-700 tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={15} /> Constraint Violations Detected
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-rose-800 font-medium">
                        {validation.violations.map((v: string, idx: number) => (
                          <li key={idx}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validation.warnings && validation.warnings.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <h4 className="text-xs font-bold uppercase text-amber-700 tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={15} /> Warnings & Bounds Notices
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-amber-800">
                        {validation.warnings.map((w: string, idx: number) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Right Side Panel matching Aventik reference with Mini Calendar & Activity */}
      <aside className="w-full lg:w-80 bg-white border-l border-gray-100 p-6 space-y-6 shrink-0">
        {/* User Greeting Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center text-xs font-bold">
              AV
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#1a2b4a] leading-none">Aventra Studio 👋</p>
              <p className="text-[11px] text-gray-400 mt-1 font-medium">Event Orchestrator</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="w-7 h-7 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <ArrowUpRight size={14} />
          </button>
        </div>

        {/* Mini Calendar Component */}
        <MiniCalendar highlightDate={activeEvent.event_date} />

        {/* Activity Stream matching Aventik visual layout */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1a2b4a]">Activity Stream</h3>
            <span className="text-[11px] text-gray-400 font-medium">Live</span>
          </div>

          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.slice(0, 3).map((act) => (
                <div key={act.id} className="flex items-start gap-3 text-left">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {act.entity_type === 'event' ? 'EV' : act.entity_type === 'task' ? 'TK' : 'BG'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1a2b4a] truncate leading-tight">
                      {act.action}
                    </p>
                    {act.details && (
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                        {act.details}
                      </p>
                    )}
                    <span className="text-[10px] text-gray-400 font-medium mt-1 block">
                      {act.created_at ? formatDate(act.created_at) : 'Recent'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-gray-400 py-3 text-center bg-gray-50 rounded-xl">
                No recent activity recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Real Task Velocity Sparkline widget based on actual task data */}
        <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-base font-black text-[#1a2b4a]">{completedCount} of {tasks.length} Tasks</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Execution Velocity</p>
            </div>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">
              {taskProgressPct}% Done
            </span>
          </div>

          {/* Mini vertical bar chart showing real distribution */}
          <div className="h-16 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={realTaskVelocityData}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                <Tooltip formatter={(value: any) => [`${value} tasks`, 'Count']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {realTaskVelocityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Real task distribution across workflow states
          </p>
        </div>
      </aside>

      {/* Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          refreshEvents();
          refreshActiveEvent();
        }}
      />
    </div>
  );
}
