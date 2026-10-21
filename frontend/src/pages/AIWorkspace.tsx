import { useState, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, AlertTriangle, XCircle, ArrowRight,
  History, Check, X, Send
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import { formatINR, formatDate } from '../utils/format';

export default function AIWorkspace() {
  const { activeEvent, activeEventId, refreshActiveEvent, refreshEvents } = useApp();

  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'replan' | 'history'>('replan');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load history
  const loadHistory = async () => {
    if (!activeEventId) return;
    try {
      const hist = await api.getPlanHistory(activeEventId);
      setHistory(hist);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [activeEventId]);

  const handleGeneratePreview = async (customPrompt?: string) => {
    if (!activeEventId) return;
    const textToSubmit = customPrompt || prompt;
    if (!textToSubmit.trim()) return;

    setActionSuccess(null);
    setActionError(null);
    setLoading(true);

    try {
      const result = await api.previewReplan(activeEventId, {
        change_description: textToSubmit.trim(),
      });
      setPreview(result);
    } catch (err: any) {
      setActionError(err.message || 'Failed to preview replan');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptReplan = async () => {
    if (!activeEventId || !preview?.preview_token || !preview.is_feasible) return;
    setLoading(true);
    setActionSuccess(null);
    setActionError(null);

    try {
      const result = await api.acceptReplan(activeEventId, {
        preview_token: preview.preview_token,
        notes: 'Accepted via AI Workspace',
      });
      setActionSuccess(`Plan version ${result.version_number} saved and applied successfully.`);
      setPreview(null);
      setPrompt('');
      await loadHistory();
      await refreshActiveEvent();
      await refreshEvents();
    } catch (err: any) {
      setActionError(err.message || 'Failed to accept replan');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectReplan = () => {
    setPreview(null);
    setActionSuccess('Proposed changes rejected. Original plan preserved unchanged.');
  };

  const financialBlocked = Boolean(
    preview?.financial_feasibility && !preview.financial_feasibility.is_feasible,
  );
  const acceptanceBlocked = !preview?.is_feasible;

  if (!activeEvent) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-16">
        <Sparkles size={36} className="mx-auto text-[#52B9A3] mb-2" />
        <h3 className="text-lg font-bold text-[#17252B]">No event selected</h3>
        <p className="text-xs text-gray-500 mt-1">Please select an event to use the AI Workspace.</p>
      </div>
    );
  }

  // Pre-canned realistic example prompts for the user
  const examplePrompts = [
    `Reduce budget from ${formatINR(activeEvent.total_budget)} to ${formatINR(Math.round(activeEvent.total_budget * 0.75))} and move the event 3 days earlier`,
    `Increase guests to ${activeEvent.guest_count + 50} and expand catering budget`,
    `Cut budget to ${formatINR(Math.round(activeEvent.total_budget * 0.4))} (will trigger PlanForge shortfall alert)`,
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#17252B] tracking-tight">AI Workspace</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E5EFE8] text-[#164B3D] border border-[#CCE4DA] flex items-center gap-1">
              <Sparkles size={11} /> PlanForge Hybrid
            </span>
          </div>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            Gemini natural-language synthesis + PlanForge deterministic constraint verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('replan')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'replan'
                ? 'bg-[#164B3D] text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Replanning Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#164B3D] text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <History size={13} />
            <span>Version History ({history.length})</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-semibold">
          <AlertTriangle size={18} className="shrink-0 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {activeTab === 'replan' && (
        <div className="space-y-6">
          {/* Prompt Input Box */}
          <div className="bg-white rounded-3xl border border-[#E3E8E2] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#17252B]">Natural-Language Replan Instruction</h3>
                <p className="text-xs text-gray-500">
                  State your desired revisions in natural English. PlanForge validates constraints and previews changes before anything is saved.
                </p>
              </div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Event: {activeEvent.name}
              </span>
            </div>

            <div className="relative">
              <textarea
                rows={3}
                placeholder="e.g. Reduce my budget from ₹250,000 to ₹180,000 and move the event two days earlier..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full p-4 rounded-2xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => handleGeneratePreview()}
                disabled={loading || !prompt.trim()}
                className="absolute right-3 bottom-3 px-4 py-2 bg-[#164B3D] hover:bg-[#103D32] disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Calculate Replan</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Suggestions / Test Shortcuts */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                Quick Test Scenarios:
              </span>
              <div className="flex flex-wrap gap-2">
                {examplePrompts.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(ex);
                      handleGeneratePreview(ex);
                    }}
                    className="text-left text-[11px] font-medium bg-gray-50 hover:bg-[#E5EFE8] hover:text-[#164B3D] border border-gray-100 rounded-xl px-3 py-1.5 text-gray-600 transition-colors cursor-pointer"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Replan Preview Area (Before / After Comparison) */}
          {preview && (
            <div className="bg-white rounded-3xl border border-[#E3E8E2] p-6 shadow-sm space-y-6 animate-fadeIn">
              {/* Feasibility Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                preview.is_feasible
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-3">
                  {preview.is_feasible ? (
                    <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle size={24} className="text-rose-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold">
                      {preview.is_feasible
                        ? 'PlanForge Constraint Feasibility: PASS'
                        : 'PlanForge Constraint Feasibility: INFEASIBLE'}
                    </h4>
                    <p className="text-xs mt-0.5 opacity-90">
                      {preview.explanation}
                    </p>
                    {financialBlocked && preview?.financial_feasibility && (
                      <p role="alert" className="text-xs mt-2 font-semibold">
                        Financial shortfall: {formatINR(preview.financial_feasibility.shortfall)}.
                        Minimum budget: {formatINR(preview.financial_feasibility.minimum_budget)}
                        {' '}(actual spending plus booked and confirmed vendor commitments).
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleRejectReplan}
                    className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <X size={13} />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptReplan}
                    disabled={loading || acceptanceBlocked}
                    className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer ${
                      acceptanceBlocked
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-[#164B3D] hover:bg-[#103D32]'
                    }`}
                  >
                    <Check size={14} />
                    <span>
                      {financialBlocked
                        ? 'Cannot Accept: Financial Shortfall'
                        : acceptanceBlocked
                          ? 'Cannot Accept: Infeasible Revision'
                          : 'Accept & Apply Revision'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Detected Changes List */}
              {preview.changes && preview.changes.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <h4 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                    Detected Modifications:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {preview.changes.map((c: any, i: number) => (
                      <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 text-xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">
                          {c.field.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-2 font-bold">
                          <span className="text-gray-400 line-through">
                            {typeof c.original === 'number' ? formatINR(c.original) : c.original}
                          </span>
                          <ArrowRight size={12} className="text-[#52B9A3]" />
                          <span className="text-[#164B3D]">
                            {typeof c.revised === 'number' ? formatINR(c.revised) : c.revised}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Side-by-Side Comparison Grid: Original vs Revised */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Plan */}
                <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      Original Plan (Active)
                    </span>
                    <span className="text-xs font-bold text-gray-600">
                      {formatINR(preview.original_plan.total_budget)}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500 font-medium">Event Date:</span>
                      <span className="font-bold text-[#17252B]">{preview.original_plan.event_date}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span className="text-gray-500 font-medium">Expected Guests:</span>
                      <span className="font-bold text-[#17252B]">{preview.original_plan.guest_count}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] font-bold uppercase text-gray-400 tracking-wider block mb-2">
                      Original Category Allocations:
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {preview.original_plan.categories?.map((cat: any) => (
                        <div key={cat.id} className="flex justify-between text-xs py-1 px-2 bg-white rounded-lg border border-gray-100">
                          <span className="text-gray-600 truncate">{cat.name}</span>
                          <span className="font-bold text-gray-800">{formatINR(cat.allocated_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Revised Plan */}
                <div className="bg-[#F3F7F2] border border-[#CCE4DA] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#DCE9E1]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#164B3D]">
                      Proposed Revised Plan
                    </span>
                    <span className="text-xs font-bold text-[#164B3D]">
                      {formatINR(preview.revised_plan.total_budget)}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-[#E3E8E2]">
                      <span className="text-gray-500 font-medium">Event Date:</span>
                      <span className="font-bold text-[#17252B]">{preview.revised_plan.event_date}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-[#E3E8E2]">
                      <span className="text-gray-500 font-medium">Expected Guests:</span>
                      <span className="font-bold text-[#17252B]">{preview.revised_plan.guest_count}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[11px] font-bold uppercase text-[#164B3D] tracking-wider block mb-2">
                      Proportionally Scaled Allocations:
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {preview.revised_plan.categories?.map((cat: any) => (
                        <div key={cat.id} className="flex justify-between text-xs py-1 px-2 bg-white rounded-lg border border-[#E3E8E2]">
                          <span className="text-gray-700 truncate">{cat.name}</span>
                          <span className="font-bold text-[#164B3D]">{formatINR(cat.revised_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-xs">
                <span className="text-gray-400 font-medium">
                  PlanForge constraint guarantee: Original database state will NOT change until you click Accept.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRejectReplan}
                    className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptReplan}
                    disabled={loading || acceptanceBlocked}
                    className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs ${
                      acceptanceBlocked
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-[#164B3D] hover:bg-[#103D32] cursor-pointer'
                    }`}
                  >
                    Accept Revision
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Plan Version History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-[#17252B]">Plan Version History</h3>
              <p className="text-xs text-gray-500">Every accepted plan modification is immutably archived with audit snapshots</p>
            </div>
            <span className="text-xs font-bold text-gray-400">{history.length} Saved Versions</span>
          </div>

          <div className="divide-y divide-gray-50">
            {history.map((ver) => (
              <div key={ver.id} className="py-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                    ver.is_active ? 'bg-[#164B3D] text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                  }`}>
                    v{ver.version_number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#17252B]">
                        Plan Version {ver.version_number}
                      </span>
                      {ver.is_active && (
                        <span className="text-[10px] bg-[#E5EFE8] text-[#164B3D] font-bold px-2 py-0.5 rounded-full uppercase">
                          Current Active
                        </span>
                      )}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        ver.feasibility_status === 'feasible'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {ver.feasibility_status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 mt-1">
                      {ver.change_summary || 'Baseline initial synthesis'}
                    </p>

                    <span className="text-[11px] text-gray-400 mt-2 block">
                      Archived on {formatDate(ver.created_at)} by {ver.created_by}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
