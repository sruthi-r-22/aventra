import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Trash2, CheckCircle2, Clock, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import { formatDate } from '../utils/format';

export default function Tasks() {
  const { activeEvent, activeEventId, refreshActiveEvent } = useApp();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');

  // New task modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [durationDays, setDurationDays] = useState(2);
  const [dueDate, setDueDate] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isMilestone, setIsMilestone] = useState(false);
  const [selectedDeps, setSelectedDeps] = useState<string[]>([]);

  const loadTasks = async () => {
    if (!activeEventId) return;
    try {
      const data = await api.listTasks(activeEventId);
      setTasks(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [activeEventId]);

  const handleToggleStatus = async (task: any) => {
    if (!activeEventId) return;
    const next = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await api.updateTaskStatus(activeEventId, task.id, next);
      await loadTasks();
      refreshActiveEvent();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!activeEventId || !window.confirm('Delete this task?')) return;
    try {
      await api.deleteTask(activeEventId, taskId);
      await loadTasks();
      refreshActiveEvent();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEventId || !name.trim()) return;

    try {
      await api.createTask(activeEventId, {
        name: name.trim(),
        description: description.trim() || undefined,
        priority,
        duration_days: Number(durationDays),
        due_date: dueDate || undefined,
        assigned_to: assignedTo.trim() || undefined,
        is_milestone: isMilestone,
        dependency_ids: selectedDeps.length > 0 ? selectedDeps : undefined,
      });

      setShowModal(false);
      setName('');
      setDescription('');
      setPriority('medium');
      setDurationDays(2);
      setDueDate('');
      setAssignedTo('');
      setIsMilestone(false);
      setSelectedDeps([]);

      await loadTasks();
      refreshActiveEvent();
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    }
  };

  if (!activeEvent) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-16">
        <CheckSquare size={36} className="mx-auto text-gray-400 mb-2" />
        <h3 className="text-lg font-bold text-[#1a2b4a]">No event selected</h3>
        <p className="text-xs text-gray-500 mt-1">Please select an event to manage its tasks.</p>
      </div>
    );
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1a2b4a] tracking-tight">Task Management</h1>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            Track dependencies, deadlines, and execution progress for {activeEvent.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
        >
          <Plus size={15} />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 p-2 shadow-2xs">
        <div className="flex items-center gap-1">
          {['all', 'pending', 'in_progress', 'completed', 'blocked'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer ${
                filter === st
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <span className="text-xs font-bold text-gray-400 pr-3">
          Completed {completedCount} / {tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs divide-y divide-gray-50 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-400">
            No tasks found for this filter.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            return (
              <div
                key={task.id}
                className="p-5 flex items-center justify-between gap-4 hover:bg-gray-50/70 transition-colors group"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(task)}
                    className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors cursor-pointer ${
                      isCompleted
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 hover:border-blue-500 bg-white'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 size={14} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold truncate ${
                        isCompleted ? 'line-through text-gray-400' : 'text-[#1a2b4a]'
                      }`}>
                        {task.name}
                      </span>
                      {task.is_milestone && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full uppercase">
                          Milestone
                        </span>
                      )}
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        task.priority === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {task.priority}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-gray-500 mt-1 font-normal line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-[11px] font-medium text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {task.duration_days} day(s)
                      </span>
                      {task.due_date && (
                        <span>Due: {formatDate(task.due_date)}</span>
                      )}
                      {task.assigned_to && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <UserCheck size={12} /> {task.assigned_to}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={task.status}
                    onChange={async (e) => {
                      await api.updateTask(activeEventId!, task.id, { status: e.target.value });
                      await loadTasks();
                      refreshActiveEvent();
                    }}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none cursor-pointer"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-gray-300 hover:text-rose-600 transition-colors p-1"
                    title="Delete task"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-bold text-[#1a2b4a] mb-4">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Task Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Confirm wedding reception menu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief details or scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Assigned To</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Planner"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={isMilestone}
                    onChange={(e) => setIsMilestone(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Mark as Major Milestone</span>
                </label>
              </div>

              {tasks.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Prerequisite Tasks (Dependencies)
                  </label>
                  <select
                    multiple
                    value={selectedDeps}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                      setSelectedDeps(selected);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-blue-500 bg-white h-24"
                  >
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">Hold Ctrl / Cmd to select multiple dependencies</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
