import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus, Calendar, MapPin, Users, Trash2, ArrowRight, CheckCircle2,
  AlertTriangle, Sliders, Sparkles, MoreHorizontal, AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { EventItem } from '../context/AppContext';
import api from '../api/client';
import CreateEventModal from '../components/CreateEventModal';
import { formatINR, formatDate } from '../utils/format';

export default function MyEvents() {
  const { events, activeEventId, setActiveEventId, refreshEvents } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('create') === 'true');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Close three-dot menu when clicking anywhere outside
  useEffect(() => {
    const handleOutsideClick = () => setMenuOpenId(null);
    if (menuOpenId) {
      window.addEventListener('click', handleOutsideClick);
      return () => window.removeEventListener('click', handleOutsideClick);
    }
  }, [menuOpenId]);

  const handleSelectEvent = (id: string) => {
    setActiveEventId(id);
    navigate('/dashboard');
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    const targetId = eventToDelete.id;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await api.deleteEvent(targetId);

      // Gracefully switch active event if the deleted one was currently selected
      if (activeEventId === targetId) {
        const remaining = events.filter((e) => e.id !== targetId);
        setActiveEventId(remaining.length > 0 ? remaining[0].id : null);
      }

      await refreshEvents();
      setEventToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete event', err);
      setDeleteError(err.message || 'Failed to delete event. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#17252B] tracking-tight">My Events</h1>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            Manage your celebrations, weddings, and community gatherings. Select any event to open its workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#164B3D] text-white rounded-xl text-sm font-bold hover:bg-[#103D32] transition-colors shadow-xs cursor-pointer"
        >
          <Plus size={16} />
          Create Event
        </button>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-xs">
          <Calendar size={32} className="mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-bold text-[#17252B]">No events created yet</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
            Choose between Manual Planner and AI Planner to organize your next celebration.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[#164B3D] text-white rounded-xl text-xs font-bold hover:bg-[#103D32] transition-colors cursor-pointer"
          >
            + Create Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => {
            const isActive = event.id === activeEventId;
            const isFeasible = event.feasibility_status === 'feasible';
            const isManual = event.planning_mode === 'manual';
            const isMenuOpen = menuOpenId === event.id;

            return (
              <div
                key={event.id}
                onClick={() => handleSelectEvent(event.id)}
                className={`bg-white rounded-3xl border p-6 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative group ${
                  isActive ? 'border-[#164B3D] ring-2 ring-[#52B9A3]/20' : 'border-[#E3E8E2]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E5EFE8] text-[#164B3D]">
                        {event.event_type}
                      </span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isManual ? 'bg-gray-100 text-gray-700' : 'bg-[#E5EFE8] text-[#164B3D]'
                      }`}>
                        {isManual ? <Sliders size={10} /> : <Sparkles size={10} />}
                        {isManual ? 'Manual' : 'AI'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        isFeasible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {isFeasible ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                        {event.feasibility_status}
                      </span>

                      {/* Three-dot menu button & dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId(isMenuOpen ? null : event.id);
                          }}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                          title="More options"
                          aria-label="Event options menu"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {isMenuOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8 w-36 bg-white border border-[#E3E8E2] rounded-2xl shadow-lg py-1.5 z-30"
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(null);
                                setEventToDelete(event);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                            >
                              <Trash2 size={13} className="text-rose-600" />
                              <span>Delete Event</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[#17252B] group-hover:text-[#164B3D] transition-colors">
                    {event.name}
                  </h3>

                  <div className="mt-4 space-y-2 text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span>{formatDate(event.event_date)} ({event.days_remaining}d left)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-gray-400" />
                      <span>{event.guest_count} Expected Guests</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Budget</span>
                    <span className="text-base font-black text-[#17252B]">{formatINR(event.total_budget)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectEvent(event.id);
                    }}
                    className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#164B3D] text-white shadow-xs'
                        : 'bg-gray-50 text-gray-600 group-hover:bg-[#E5EFE8] group-hover:text-[#164B3D]'
                    }`}
                  >
                    <span>{isActive ? 'Active' : 'Open'}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {eventToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => {
            if (!isDeleting) setEventToDelete(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-[#E3E8E2] my-8 flex flex-col"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-[#17252B] tracking-tight">
                  Delete Event
                </h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                  Are you sure you want to delete <span className="font-bold text-[#17252B]">{eventToDelete.name}</span>? This action cannot be undone.
                </p>
                <p className="text-[11px] text-gray-400 mt-1 leading-normal">
                  All associated tasks, budget allocations, expenses, and vendor records will be permanently deleted.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Event</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => refreshEvents()}
      />
    </div>
  );
}
