import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ChevronRight, Milestone, Flag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import api from '../api/client';
import { formatDate } from '../utils/format';

// Deterministic Kahn topological sort preserving original order of independent tasks
function topologicalSort(tasks: any[]): any[] | { error: string } {
  const taskMap = new Map<string, any>();
  const indegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  // initialise maps
  tasks.forEach((t) => {
    taskMap.set(t.id, t);
    indegree.set(t.id, 0);
    adj.set(t.id, []);
  });

  // build graph respecting dependency_ids (ignore missing refs)
  tasks.forEach((t) => {
    const deps: string[] = t.dependency_ids || [];
    deps.forEach((depId) => {
      if (!taskMap.has(depId)) return; // safe ignore
      indegree.set(t.id, (indegree.get(t.id) ?? 0) + 1);
      adj.get(depId)!.push(t.id);
    });
  });

  // queue preserving original discovery order
  const queue: string[] = [];
  tasks.forEach((t) => {
    if ((indegree.get(t.id) ?? 0) === 0) queue.push(t.id);
  });

  const result: any[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    result.push(taskMap.get(id));
    const neighbors = adj.get(id) || [];
    neighbors.forEach((n) => {
      indegree.set(n, (indegree.get(n) ?? 0) - 1);
      if ((indegree.get(n) ?? 0) === 0) queue.push(n);
    });
  }

  if (result.length !== tasks.length) {
    return { error: 'Circular dependency detected among tasks' };
  }
  return result;
}

export default function Timeline() {
  const { activeEvent, activeEventId } = useApp();
  const [tasks, setTasks] = useState<any[]>([]);
  const [cycleError, setCycleError] = useState<string | null>(null);
  const [validation, setValidation] = useState<any>(null);

  useEffect(() => {
    if (!activeEventId) return;
    async function load() {
      try {
        const [t, val] = await Promise.all([
          api.listTasks(activeEventId!),
          api.validatePlan(activeEventId!),
        ]);
        // Perform topological sort based on dependency_ids
        const sorted = topologicalSort(t);
        if (Array.isArray(sorted)) {
          setCycleError(null);
          setTasks(sorted);
        } else {
          setCycleError(sorted.error);
          setTasks(t); // fall back to original order
        }
        setValidation(val);
      } catch (err) {
        console.error('Failed to load timeline', err);
      }
    }
    load();
  }, [activeEventId]);

  if (!activeEvent) {
    return (
      <div className="p-8 max-w-5xl mx-auto text-center py-16">
        <Clock size={36} className="mx-auto text-gray-400 mb-2" />
        <h3 className="text-lg font-bold text-[#1a2b4a]">No event selected</h3>
        <p className="text-xs text-gray-500 mt-1">Please select an event to view its timeline.</p>
      </div>
    );
  }

  const conflicts = validation?.scheduling?.conflicts || [];
  const impossibleDeadlines = validation?.scheduling?.impossible_deadlines || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1a2b4a] tracking-tight">Timeline & Milestones</h1>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            PlanForge topological schedule ordering & dependency graphs for {activeEvent.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
            Event Date: {formatDate(activeEvent.event_date)}
          </span>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl">
            {activeEvent.days_remaining} Days Remaining
          </span>
        </div>
      </div>

      {/* Scheduling Conflicts Alert */}
      {conflicts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-900">
            <AlertTriangle size={16} />
            <span>Scheduling Conflicts Detected by PlanForge:</span>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {conflicts.map((c: string, idx: number) => (
              <li key={idx}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Cycle detection warning */}
      {cycleError && (
        <div role="alert" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs mb-4">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle size={16} />
            <span>{cycleError}</span>
          </div>
        </div>
      )}

      {/* Timeline Gantt Flow */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-[#1a2b4a]">Task Execution Sequence</h3>
          <span className="text-xs text-gray-400 font-semibold">{tasks.length} Tracked Tasks</span>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12 text-xs text-gray-400">
            No tasks found. Create tasks or generate a plan from the AI Workspace.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-100">
            {tasks.map((task, idx) => {
              const isImpossible = impossibleDeadlines.some((d: any) => d.task_id === task.id);
              const isCompleted = task.status === 'completed';

              return (
                <div key={task.id} className="relative flex items-start gap-4 group">
                  {/* Timeline Node Icon */}
                  <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-xs ${
                    isCompleted
                      ? 'bg-emerald-500 text-white'
                      : isImpossible
                      ? 'bg-rose-500 text-white'
                      : task.is_milestone
                      ? 'bg-amber-500 text-white'
                      : 'bg-blue-600 text-white'
                  }`}>
                    {task.is_milestone ? <Milestone size={10} /> : idx + 1}
                  </div>

                  {/* Task Card */}
                  <div className={`flex-1 bg-gray-50/80 hover:bg-white border rounded-2xl p-4.5 transition-all shadow-2xs hover:shadow-xs ${
                    isImpossible ? 'border-rose-300 bg-rose-50/30' : 'border-gray-100 hover:border-blue-100'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#1a2b4a]">{task.name}</span>
                        {task.is_milestone && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Flag size={10} /> Milestone
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          task.priority === 'critical' ? 'bg-rose-100 text-rose-700' : 'bg-gray-200 text-gray-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Clock size={13} className="text-gray-400" />
                          {task.duration_days} day(s) duration
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full uppercase text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : task.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-xs text-gray-600 mt-2 font-normal leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Dependencies indicator */}
                    {task.dependency_ids && task.dependency_ids.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-500 flex items-center gap-1.5">
                        <ChevronRight size={12} className="text-blue-500" />
                        <span className="font-semibold text-gray-700">Depends on:</span>
                        <span>{task.dependency_ids.length} prerequisite task(s)</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
