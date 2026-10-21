import { useState, useEffect } from 'react';
import {
  Wallet, Plus, Trash2, AlertCircle,
  PieChart as PieIcon, Check, X
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import { formatINR } from '../utils/format';

const COLORS = ['#164B3D', '#52B9A3', '#88C0B3', '#B8C9BE', '#D9822B', '#9A7762', '#6F8F72', '#66717A'];

export default function Budget() {
  const { activeEvent, activeEventId, refreshActiveEvent } = useApp();

  const [budgetData, setBudgetData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catAmount, setCatAmount] = useState<number | ''>('');
  const [catMandatory, setCatMandatory] = useState(false);
  const [catFixed, setCatFixed] = useState(false);

  // Expense modal
  const [showExpModal, setShowExpModal] = useState(false);
  const [expName, setExpName] = useState('');
  const [expEst, setExpEst] = useState<number | ''>('');
  const [expAct, setExpAct] = useState<number | ''>('');
  const [expCatId, setExpCatId] = useState('');
  const [expVendor, setExpVendor] = useState('');
  const [expPaid, setExpPaid] = useState(false);

  const loadBudget = async () => {
    if (!activeEventId) return;
    try {
      const [b, exps] = await Promise.all([
        api.getBudget(activeEventId),
        api.listExpenses(activeEventId),
      ]);
      setBudgetData(b);
      setExpenses(exps);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBudget();
  }, [activeEventId]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId || !catName.trim() || !catAmount) return;
    try {
      await api.createCategory(activeEventId, {
        name: catName.trim(),
        allocated_amount: Number(catAmount),
        is_mandatory: catMandatory,
        is_fixed: catFixed,
      });
      setShowCatModal(false);
      setCatName('');
      setCatAmount('');
      setCatMandatory(false);
      setCatFixed(false);
      await loadBudget();
      refreshActiveEvent();
    } catch (err: any) {
      alert(err.message || 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!activeEventId || !window.confirm('Delete category? All associated expenses will be deleted.')) return;
    try {
      await api.deleteCategory(activeEventId, catId);
      await loadBudget();
      refreshActiveEvent();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId || !expName.trim() || expEst === '') return;
    try {
      await api.createExpense(activeEventId, {
        name: expName.trim(),
        estimated_cost: Number(expEst),
        actual_cost: expAct !== '' ? Number(expAct) : undefined,
        category_id: expCatId || undefined,
        vendor_name: expVendor.trim() || undefined,
        is_paid: expPaid,
      });
      setShowExpModal(false);
      setExpName('');
      setExpEst('');
      setExpAct('');
      setExpCatId('');
      setExpVendor('');
      setExpPaid(false);
      await loadBudget();
      refreshActiveEvent();
    } catch (err: any) {
      alert(err.message || 'Failed to add expense');
    }
  };

  const handleDeleteExpense = async (expId: string) => {
    if (!activeEventId || !window.confirm('Delete this expense?')) return;
    try {
      await api.deleteExpense(activeEventId, expId);
      await loadBudget();
      refreshActiveEvent();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
    }
  };

  const handleTogglePaid = async (exp: any) => {
    if (!activeEventId) return;
    try {
      await api.updateExpense(activeEventId, exp.id, { is_paid: !exp.is_paid });
      await loadBudget();
    } catch (err: any) {
      console.error(err);
    }
  };

  if (!activeEvent) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-16">
        <Wallet size={36} className="mx-auto text-gray-400 mb-2" />
        <h3 className="text-lg font-bold text-[#17252B]">No event selected</h3>
        <p className="text-xs text-gray-500 mt-1">Please select an event from the top navigation to view its budget.</p>
      </div>
    );
  }

  const categories = budgetData?.categories || [];
  const totalBudget = activeEvent.total_budget || 0;
  const allocatedBudget = budgetData?.allocated_budget ?? 0;
  const actualExpenses = budgetData?.actual_expenses ?? 0;
  const unallocatedBudget = budgetData?.unallocated_budget ?? Math.max(0, totalBudget - allocatedBudget);
  const unspentBudget = budgetData?.unspent_budget ?? Math.max(0, totalBudget - actualExpenses);
  const isOverAllocated = allocatedBudget > totalBudget;

  const chartData = categories.map((c: any) => ({
    name: c.name,
    value: c.allocated_amount,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#17252B] tracking-tight">Budget Management</h1>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            PlanForge deterministic allocation for {activeEvent.name}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCatModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Category</span>
          </button>
          <button
            type="button"
            onClick={() => setShowExpModal(true)}
            className="px-4 py-2 rounded-xl bg-[#164B3D] hover:bg-[#103D32] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Overspending / Constraint Alert */}
      {isOverAllocated && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-700">
          <AlertCircle size={20} className="shrink-0" />
          <div className="text-xs">
            <span className="font-bold block">Over-allocation Constraint Detected:</span>
            <span>Allocated amount ({formatINR(allocatedBudget)}) exceeds available event budget ({formatINR(totalBudget)}) by {formatINR(allocatedBudget - totalBudget)}.</span>
          </div>

        </div>
      )}

      {/* 7 Distinct Budget Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-gray-100 p-4.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Budget</span>
          <p className="text-xl font-black text-[#17252B] mt-1">{formatINR(totalBudget)}</p>
          <p className="text-[10px] font-medium text-gray-500 mt-1.5">Authorized ceiling cap</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Allocated Budget</span>
          <p className="text-xl font-black text-[#164B3D] mt-1">{formatINR(allocatedBudget)}</p>
          <p className="text-[10px] font-medium text-[#164B3D]/80 mt-1.5">
            {Math.round((allocatedBudget / (totalBudget || 1)) * 100)}% of ceiling cap
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Unallocated Budget</span>
          <p className={`text-xl font-black mt-1 ${unallocatedBudget < 0 ? 'text-rose-600' : 'text-[#52B9A3]'}`}>
            {formatINR(unallocatedBudget)}
          </p>
          <p className="text-[10px] font-medium text-gray-500 mt-1.5">Available to assign</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Actual Spending</span>
          <p className="text-xl font-black text-emerald-600 mt-1">{formatINR(actualExpenses)}</p>
          <p className="text-[10px] font-medium text-emerald-600/80 mt-1.5">
            {expenses.length} Recorded expense items
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Available After Commitments</span>
          <p className={`text-xl font-black mt-1 ${unspentBudget >= 0 ? 'text-[#164B3D]' : 'text-rose-600'}`}>
            {formatINR(unspentBudget)}
          </p>
          <p className="text-[10px] font-medium text-gray-500 mt-1.5">
            Budget remaining after spending and confirmed vendor commitments
          </p>
        </div>

        {/* Vendor Commitments */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Confirmed Vendor Commitments</span>
          <p className="text-xl font-black text-orange-600 mt-1">{formatINR(budgetData?.vendor_commitments ?? 0)}</p>
          <p className="text-[10px] font-medium text-gray-500 mt-1.5">Unpaid confirmed vendors</p>
        </div>

        {/* Cash Remaining */}
<div className="bg-white rounded-2xl border border-gray-100 p-4.5 shadow-xs">
  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Cash Remaining</span>
  <p className={`text-xl font-black mt-1 ${totalBudget - actualExpenses >= 0 ? 'text-[#17252B]' : 'text-rose-600'}`}>{formatINR(totalBudget - actualExpenses)}</p>
  <p className="text-[10px] font-medium text-gray-500 mt-1.5">Cash balance after actual spending</p>
</div>

{/* Total Spent + Committed */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4.5 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Spent + Committed</span>
          <p className="text-xl font-black text-[#17252B] mt-1">{formatINR(budgetData?.total_exposure ?? 0)}</p>
          <p className="text-[10px] font-medium text-gray-500 mt-1.5">Actual + vendor commitments</p>
        </div>
      </div>

      {/* Grid: Categories & Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Categories table */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-sm font-bold text-[#17252B]">Allocated Categories</h3>
            <span className="text-xs text-gray-400 font-semibold">{categories.length} Categories</span>
          </div>


          <div className="divide-y divide-gray-50">
            {categories.map((cat: any) => {
              const pct = Math.round((cat.allocated_amount / (totalBudget || 1)) * 100);
              return (
                <div key={cat.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-[#17252B] truncate">{cat.name}</span>
                      {cat.is_mandatory && (
                        <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded-full uppercase">
                          Mandatory
                        </span>
                      )}
                      {cat.is_fixed && (
                        <span className="text-[10px] bg-[#E5EFE8] text-[#164B3D] font-bold px-1.5 py-0.5 rounded-full uppercase">
                          Fixed
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-[#E5EFE8] h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-[#164B3D] h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>

                  </div>


                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-[#17252B] block">{formatINR(cat.allocated_amount)}</span>
                    <span className="text-[11px] text-gray-400 font-medium">{pct}% of budget</span>
                  </div>


                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-gray-300 hover:text-rose-600 transition-colors p-1"
                    title="Delete category"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

              );
            })}
          </div>

        </div>

        {/* Right 5 cols: Category Recharts Pie */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-100 p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-sm font-bold text-[#17252B]">Budget Distribution</h3>
            <PieIcon size={16} className="text-gray-400" />
          </div>


          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((_item: { name: string; value: number }, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatINR(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No categories to display
              </div>

            )}
          </div>


          <div className="text-center pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium">
              PlanForge preserves mandatory budget items and proportionally scales variable allocations.
            </p>
          </div>

        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-[#17252B]">Expense Tracker</h3>
            <p className="text-xs text-gray-500">Record line-item vendor bills and paid disbursements</p>
          </div>

          <button
            type="button"
            onClick={() => setShowExpModal(true)}
            className="text-xs font-bold text-[#164B3D] hover:text-[#103D32] cursor-pointer"
          >
            + Add Expense
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            No expenses recorded yet. Click "Add Expense" to track actual bills.
          </div>

        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="pb-3 font-semibold">Expense Item</th>
                  <th className="pb-3 font-semibold">Vendor</th>
                  <th className="pb-3 font-semibold">Estimated Cost</th>
                  <th className="pb-3 font-semibold">Actual Cost</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 font-bold text-[#17252B]">{exp.name}</td>
                    <td className="py-3 text-gray-500 font-medium">{exp.vendor_name || '—'}</td>
                    <td className="py-3 font-medium text-gray-600">{formatINR(exp.estimated_cost)}</td>
                    <td className="py-3 font-bold text-[#17252B]">{exp.actual_cost ? formatINR(exp.actual_cost) : '—'}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePaid(exp)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] transition-colors cursor-pointer ${
                          exp.is_paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {exp.is_paid ? <Check size={11} /> : <X size={11} />}
                        {exp.is_paid ? 'Paid' : 'Pending'}
                      </button>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-gray-300 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        )}
      </div>

      {/* Modal: Add Category */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-bold text-[#17252B] mb-4">Add Budget Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Photography & Video"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30"
                />
              </div>


              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Allocated Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={catAmount}
                  onChange={(e) => setCatAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30"
                />
              </div>


              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={catMandatory}
                    onChange={(e) => setCatMandatory(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#164B3D] focus:ring-[#52B9A3]"
                  />
                  <span>Mandatory Expense (Cannot be eliminated during replanning)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={catFixed}
                    onChange={(e) => setCatFixed(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#164B3D] focus:ring-[#52B9A3]"
                  />
                  <span>Fixed Price (Cannot be silently reduced by optimization)</span>
                </label>
              </div>


              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#164B3D] text-white text-xs font-bold hover:bg-[#103D32]"
                >
                  Save Category
                </button>
              </div>

            </form>
          </div>

        </div>
      )}

      {/* Modal: Add Expense */}
      {showExpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-bold text-[#17252B] mb-4">Add Expense Item</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Expense Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stage lighting & PA deposit"
                  value={expName}
                  onChange={(e) => setExpName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30"
                />
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Estimated Cost (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={expEst}
                    onChange={(e) => setExpEst(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Actual Cost (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={expAct}
                    onChange={(e) => setExpAct(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30"
                  />
                </div>

              </div>


              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Category</label>
                <select
                  value={expCatId}
                  onChange={(e) => setExpCatId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30 bg-white"
                >
                  <option value="">No category</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>


              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Vendor Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Skyline AV Systems"
                  value={expVendor}
                  onChange={(e) => setExpVendor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#52B9A3] focus:ring-1 focus:ring-[#52B9A3]/30"
                />
              </div>


              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={expPaid}
                    onChange={(e) => setExpPaid(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#164B3D] focus:ring-[#52B9A3]"
                  />
                  <span>Mark as Paid</span>
                </label>
              </div>


              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowExpModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#164B3D] text-white text-xs font-bold hover:bg-[#103D32]"
                >
                  Save Expense
                </button>
              </div>

            </form>
          </div>

        </div>
      )}
    </div>
  );
}
