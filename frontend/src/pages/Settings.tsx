import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Sparkles,
  Server,
  Save,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import type { EventStatus } from '../api/types';
import { formatINR } from '../utils/format';

export default function Settings() {
  const navigate = useNavigate();
  const { events, activeEventId, setActiveEventId, activeEvent, refreshEvents, refreshActiveEvent } = useApp();

  // Form state for active event
  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    location: '',
    guest_count: 0,
    total_budget: 0,
    status: 'active' as EventStatus,
    preferences: '',
    description: '',
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // System diagnostic state
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthCheckedAt, setHealthCheckedAt] = useState<string | null>(null);

  // Populate form when activeEvent changes
  useEffect(() => {
    if (activeEvent) {
      setFormData({
        name: activeEvent.name || '',
        event_date: activeEvent.event_date ? activeEvent.event_date.substring(0, 10) : '',
        location: activeEvent.location || '',
        guest_count: activeEvent.guest_count || 0,
        total_budget: activeEvent.total_budget || 0,
        status: activeEvent.status || 'active',
        preferences: activeEvent.preferences || '',
        description: activeEvent.description || '',
      });
      setSaveSuccess(false);
      setSaveError(null);
    }
  }, [activeEvent]);

  // Load system diagnostics on mount
  useEffect(() => {
    checkSystemHealth();
  }, []);

  const checkSystemHealth = async () => {
    try {
      setHealthLoading(true);
      const data = await api.health();
      setHealthStatus(data);
      setHealthCheckedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      setHealthStatus({ status: 'offline', error: err.message || 'Cannot reach API backend' });
      setHealthCheckedAt(new Date().toLocaleTimeString());
    } finally {
      setHealthLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleSaveEventSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId) return;

    if (!formData.name.trim()) {
      setSaveError('Event name cannot be empty.');
      return;
    }
    if (formData.total_budget <= 0) {
      setSaveError('Total budget must be greater than zero.');
      return;
    }
    if (formData.guest_count <= 0) {
      setSaveError('Guest count must be at least 1.');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);
      await api.updateEvent(activeEventId, {
        name: formData.name.trim(),
        event_date: formData.event_date,
        location: formData.location.trim(),
        guest_count: Number(formData.guest_count),
        total_budget: Number(formData.total_budget),
        status: formData.status,
        preferences: formData.preferences.trim(),
        description: formData.description.trim(),
      });
      await Promise.all([refreshActiveEvent(), refreshEvents()]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update event settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Navigation back to application */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#66717A] hover:text-[#164B3D] transition-colors mb-3 cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#17252B] tracking-tight flex items-center gap-2.5">
              <SettingsIcon size={24} className="text-[#164B3D]" />
              <span>Settings</span>
            </h1>
            <p className="text-xs font-semibold text-[#66717A] mt-1">
              Configure your active event parameters, workspace preferences, and PlanForge system status.
            </p>
          </div>

          {/* Quick Active Event Switcher */}
          {events.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#66717A]">Active Event:</span>
              <select
                value={activeEventId || ''}
                onChange={(e) => setActiveEventId(e.target.value)}
                className="bg-white border border-[#E2E6DC] text-xs font-bold text-[#17252B] rounded-xl px-3 py-2 focus:outline-none focus:border-[#52B9A3] cursor-pointer"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev.event_type})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Section 1: Active Event Configuration */}
      {activeEvent ? (
        <div className="bg-white rounded-3xl border border-[#E2E6DC] p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E2E6DC]">
            <div>
              <h2 className="text-base font-bold text-[#17252B]">Active Event Parameters</h2>
              <p className="text-xs text-[#66717A] mt-0.5">
                Update core constraints and scheduling information for <span className="font-semibold text-[#164B3D]">{activeEvent.name}</span>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#66717A]">
                Constraint Status:
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  activeEvent.feasibility_status === 'feasible'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {activeEvent.feasibility_status}
              </span>
            </div>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 bg-[#E8F5F1] border border-[#CCE4DA] text-[#164B3D] px-4 py-3 rounded-2xl text-xs font-medium">
              <CheckCircle2 size={16} className="text-[#52B9A3] shrink-0" />
              <span>Event parameters updated successfully in database.</span>
            </div>
          )}

          {saveError && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-medium">
              <AlertTriangle size={16} className="text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <form onSubmit={handleSaveEventSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Event Name */}
              <div>
                <label className="block text-xs font-bold text-[#17252B] mb-1.5">
                  Event Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-xl text-xs text-[#17252B] font-medium focus:bg-white focus:border-[#52B9A3] focus:outline-none transition-all"
                  placeholder="e.g., TechNova 2026"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-[#17252B] mb-1.5">
                  Lifecycle Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as EventStatus)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-xl text-xs text-[#17252B] font-medium focus:bg-white focus:border-[#52B9A3] focus:outline-none transition-all"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Event Date */}
              <div>
                <label className="block text-xs font-bold text-[#17252B] mb-1.5 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#164B3D]" />
                  <span>Event Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={(e) => handleInputChange('event_date', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-xl text-xs text-[#17252B] font-medium focus:bg-white focus:border-[#52B9A3] focus:outline-none transition-all"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-bold text-[#17252B] mb-1.5 flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#164B3D]" />
                  <span>Venue / Location</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-xl text-xs text-[#17252B] font-medium focus:bg-white focus:border-[#52B9A3] focus:outline-none transition-all"
                  placeholder="e.g., Grand Hyatt, Mumbai"
                />
              </div>

              {/* Guest Count */}
              <div>
                <label className="block text-xs font-bold text-[#17252B] mb-1.5 flex items-center gap-1.5">
                  <Users size={13} className="text-[#164B3D]" />
                  <span>Expected Guests</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.guest_count || ''}
                  onChange={(e) => handleInputChange('guest_count', e.target.value ? parseInt(e.target.value, 10) : 0)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-xl text-xs text-[#17252B] font-medium focus:bg-white focus:border-[#52B9A3] focus:outline-none transition-all"
                />
              </div>

              {/* Total Budget */}
              <div>
                <label className="block text-xs font-bold text-[#17252B] mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={13} className="text-[#164B3D]" />
                    <span>Total Budget (INR)</span>
                  </span>
                  <span className="text-[11px] font-semibold text-[#164B3D]">
                    {formatINR(formData.total_budget)}
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#66717A]">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.total_budget || ''}
                    onChange={(e) => handleInputChange('total_budget', e.target.value ? parseFloat(e.target.value) : 0)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-xl text-xs text-[#17252B] font-medium focus:bg-white focus:border-[#52B9A3] focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Description / Notes */}
            <div>
              <label className="block text-xs font-bold text-[#17252B] mb-1.5">
                Event Description & Objectives
              </label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-xl text-xs text-[#17252B] font-medium focus:bg-white focus:border-[#52B9A3] focus:outline-none transition-all resize-none"
                placeholder="High-level event scope or context..."
              />
            </div>

            {/* Constraints & Preferences */}
            <div>
              <label className="block text-xs font-bold text-[#17252B] mb-1.5">
                AI Planning Constraints & Preferences
              </label>
              <textarea
                rows={2}
                value={formData.preferences}
                onChange={(e) => handleInputChange('preferences', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-xl text-xs text-[#17252B] font-medium focus:bg-white focus:border-[#52B9A3] focus:outline-none transition-all resize-none"
                placeholder="e.g., Focus budget on catering and stage audio, keep marketing lean"
              />
            </div>

            {/* Action button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#164B3D] hover:bg-[#103D32] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <Save size={14} />
                <span>{saving ? 'Saving Changes...' : 'Save Event Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-[#E2E6DC] p-8 text-center shadow-xs">
          <Calendar size={32} className="mx-auto text-gray-400 mb-2" />
          <h3 className="text-base font-bold text-[#17252B]">No Active Event Selected</h3>
          <p className="text-xs text-[#66717A] mt-1 mb-4">
            Select or create an event to configure its parameters.
          </p>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="px-4 py-2 bg-[#164B3D] text-white rounded-xl text-xs font-bold hover:bg-[#103D32] transition-colors cursor-pointer"
          >
            Go to Events
          </button>
        </div>
      )}

      {/* Section 2: System & PlanForge Engine Status */}
      <div className="bg-white rounded-3xl border border-[#E2E6DC] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E6DC]">
          <div>
            <h2 className="text-base font-bold text-[#17252B] flex items-center gap-2">
              <Server size={18} className="text-[#164B3D]" />
              <span>System & PlanForge Diagnostic</span>
            </h2>
            <p className="text-xs text-[#66717A] mt-0.5">
              Live status of backend services, mathematical engines, and persistent store.
            </p>
          </div>
          <button
            type="button"
            onClick={checkSystemHealth}
            disabled={healthLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E8F5F1] hover:bg-[#D5EDE5] text-[#164B3D] rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={12} className={healthLoading ? 'animate-spin' : ''} />
            <span>Check Status</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* API Backend */}
          <div className="p-3.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#66717A] tracking-wider block">
              FastAPI Backend
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  healthStatus?.status === 'ok' ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-rose-500'
                }`}
              />
              <span className="text-xs font-bold text-[#17252B]">
                {healthStatus?.status === 'ok' ? 'Connected' : 'Unavailable'}
              </span>
            </div>
            <span className="text-[10px] text-[#66717A] block">
              v{healthStatus?.version || '1.0.0'}
            </span>
          </div>

          {/* PlanForge Engine */}
          <div className="p-3.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#66717A] tracking-wider block">
              PlanForge Engine
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#164B3D] ring-2 ring-emerald-100" />
              <span className="text-xs font-bold text-[#17252B]">Deterministic</span>
            </div>
            <span className="text-[10px] text-[#66717A] block">
              Kahn DAG & LP Budget
            </span>
          </div>

          {/* AI Replanning Mode */}
          <div className="p-3.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#66717A] tracking-wider block">
              AI Replanning
            </span>
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-[#52B9A3]" />
              <span className="text-xs font-bold text-[#17252B]">
                {healthStatus?.gemini_available ? 'Groq / Gemini' : 'Template Mode'}
              </span>
            </div>
            <span className="text-[10px] text-[#66717A] block">
              {healthStatus?.gemini_available ? 'Real-time LLM' : 'Deterministic fallback'}
            </span>
          </div>

          {/* Database Store */}
          <div className="p-3.5 bg-[#FAF9F5] border border-[#E2E6DC] rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-[#66717A] tracking-wider block">
              Database Store
            </span>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
              <span className="text-xs font-bold text-[#17252B]">SQLite</span>
            </div>
            <span className="text-[10px] text-[#66717A] block">
              aventra.db local
            </span>
          </div>
        </div>

        {healthCheckedAt && (
          <p className="text-[11px] text-[#66717A] text-right font-medium">
            Last checked at {healthCheckedAt}
          </p>
        )}
      </div>
    </div>
  );
}
