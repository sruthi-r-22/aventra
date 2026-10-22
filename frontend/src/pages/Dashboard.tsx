import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  LayoutDashboard,
  Plus,
  ArrowRight,
  CheckCircle2,
  Users,
  MapPin,
  Wallet,
  Store,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { TaskStatus } from '../api/types';
import api from '../api/client';
import CreateEventModal from '../components/CreateEventModal';
import { formatINR, formatDate } from '../utils/format';

function getEventHeroImage(eventType: string, eventName: string): string {
  const type = (eventType || '').toLowerCase();
  const name = (eventName || '').toLowerCase();

  if (type.includes('wedding') || name.includes('wedding') || name.includes('marriage')) {
    return '/landing/wedding.jpg';
  }
  if (type.includes('birthday') || name.includes('birthday') || name.includes('party')) {
    return '/landing/birthday.jpg';
  }
  if (
    type.includes('corporate') ||
    type.includes('conference') ||
    name.includes('tech') ||
    name.includes('summit') ||
    name.includes('business')
  ) {
    return '/landing/corporate.jpg';
  }
  if (
    type.includes('fest') ||
    type.includes('festival') ||
    type.includes('celebration') ||
    type.includes('concert') ||
    type.includes('college')
  ) {
    return '/landing/festival.jpg';
  }
  return '/landing/wedding.jpg';
}

interface EventActivity {
  id: string;
  action: string;
  entity_type?: string | null;
  details?: string | null;
  created_at?: string | null;
}

export default function Dashboard() {
  const { events, activeEvent, activeEventId, setActiveEventId, refreshActiveEvent, refreshEvents } =
    useApp();
  const navigate = useNavigate();

  const [budgetData, setBudgetData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openHeaderMenu, setOpenHeaderMenu] = useState<'notifications' | 'profile' | null>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<EventActivity[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState(false);

  // Mini calendar month state
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!openHeaderMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerMenuRef.current?.contains(event.target)) {
        setOpenHeaderMenu(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenHeaderMenu(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openHeaderMenu]);

  useEffect(() => {
    if (openHeaderMenu !== 'notifications') return;

    if (!activeEventId) {
      setNotifications([]);
      setNotificationsLoading(false);
      setNotificationsError(false);
      return;
    }

    let mounted = true;
    setNotifications([]);
    setNotificationsLoading(true);
    setNotificationsError(false);

    api
      .getActivities(activeEventId)
      .then((activities: EventActivity[]) => {
        if (mounted) setNotifications(activities);
      })
      .catch((error: unknown) => {
        console.error('Failed to load notifications', error);
        if (mounted) setNotificationsError(true);
      })
      .finally(() => {
        if (mounted) setNotificationsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [openHeaderMenu, activeEventId]);

  // Load event-specific details
  useEffect(() => {
    if (!activeEventId) return;

    let mounted = true;
    async function loadData() {
      try {
        const [b, t, v] = await Promise.all([
          api.getBudget(activeEventId!).catch(() => null),
          api.listTasks(activeEventId!).catch(() => []),
          api.listVendors(activeEventId!).catch(() => []),
        ]);

        if (mounted) {
          setBudgetData(b);
          setTasks(t);
          setVendors(v);
        }
      } catch (err) {
        console.error('Error loading dashboard data', err);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [activeEventId]);

  // Sync calendar with active event date when event changes
  useEffect(() => {
    if (activeEvent?.event_date) {
      const parsed = new Date(activeEvent.event_date);
      if (!isNaN(parsed.getTime())) {
        setCalendarDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      }
    }
  }, [activeEvent?.event_date]);

  const handleTaskStatusChange = async (taskId: string, currentStatus: TaskStatus) => {
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
        <div className="bg-white rounded-3xl border border-[#E2E6DC] p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center mx-auto mb-4">
            <CalendarIcon size={28} />
          </div>
          <h2 className="text-xl font-bold text-[#17252B] mb-2 font-serif-hero">
            No Active Event Selected
          </h2>
          <p className="text-[#66717A] text-sm max-w-md mx-auto mb-6">
            Get started by creating your first celebration or event with PlanForge constraint optimization.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#164B3D] text-white rounded-full text-sm font-bold hover:bg-[#0F382E] transition-all shadow-xs cursor-pointer"
          >
            <Plus size={16} />
            <span>Create Event</span>
          </button>
        </div>
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

  // Exact distinct budget metrics sourced from backend calculations
  const totalBudget = activeEvent.total_budget || 0;
  const allocatedBudget = budgetData?.allocated_budget ?? activeEvent.allocated_budget ?? 0;
  const unallocatedBudget =
    budgetData?.unallocated_budget ?? Math.max(0, totalBudget - allocatedBudget);
  const actualSpent = budgetData?.actual_expenses ?? activeEvent.actual_expenses ?? 0;
  const vendorCommitments = budgetData?.vendor_commitments ?? 0;
  const unspentBudget =
    budgetData?.unspent_budget ?? totalBudget - actualSpent - vendorCommitments;
  const cashRemaining = totalBudget - actualSpent;

  // Task statistics
  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const taskProgressPct =
    tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  // Vendor statistics
  const confirmedVendors = vendors.filter(
    (v) => v.booking_status === 'confirmed' || v.booking_status === 'booked'
  );
  const inProgressVendors = vendors.filter((v) => v.booking_status === 'negotiating');
  const pendingVendors = vendors.filter(
    (v) =>
      v.booking_status === 'not_contacted' ||
      v.booking_status === 'contacted' ||
      !v.booking_status
  );
  const cancelledVendors = vendors.filter((v) => v.booking_status === 'cancelled');

  const vendorProgressPct =
    vendors.length > 0 ? Math.round((confirmedVendors.length / vendors.length) * 100) : 0;

  const budgetMetrics = [
    { name: 'Allocated Budget', value: allocatedBudget, color: '#164B3D' },
    { name: 'Actual Spending', value: actualSpent, color: '#52B9A3' },
    { name: 'Vendor Commitments', value: vendorCommitments, color: '#88C0B3' },
    { name: 'Unallocated Budget', value: unallocatedBudget, color: '#B8C9BE' },
  ];

  // Calendar calculations
  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();
  const monthName = calendarDate.toLocaleString('default', { month: 'long' });

  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Check if a day has the event date
  const eventDateObj = activeEvent.event_date ? new Date(activeEvent.event_date) : null;
  const isEventDay = (day: number) => {
    if (!eventDateObj || isNaN(eventDateObj.getTime())) return false;
    return (
      eventDateObj.getFullYear() === currentYear &&
      eventDateObj.getMonth() === currentMonth &&
      eventDateObj.getDate() === day
    );
  };

  // Check if a day has any task due dates
  const hasTaskDeadline = (day: number) => {
    return tasks.some((t) => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return (
        !isNaN(d.getTime()) &&
        d.getFullYear() === currentYear &&
        d.getMonth() === currentMonth &&
        d.getDate() === day
      );
    });
  };

  // Upcoming task deadlines (sorted by due_date)
  const upcomingDeadlines = tasks
    .filter((t) => t.due_date && t.status !== 'completed')
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 4);

  return (
    <div className="p-6 sm:p-8 lg:p-10 space-y-8 max-w-[1440px] mx-auto">
      {/* ─── 1. TOP HEADER (matching reference image) ─────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-[#66717A] tracking-wide block">
            Good morning,
          </span>
          <h1 className="font-serif-hero text-2xl sm:text-3xl lg:text-[32px] font-bold text-[#17252B] tracking-tight leading-tight mt-0.5">
            Let's make your event extraordinary.
          </h1>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Active Event Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEventDropdown(!showEventDropdown)}
              className="flex items-center gap-2.5 px-4 py-2.5 bg-white hover:bg-gray-50/80 rounded-2xl text-xs sm:text-sm font-semibold text-[#17252B] border border-[#E2E6DC] shadow-2xs transition-colors cursor-pointer"
            >
              <CalendarIcon size={15} className="text-[#164B3D]" />
              <span className="max-w-44 truncate">{activeEvent.name}</span>
              <ChevronDown size={14} className="text-[#66717A]" />
            </button>

            {showEventDropdown && (
              <div className="absolute right-0 top-12 w-64 bg-white border border-[#E2E6DC] rounded-2xl shadow-xl py-2 z-50">
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#66717A] uppercase tracking-wider">
                  Select Event
                </div>
                {events.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setActiveEventId(e.id);
                      setShowEventDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${
                      e.id === activeEventId ? 'bg-[#E5F3EE] text-[#164B3D] font-bold' : 'text-[#17252B]'
                    }`}
                  >
                    <div className="truncate">
                      <p className="truncate font-medium">{e.name}</p>
                      <p className="text-[10px] text-[#66717A]">
                        {e.event_date} • {e.event_type}
                      </p>
                    </div>
                  </button>
                ))}
                <div className="border-t border-gray-100 mt-1 pt-1 px-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventDropdown(false);
                      setShowCreateModal(true);
                    }}
                    className="w-full text-center py-2 text-xs font-bold text-[#164B3D] hover:bg-[#E5F3EE] rounded-xl transition-colors cursor-pointer"
                  >
                    + Create New Event
                  </button>
                </div>
              </div>
            )}
          </div>

          <div ref={headerMenuRef} className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenHeaderMenu((current) =>
                    current === 'notifications' ? null : 'notifications',
                  )
                }
                className="w-10 h-10 rounded-2xl bg-white border border-[#E2E6DC] flex items-center justify-center text-[#164B3D] hover:bg-[#E5EFE8] transition-colors shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B9A3]"
                aria-label="Notifications"
                aria-haspopup="dialog"
                aria-expanded={openHeaderMenu === 'notifications'}
                aria-controls="dashboard-notifications"
              >
                <Bell size={17} />
              </button>
              {openHeaderMenu === 'notifications' && (
                <section
                  id="dashboard-notifications"
                  role="dialog"
                  aria-labelledby="dashboard-notifications-title"
                  className="absolute right-0 top-full mt-2 z-50 w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-[#E2E6DC] bg-white p-4 shadow-xl"
                >
                  <h2
                    id="dashboard-notifications-title"
                    className="text-sm font-bold text-[#17252B]"
                  >
                    Notifications
                  </h2>
                  {notificationsLoading ? (
                    <p role="status" className="mt-3 rounded-xl bg-[#FAF9F5] px-3 py-4 text-center text-xs text-[#66717A]">
                      Loading notifications...
                    </p>
                  ) : notificationsError ? (
                    <p role="alert" className="mt-3 rounded-xl bg-[#FAF9F5] px-3 py-4 text-center text-xs text-[#66717A]">
                      Notifications couldn&apos;t be loaded.
                    </p>
                  ) : notifications.length === 0 ? (
                    <p className="mt-3 rounded-xl bg-[#FAF9F5] px-3 py-4 text-center text-xs text-[#66717A]">
                      No notifications yet.
                    </p>
                  ) : (
                    <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                      {notifications.map((activity) => (
                        <li
                          key={activity.id}
                          className="rounded-xl px-3 py-2.5 transition-colors hover:bg-[#FAF9F5]"
                        >
                          <p className="text-xs font-semibold text-[#17252B]">{activity.action}</p>
                          {activity.details && (
                            <p className="mt-1 text-xs leading-relaxed text-[#66717A]">
                              {activity.details}
                            </p>
                          )}
                          {activity.created_at && (
                            <time
                              dateTime={activity.created_at}
                              className="mt-1 block text-[10px] text-[#66717A]"
                            >
                              {new Date(activity.created_at).toLocaleString()}
                            </time>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </div>

            {/* Profile menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenHeaderMenu((current) => (current === 'profile' ? null : 'profile'))
                }
                className="w-10 h-10 rounded-full bg-[#E5EFE8] text-[#164B3D] flex items-center justify-center text-sm font-bold border border-[#CCE4DA] hover:bg-[#D8E9E1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B9A3]"
                aria-label="Profile menu for Organizer"
                aria-haspopup="menu"
                aria-expanded={openHeaderMenu === 'profile'}
                aria-controls="dashboard-profile-menu"
              >
                O
              </button>
              {openHeaderMenu === 'profile' && (
                <div
                  id="dashboard-profile-menu"
                  role="menu"
                  aria-label="Profile menu"
                  className="absolute right-0 top-full mt-2 z-50 w-56 max-w-[calc(100vw-3rem)] rounded-2xl border border-[#E2E6DC] bg-white p-2 shadow-xl"
                >
                  <p className="px-3 py-2 text-sm font-bold text-[#17252B]">Organizer</p>
                  <div className="my-1 border-t border-[#E2E6DC]" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenHeaderMenu(null);
                      navigate('/events');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-[#66717A] transition-colors hover:bg-[#E5EFE8] hover:text-[#164B3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B9A3]"
                  >
                    <CalendarIcon size={15} />
                    My Events
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpenHeaderMenu(null);
                      navigate('/dashboard');
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-[#66717A] transition-colors hover:bg-[#E5EFE8] hover:text-[#164B3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B9A3]"
                  >
                    <LayoutDashboard size={15} />
                    Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Primary Create Event button */}
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-[#164B3D] hover:bg-[#0F382E] text-white px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* ─── 2. MAIN DASHBOARD CONTENT (3-column layout) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ─── LEFT & CENTER PANELS (8 Columns) ────────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          {/* Selected Event Overview Hero Card */}
          <div className="bg-white rounded-3xl border border-[#E2E6DC] p-6 sm:p-7 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            {/* Left: Dynamic Event Photograph */}
            <div className="md:col-span-6 h-52 sm:h-56 rounded-2xl overflow-hidden border border-[#E2E6DC] shadow-2xs">
              <img
                src={getEventHeroImage(activeEvent.event_type, activeEvent.name)}
                alt={activeEvent.name}
                className="w-full h-full object-cover"
                loading="eager"
              />
            </div>

            {/* Right: Event Information */}
            <div className="md:col-span-6 flex flex-col justify-center gap-5 py-1">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-[#E5EFE8] text-[#164B3D] border border-[#CCE4DA] text-[10px] font-bold uppercase tracking-wider mb-2.5">
                  Active Event
                </span>
                <h2 className="font-serif-hero text-2xl sm:text-3xl font-bold text-[#17252B] leading-tight tracking-tight line-clamp-2">
                  {activeEvent.name}
                </h2>
              </div>

              {/* Event Details Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                <div className="flex items-center gap-2 text-[#66717A]">
                  <CalendarIcon size={14} className="text-[#164B3D] shrink-0" />
                  <span className="truncate">{formatDate(activeEvent.event_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-[#66717A]">
                  <MapPin size={14} className="text-[#164B3D] shrink-0" />
                  <span className="truncate">{activeEvent.location || 'Location TBA'}</span>
                </div>
                <div className="flex items-center gap-2 text-[#66717A]">
                  <Users size={14} className="text-[#164B3D] shrink-0" />
                  <span>{activeEvent.guest_count} Guests</span>
                </div>
                <div className="flex items-center gap-2 text-[#66717A]">
                  <Wallet size={14} className="text-[#164B3D] shrink-0" />
                  <span className="font-semibold text-[#17252B]">{formatINR(totalBudget)}</span>
                </div>
              </div>

              {/* View Details Button */}
              <div>
                <button
                  type="button"
                  onClick={() => navigate('/events')}
                  className="bg-[#164B3D] hover:bg-[#0F382E] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                >
                  <span>View Details</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* 4 Stat / Metric Cards Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Card 1: Expected Guests */}
            <div className="bg-white rounded-2xl border border-[#E2E6DC] p-4 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center">
                <Users size={17} strokeWidth={2.2} />
              </div>
              <p className="text-xl font-bold text-[#17252B] tracking-tight">
                {activeEvent.guest_count}
              </p>
              <p className="text-[11px] font-medium text-[#66717A]">Expected Guests</p>
            </div>

            {/* Card 2: Days Until Event */}
            <div className="bg-white rounded-2xl border border-[#E2E6DC] p-4 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center">
                <CalendarIcon size={17} strokeWidth={2.2} />
              </div>
              <p className="text-xl font-bold text-[#17252B] tracking-tight">
                {activeEvent.days_remaining ?? '—'}
              </p>
              <p className="text-[11px] font-medium text-[#66717A]">Days Until Event</p>
            </div>

            {/* Card 3: Tasks Completed */}
            <div className="bg-white rounded-2xl border border-[#E2E6DC] p-4 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center">
                <CheckCircle2 size={17} strokeWidth={2.2} />
              </div>
              <p className="text-xl font-bold text-[#17252B] tracking-tight">
                {taskProgressPct}%
              </p>
              <p className="text-[11px] font-medium text-[#66717A]">Tasks Completed</p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#164B3D] rounded-full transition-all"
                  style={{ width: `${taskProgressPct}%` }}
                />
              </div>
            </div>

            {/* Card 4: Vendors Confirmed */}
            <div className="bg-white rounded-2xl border border-[#E2E6DC] p-4 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-[#E8F5F1] text-[#164B3D] flex items-center justify-center">
                <Store size={17} strokeWidth={2.2} />
              </div>
              <p className="text-xl font-bold text-[#17252B] tracking-tight">
                {confirmedVendors.length} / {vendors.length}
              </p>
              <p className="text-[11px] font-medium text-[#66717A]">Vendors Confirmed</p>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#52B9A3] rounded-full transition-all"
                  style={{ width: `${vendorProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Middle Row: Budget Overview + Upcoming Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left: Budget Overview Card (6 Cols) */}
            <div className="md:col-span-6 bg-white rounded-3xl border border-[#E2E6DC] p-6 shadow-xs flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#17252B] text-base">Budget Overview</h3>
                <button
                  type="button"
                  onClick={() => navigate('/budget')}
                  className="text-xs font-semibold text-[#164B3D] hover:underline cursor-pointer"
                >
                  View Details
                </button>
              </div>

              {/* Independent values are each compared with the total, not combined as slices. */}
              <div className="space-y-4" aria-label="Budget amounts compared independently to total budget">
                {budgetMetrics.map((metric) => {
                  const percentage =
                    totalBudget > 0
                      ? Math.min(100, Math.max(0, (metric.value / totalBudget) * 100))
                      : 0;

                  return (
                    <div key={metric.name} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-xs leading-tight">
                        <span className="text-[#66717A]">{metric.name}</span>
                        <span className="font-bold tabular-nums text-[#17252B] whitespace-nowrap">
                          {formatINR(metric.value)}
                        </span>
                      </div>
                      <div
                        className="h-2 w-full overflow-hidden rounded-full bg-[#E5EFE8]"
                        role="progressbar"
                        aria-label={`${metric.name} relative to total budget`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(percentage)}
                        title={`${formatINR(metric.value)} of ${formatINR(totalBudget)}`}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${percentage}%`, backgroundColor: metric.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Row: Available After Commitments + Cash Remaining */}
              <div className="pt-4 border-t border-[#E2E6DC] grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[#CCE4DA] bg-[#F2F7F2] p-3">
                  <span
                    className={`text-base font-bold block tabular-nums ${
                      unspentBudget < 0 ? 'text-rose-600' : 'text-[#164B3D]'
                    }`}
                  >
                    {formatINR(unspentBudget)}
                  </span>
                  <span className="text-[10px] leading-snug text-[#66717A] font-semibold block mt-1">
                    Available After Commitments
                  </span>
                  {unspentBudget < 0 && (
                    <span className="text-[9px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                      <AlertTriangle size={10} /> Deficit Warning
                    </span>
                  )}
                </div>

                <div className="rounded-2xl border border-[#E2E6DC] bg-[#FAF9F5] p-3">
                  <span className="text-base font-bold text-[#17252B] block tabular-nums">
                    {formatINR(cashRemaining)}
                  </span>
                  <span className="text-[10px] leading-snug text-[#66717A] font-semibold block mt-1">
                    Cash Remaining
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Upcoming Tasks Card (6 Cols) */}
            <div className="md:col-span-6 self-start bg-white rounded-3xl border border-[#E2E6DC] p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#17252B] text-base">Upcoming Tasks</h3>
                <button
                  type="button"
                  onClick={() => navigate('/tasks')}
                  className="text-xs font-semibold text-[#164B3D] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              {/* Task Checklist */}
              <div className="space-y-1.5">
                {tasks.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[#66717A]">
                    <p>No tasks created yet.</p>
                    <button
                      type="button"
                      onClick={() => navigate('/tasks')}
                      className="text-[#164B3D] font-bold hover:underline mt-2 inline-block cursor-pointer"
                    >
                      + Add your first task
                    </button>
                  </div>
                ) : (
                  tasks.slice(0, 5).map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-3 px-2.5 py-2 rounded-xl hover:bg-[#FAF9F5] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => handleTaskStatusChange(task.id, task.status)}
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                              isDone
                                ? 'bg-[#164B3D] border-[#164B3D] text-white'
                                : 'border-gray-300 hover:border-[#164B3D]'
                            }`}
                          >
                            {isDone && <CheckCircle2 size={12} />}
                          </button>
                          <span
                            className={`text-xs font-medium truncate ${
                              isDone ? 'line-through text-gray-400' : 'text-[#17252B]'
                            }`}
                          >
                            {task.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                              task.priority === 'critical' || task.priority === 'high'
                                ? 'bg-[#FDECEE] text-[#D3455B]'
                                : task.priority === 'medium'
                                ? 'bg-[#FEF6E8] text-[#D9822B]'
                                : 'bg-[#EBF7F2] text-[#2B8B69]'
                            }`}
                          >
                            {task.priority || 'Medium'}
                          </span>
                          <span className="text-[11px] text-[#66717A]">
                            {task.due_date ? formatDate(task.due_date) : 'No date'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Vendor Status Summary */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-12 bg-white rounded-3xl border border-[#E2E6DC] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#17252B] text-base">Vendor Status</h3>
                <button
                  type="button"
                  onClick={() => navigate('/vendors')}
                  className="text-xs font-semibold text-[#164B3D] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              {/* 4 Status Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#EBF7F2] rounded-2xl p-3 border border-[#CCE4DA]">
                  <span className="text-[10px] font-bold text-[#164B3D] block">Confirmed</span>
                  <span className="text-xl font-bold text-[#164B3D] block mt-1">
                    {confirmedVendors.length}
                  </span>
                </div>

                <div className="bg-[#FEF6E8] rounded-2xl p-3 border border-[#F3DFC1]">
                  <span className="text-[10px] font-bold text-[#D9822B] block">In Progress</span>
                  <span className="text-xl font-bold text-[#D9822B] block mt-1">
                    {inProgressVendors.length}
                  </span>
                </div>

                <div className="bg-[#FAF9F5] rounded-2xl p-3 border border-[#E2E6DC]">
                  <span className="text-[10px] font-bold text-[#66717A] block">Pending</span>
                  <span className="text-xl font-bold text-[#17252B] block mt-1">
                    {pendingVendors.length}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
                  <span className="text-[10px] font-bold text-gray-400 block">Cancelled</span>
                  <span className="text-xl font-bold text-gray-500 block mt-1">
                    {cancelledVendors.length}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ─── RIGHT PANEL (4 Columns) ─────────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Mini Calendar Card */}
          <div className="bg-white rounded-3xl border border-[#E2E6DC] p-6 shadow-xs space-y-4">
            {/* Month & Navigation Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#17252B] text-base">
                {monthName} {currentYear}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                  aria-label="Next month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Days of Week Row */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#66717A]">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {/* Empty leading cells */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-8" />
              ))}

              {/* Day numbers */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const day = idx + 1;
                const isEvent = isEventDay(day);
                const hasDeadline = hasTaskDeadline(day);

                return (
                  <div
                    key={`day-${day}`}
                    className={`h-8 flex flex-col items-center justify-center rounded-xl relative transition-colors ${
                      isEvent
                        ? 'bg-[#164B3D] text-white font-bold shadow-xs'
                        : 'text-[#17252B] hover:bg-gray-50'
                    }`}
                  >
                    <span>{day}</span>
                    {hasDeadline && !isEvent && (
                      <span className="w-1 h-1 rounded-full bg-[#52B9A3] absolute bottom-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Deadlines / Events */}
          <div className="bg-white rounded-3xl border border-[#E2E6DC] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#17252B] text-base">Upcoming Deadlines</h3>
              <button
                type="button"
                onClick={() => navigate('/timeline')}
                className="text-xs font-semibold text-[#164B3D] hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* Deadlines List */}
            <div className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-[#66717A] py-4 text-center">
                  No upcoming deadlines for pending tasks.
                </p>
              ) : (
                upcomingDeadlines.map((task, idx) => {
                  const colors = ['#164B3D', '#D9822B', '#52B9A3', '#88C0B3'];
                  const dotColor = colors[idx % colors.length];

                  return (
                    <div key={task.id} className="flex items-start gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#17252B] truncate">{task.name}</p>
                        <p className="text-[11px] text-[#66717A] mt-0.5">
                          {formatDate(task.due_date)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* AI Workspace entry */}
          <div className="rounded-3xl border border-[#CCE4DA] bg-[#E5EFE8] p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 shrink-0 rounded-xl bg-white/80 text-[#164B3D] flex items-center justify-center border border-white">
                <Lightbulb size={17} />
              </div>
              <div className="min-w-0">
                <h3 className="font-serif-hero text-base font-bold text-[#17252B]">
                  Plan smarter with AI
                </h3>
                <p className="text-xs text-[#66717A] leading-relaxed mt-1">
                  Adapt your event plans with intelligent, constraint-aware replanning.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/ai-workspace')}
              className="mt-4 w-full bg-[#164B3D] hover:bg-[#103D32] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Open AI Workspace</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
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
