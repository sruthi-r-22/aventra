import { useState } from 'react';
import {
  X, Sparkles, Sliders, Calendar, MapPin, Users, DollarSign,
  AlertCircle, CheckCircle2, RotateCcw, Trash2, Plus,
  Clock
} from 'lucide-react';
import api from '../api/client';
import { useApp } from '../context/AppContext';
import { formatINR } from '../utils/format';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (newEvent: any) => void;
}

type Mode = 'manual' | 'ai';
type AIStep = 'inputs' | 'review';

export default function CreateEventModal({ isOpen, onClose, onCreated }: Props) {
  const { refreshEvents, setActiveEventId } = useApp();

  const [mode, setMode] = useState<Mode>('manual');

  // Common Form Fields
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('wedding');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [guestCount, setGuestCount] = useState<number>(100);
  const [totalBudget, setTotalBudget] = useState<number>(250000);
  const [description, setDescription] = useState('');
  const [preferences, setPreferences] = useState('');

  // Manual Mode: Optional initial categories/tasks added by user
  const [manualCategories, setManualCategories] = useState<{ name: string; amount: number; is_mandatory: boolean }[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatAmount, setNewCatAmount] = useState<number | ''>('');
  const [newCatMandatory, setNewCatMandatory] = useState(false);

  // AI Mode State
  const [aiStep, setAiStep] = useState<AIStep>('inputs');
  const [mandatoryExpenses, setMandatoryExpenses] = useState<{ name: string; amount: number }[]>([]);
  const [newMandatoryName, setNewMandatoryName] = useState('');
  const [newMandatoryAmount, setNewMandatoryAmount] = useState<number | ''>('');

  // AI Draft Data for Review & Editing
  const [draftData, setDraftData] = useState<any | null>(null);
  const [draftCategories, setDraftCategories] = useState<any[]>([]);
  const [draftTasks, setDraftTasks] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const validateBasicInputs = (): boolean => {
    if (!name.trim()) {
      setError('Event name is required');
      return false;
    }
    if (!eventDate) {
      setError('Event date is required');
      return false;
    }
    if (!location.trim()) {
      setError('Location is required');
      return false;
    }
    if (guestCount <= 0) {
      setError('Guest count must be greater than 0');
      return false;
    }
    if (totalBudget <= 0) {
      setError('Total budget must be greater than 0');
      return false;
    }
    return true;
  };

  // Add category in Manual mode
  const handleAddManualCategory = () => {
    if (!newCatName.trim() || !newCatAmount || Number(newCatAmount) <= 0) return;
    setManualCategories([
      ...manualCategories,
      { name: newCatName.trim(), amount: Number(newCatAmount), is_mandatory: newCatMandatory }
    ]);
    setNewCatName('');
    setNewCatAmount('');
    setNewCatMandatory(false);
  };

  const handleRemoveManualCategory = (idx: number) => {
    setManualCategories(manualCategories.filter((_, i) => i !== idx));
  };

  // Add mandatory expense in AI mode
  const handleAddMandatory = () => {
    if (!newMandatoryName.trim() || !newMandatoryAmount || Number(newMandatoryAmount) <= 0) return;
    setMandatoryExpenses([
      ...mandatoryExpenses,
      { name: newMandatoryName.trim(), amount: Number(newMandatoryAmount) }
    ]);
    setNewMandatoryName('');
    setNewMandatoryAmount('');
  };

  const handleRemoveMandatory = (idx: number) => {
    setMandatoryExpenses(mandatoryExpenses.filter((_, i) => i !== idx));
  };

  // ─── MANUAL EVENT CREATION ────────────────────────────────────────────────
  const handleCreateManualEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateBasicInputs()) return;

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        event_type: eventType,
        planning_mode: 'manual',
        event_date: eventDate,
        location: location.trim(),
        guest_count: Number(guestCount),
        total_budget: Number(totalBudget),
        description: description.trim() || undefined,
        preferences: preferences.trim() || undefined,
        initial_categories: manualCategories.length > 0
          ? manualCategories.map(c => ({
              name: c.name,
              allocated_amount: c.amount,
              is_mandatory: c.is_mandatory,
            }))
          : undefined,
      };

      const result = await api.createEvent(payload);
      await refreshEvents();
      if (result.id) {
        setActiveEventId(result.id);
      }
      onCreated?.(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create manual event');
    } finally {
      setLoading(false);
    }
  };

  // ─── AI DRAFT GENERATION ──────────────────────────────────────────────────
  const handleGenerateAIDraft = async () => {
    setError(null);
    if (!validateBasicInputs()) return;

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        event_type: eventType,
        event_date: eventDate,
        location: location.trim(),
        guest_count: Number(guestCount),
        total_budget: Number(totalBudget),
        description: description.trim() || undefined,
        preferences: preferences.trim() || undefined,
        mandatory_expenses: mandatoryExpenses.length > 0 ? mandatoryExpenses : undefined,
      };

      const draft = await api.generateAIDraft(payload);
      setDraftData(draft);
      setDraftCategories(draft.budget_categories || []);
      setDraftTasks(draft.tasks || []);
      setAiStep('review');
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI plan draft');
    } finally {
      setLoading(false);
    }
  };

  // ─── AI DRAFT APPROVAL & SAVE ─────────────────────────────────────────────
  const handleAcceptAIDraft = async () => {
    setError(null);
    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        event_type: eventType,
        planning_mode: 'ai',
        event_date: eventDate,
        location: location.trim(),
        guest_count: Number(guestCount),
        total_budget: Number(totalBudget),
        description: description.trim() || draftData?.description || undefined,
        preferences: preferences.trim() || undefined,
        mandatory_expenses: mandatoryExpenses.length > 0 ? mandatoryExpenses : undefined,
        initial_categories: draftCategories,
        initial_tasks: draftTasks,
        initial_vendors: draftData?.vendor_categories || undefined,
      };

      const result = await api.createEvent(payload);
      await refreshEvents();
      if (result.id) {
        setActiveEventId(result.id);
      }
      onCreated?.(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save approved plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-xl font-black text-[#1a2b4a] tracking-tight">Create New Event</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Choose your preferred workflow: build manually from scratch or synthesize with Gemini AI.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Planning Mode Selector (Segmented Cards) */}
        {aiStep === 'inputs' && (
          <div className="grid grid-cols-2 gap-3 py-4 shrink-0">
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                mode === 'manual'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-[#1a2b4a] flex items-center gap-2">
                  <Sliders size={16} className={mode === 'manual' ? 'text-blue-600' : 'text-gray-400'} />
                  Manual Planner
                </span>
                {mode === 'manual' && <CheckCircle2 size={16} className="text-blue-600" />}
              </div>
              <p className="text-[11px] text-gray-500 leading-normal">
                Empty baseline. Add your own tasks, categories, and vendors. Zero LLM calls. Fully works offline.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setMode('ai')}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                mode === 'ai'
                  ? 'border-blue-600 bg-blue-50/40 ring-1 ring-blue-600 shadow-xs'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-[#1a2b4a] flex items-center gap-2">
                  <Sparkles size={16} className={mode === 'ai' ? 'text-blue-600' : 'text-gray-400'} />
                  AI Planner
                </span>
                {mode === 'ai' && <CheckCircle2 size={16} className="text-blue-600" />}
              </div>
              <p className="text-[11px] text-gray-500 leading-normal">
                Generates a draft with staggered preparation deadlines and budget bounds. Review & edit before saving.
              </p>
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* STEP 1: Inputs for either Manual or AI mode */}
          {aiStep === 'inputs' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maya & Arjun Wedding"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Event Type *
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="wedding">Wedding</option>
                    <option value="birthday">Birthday Celebration</option>
                    <option value="college_fest">College Fest</option>
                    <option value="community">Community Event</option>
                    <option value="corporate">Corporate Event</option>
                    <option value="other">Other Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Event Date *
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Location *
                  </label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bangalore Palace Grounds"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Guest Count *
                  </label>
                  <div className="relative">
                    <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      min="1"
                      required
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Total Budget (INR ₹) *
                  </label>
                  <div className="relative">
                    <DollarSign size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      required
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(Number(e.target.value))}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Description / Vision (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline the theme, objectives, or special format..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Preferences & Constraints (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vegetarian catering, acoustic band, strict 10 PM sound curfew"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* MANUAL MODE: Optional Pre-creation Categories */}
              {mode === 'manual' && (
                <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#1a2b4a]">
                        Add Initial Budget Categories (Optional)
                      </span>
                      <p className="text-[11px] text-gray-500">
                        Manual events start with an empty plan by default. You can add categories now or on the Budget page.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Category name (e.g. Venue hire)"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      value={newCatAmount}
                      onChange={(e) => setNewCatAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-32 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualCategory}
                      className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={newCatMandatory}
                      onChange={(e) => setNewCatMandatory(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Mark category as Mandatory (non-negotiable in PlanForge)</span>
                  </label>

                  {manualCategories.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {manualCategories.map((c, i) => (
                        <div key={i} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-100 text-xs">
                          <span className="font-medium text-gray-800">{c.name} {c.is_mandatory && <span className="text-[10px] text-rose-600 font-bold ml-1">(Mandatory)</span>}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[#1a2b4a]">{formatINR(c.amount)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveManualCategory(i)}
                              className="text-gray-300 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AI MODE: Mandatory expenses that Gemini + PlanForge must strictly respect */}
              {mode === 'ai' && (
                <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 space-y-3">
                  <div>
                    <span className="text-xs font-bold text-[#1a2b4a]">
                      Mandatory Fixed Expenses (PlanForge Constraints)
                    </span>
                    <p className="text-[11px] text-gray-500">
                      Specify hard baseline costs (e.g. venue deposit) that the AI draft and PlanForge engine must never reduce.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Expense item (e.g. Non-refundable hall advance)"
                      value={newMandatoryName}
                      onChange={(e) => setNewMandatoryName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Amount (₹)"
                      value={newMandatoryAmount}
                      onChange={(e) => setNewMandatoryAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-32 px-3 py-2 rounded-xl border border-gray-200 text-xs bg-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddMandatory}
                      className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  {mandatoryExpenses.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {mandatoryExpenses.map((exp, i) => (
                        <div key={i} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-100 text-xs">
                          <span className="font-medium text-gray-800">{exp.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-[#1a2b4a]">{formatINR(exp.amount)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveMandatory(i)}
                              className="text-gray-300 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: AI Draft Review & Editing before Approval */}
          {aiStep === 'review' && draftData && (
            <div className="space-y-5 animate-fadeIn">
              {/* Draft Status Banner */}
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      draftData.is_ai_generated
                        ? 'bg-blue-600 text-white'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {draftData.is_ai_generated ? '✨ Gemini AI Draft' : '📋 Deterministic Template Draft (API Key Not Configured)'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      draftData.validation?.is_feasible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      PlanForge: {draftData.validation?.overall_status || 'verified'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1a2b4a] mt-1.5">{draftData.theme}</h3>
                  <p className="text-xs text-gray-600 mt-0.5">{draftData.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAiStep('inputs')}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> Edit Inputs
                </button>
              </div>

              {/* Editable Budget Allocations */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1a2b4a] uppercase tracking-wider">
                    Proposed Budget Categories (Editable)
                  </span>
                  <span className="text-xs text-gray-500 font-semibold">
                    Total: {formatINR(draftCategories.reduce((acc, c) => acc + (Number(c.allocated_amount) || 0), 0))} / {formatINR(totalBudget)}
                  </span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {draftCategories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 text-xs">
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => {
                          const updated = [...draftCategories];
                          updated[idx].name = e.target.value;
                          setDraftCategories(updated);
                        }}
                        className="flex-1 bg-white px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-blue-500 font-medium"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          value={cat.allocated_amount}
                          onChange={(e) => {
                            const updated = [...draftCategories];
                            updated[idx].allocated_amount = Number(e.target.value);
                            setDraftCategories(updated);
                          }}
                          className="w-28 bg-white px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-blue-500 font-bold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setDraftCategories(draftCategories.filter((_, i) => i !== idx))}
                        className="text-gray-300 hover:text-rose-600 p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Staggered Timeline & Preparation Tasks */}
              <div className="bg-white rounded-2xl p-4 border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#1a2b4a] uppercase tracking-wider block">
                      Staggered Preparation Timeline ({draftTasks.length} Tasks)
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Deadlines distributed chronologically prior to event date ({eventDate})
                    </span>
                  </div>
                  <Clock size={15} className="text-blue-500" />
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {draftTasks.map((t, idx) => (
                    <div key={idx} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => {
                            const updated = [...draftTasks];
                            updated[idx].name = e.target.value;
                            setDraftTasks(updated);
                          }}
                          className="w-full bg-white px-2 py-1 rounded-lg border border-gray-200 text-xs font-bold text-[#1a2b4a] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-gray-400 font-semibold uppercase">Deadline:</span>
                        <input
                          type="date"
                          value={t.due_date}
                          onChange={(e) => {
                            const updated = [...draftTasks];
                            updated[idx].due_date = e.target.value;
                            setDraftTasks(updated);
                          }}
                          className="bg-white px-2 py-1 rounded-lg border border-gray-200 text-xs text-gray-700 font-semibold focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setDraftTasks(draftTasks.filter((_, i) => i !== idx))}
                          className="text-gray-300 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-gray-400 font-medium">
            {mode === 'manual'
              ? 'Manual Mode • Zero LLM calls'
              : aiStep === 'inputs'
              ? 'Draft will be generated for your review'
              : 'Review draft and click Accept to persist'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {mode === 'manual' && (
              <button
                type="button"
                onClick={handleCreateManualEvent}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                {loading ? 'Creating Event...' : 'Create Manual Event'}
              </button>
            )}

            {mode === 'ai' && aiStep === 'inputs' && (
              <button
                type="button"
                onClick={handleGenerateAIDraft}
                disabled={loading}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Synthesizing Draft...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate AI Draft</span>
                  </>
                )}
              </button>
            )}

            {mode === 'ai' && aiStep === 'review' && (
              <>
                <button
                  type="button"
                  onClick={() => setAiStep('inputs')}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Reject Draft
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAIDraft}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                >
                  {loading ? 'Saving Plan...' : 'Accept & Save Plan'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
