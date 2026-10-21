import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Calendar, MapPin, Users, Trash2, ArrowRight, CheckCircle2, AlertTriangle, Sliders, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import CreateEventModal from '../components/CreateEventModal';
import { formatINR, formatDate } from '../utils/format';

export default function MyEvents() {
  const { events, activeEventId, setActiveEventId, refreshEvents } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(searchParams.get('create') === 'true');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSelectEvent = (id: string) => {
    setActiveEventId(id);
    navigate('/dashboard');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
    try {
      setDeletingId(id);
      await api.deleteEvent(id);
      await refreshEvents();
    } catch (err) {
      console.error('Failed to delete event', err);
    } finally {
      setDeletingId(null);
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
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, event.id)}
                        disabled={deletingId === event.id}
                        className="text-gray-300 hover:text-rose-600 transition-colors p-1"
                        title="Delete event"
                      >
                        <Trash2 size={14} />
                      </button>
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

      <CreateEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => refreshEvents()}
      />
    </div>
  );
}
