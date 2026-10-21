"""
PlanForge Scheduling Constraint Engine.

Deterministic scheduling validation using topological sort and deadline analysis.
Detects circular dependencies, impossible deadlines, and scheduling conflicts.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple
from datetime import date, timedelta
from collections import defaultdict, deque


@dataclass
class ScheduleTask:
    """A task in the scheduling engine."""
    id: str
    name: str
    duration_days: int
    due_date: Optional[date] = None
    dependency_ids: List[str] = field(default_factory=list)
    is_milestone: bool = False


@dataclass
class SchedulingResult:
    """Result of scheduling constraint validation."""
    is_feasible: bool
    schedule: Dict[str, Dict]  # task_id -> {start_date, end_date, ...}
    circular_dependencies: List[List[str]] = field(default_factory=list)
    impossible_deadlines: List[Dict] = field(default_factory=list)
    conflicts: List[str] = field(default_factory=list)
    explanation: str = ""


class SchedulingConstraintEngine:
    """
    PlanForge Scheduling Constraint Engine.

    Validates task schedules subject to:
    - Dependency ordering (topological sort)
    - Circular dependency detection
    - Deadline feasibility
    - Event date constraint
    """

    def validate(
        self,
        tasks: List[ScheduleTask],
        event_date: date,
        today: Optional[date] = None,
    ) -> SchedulingResult:
        """
        Validate and compute a feasible schedule.

        Args:
            tasks: List of tasks with durations, deadlines, and dependencies
            event_date: The event date (hard deadline for all tasks)
            today: Today's date for relative calculations (defaults to date.today())

        Returns:
            SchedulingResult with feasibility and computed schedule
        """
        if today is None:
            today = date.today()

        if not tasks:
            return SchedulingResult(
                is_feasible=True,
                schedule={},
                explanation="No tasks to schedule."
            )

        task_map: Dict[str, ScheduleTask] = {t.id: t for t in tasks}

        # 1. Detect circular dependencies
        circular = self._detect_circular_dependencies(tasks, task_map)
        if circular:
            return SchedulingResult(
                is_feasible=False,
                schedule={},
                circular_dependencies=circular,
                conflicts=[f"Circular dependency detected: {' -> '.join(cycle)}" for cycle in circular],
                explanation=(
                    f"Schedule is infeasible due to {len(circular)} circular "
                    f"dependency chain(s). Circular dependencies make it impossible "
                    "to determine task order."
                )
            )

        # 2. Topological sort
        try:
            ordered_ids = self._topological_sort(tasks, task_map)
        except ValueError as e:
            return SchedulingResult(
                is_feasible=False,
                schedule={},
                conflicts=[str(e)],
                explanation=str(e)
            )

        # 3. Compute earliest start dates (forward pass)
        earliest_start: Dict[str, date] = {}
        earliest_end: Dict[str, date] = {}

        for task_id in ordered_ids:
            task = task_map[task_id]
            if task.dependency_ids:
                # Start after all dependencies complete
                latest_dep_end = max(
                    earliest_end[dep_id]
                    for dep_id in task.dependency_ids
                    if dep_id in earliest_end
                )
                start = latest_dep_end + timedelta(days=1)
            else:
                start = today

            earliest_start[task_id] = start
            earliest_end[task_id] = start + timedelta(days=max(task.duration_days - 1, 0))

        # 4. Check deadlines
        impossible_deadlines = []
        conflicts = []

        for task_id in ordered_ids:
            task = task_map[task_id]
            end_date = earliest_end[task_id]

            # Check against explicit task deadline
            if task.due_date and end_date > task.due_date:
                impossible_deadlines.append({
                    "task_id": task_id,
                    "task_name": task.name,
                    "earliest_completion": end_date.isoformat(),
                    "deadline": task.due_date.isoformat(),
                    "days_late": (end_date - task.due_date).days,
                })
                conflicts.append(
                    f"Task '{task.name}' cannot finish by {task.due_date.isoformat()} "
                    f"(earliest finish: {end_date.isoformat()}, "
                    f"{(end_date - task.due_date).days} days late)"
                )

            # Check against event date
            if end_date > event_date:
                impossible_deadlines.append({
                    "task_id": task_id,
                    "task_name": task.name,
                    "earliest_completion": end_date.isoformat(),
                    "deadline": event_date.isoformat(),
                    "days_late": (end_date - event_date).days,
                    "type": "event_date_violation"
                })
                conflicts.append(
                    f"Task '{task.name}' cannot finish before event date {event_date.isoformat()} "
                    f"(earliest finish: {end_date.isoformat()})"
                )

        schedule = {
            task_id: {
                "task_name": task_map[task_id].name,
                "start_date": earliest_start[task_id].isoformat(),
                "end_date": earliest_end[task_id].isoformat(),
                "duration_days": task_map[task_id].duration_days,
                "is_on_time": task_id not in [d["task_id"] for d in impossible_deadlines],
            }
            for task_id in ordered_ids
        }

        is_feasible = len(conflicts) == 0

        explanation = (
            "Schedule is feasible. All tasks can be completed before the event."
            if is_feasible
            else (
                f"Schedule has {len(conflicts)} conflict(s). "
                f"{len(impossible_deadlines)} task(s) cannot meet their deadlines."
            )
        )

        return SchedulingResult(
            is_feasible=is_feasible,
            schedule=schedule,
            impossible_deadlines=impossible_deadlines,
            conflicts=conflicts,
            explanation=explanation
        )

    def _detect_circular_dependencies(
        self,
        tasks: List[ScheduleTask],
        task_map: Dict[str, ScheduleTask]
    ) -> List[List[str]]:
        """Detect circular dependencies using DFS with coloring."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color: Dict[str, int] = {t.id: WHITE for t in tasks}
        parent: Dict[str, Optional[str]] = {t.id: None for t in tasks}
        cycles: List[List[str]] = []

        def dfs(node: str) -> bool:
            color[node] = GRAY
            task = task_map.get(node)
            if task:
                for dep_id in task.dependency_ids:
                    if dep_id not in task_map:
                        continue
                    if color[dep_id] == GRAY:
                        # Found a cycle, trace it
                        cycle = [dep_id]
                        current = node
                        while current != dep_id:
                            cycle.append(current)
                            current = parent.get(current, dep_id)
                        cycle.append(dep_id)
                        cycles.append(cycle[::-1])
                        return True
                    if color[dep_id] == WHITE:
                        parent[dep_id] = node
                        if dfs(dep_id):
                            return True
            color[node] = BLACK
            return False

        for task in tasks:
            if color[task.id] == WHITE:
                dfs(task.id)

        return cycles

    def _topological_sort(
        self,
        tasks: List[ScheduleTask],
        task_map: Dict[str, ScheduleTask]
    ) -> List[str]:
        """
        Kahn's algorithm for topological sort.
        Returns ordered list of task IDs.
        """
        in_degree: Dict[str, int] = {t.id: 0 for t in tasks}
        adjacency: Dict[str, List[str]] = defaultdict(list)

        for task in tasks:
            for dep_id in task.dependency_ids:
                if dep_id in in_degree:
                    # dep_id must finish before task
                    # so dep_id -> task in dependency graph
                    adjacency[dep_id].append(task.id)
                    in_degree[task.id] += 1

        queue = deque([t.id for t in tasks if in_degree[t.id] == 0])
        result = []

        while queue:
            node = queue.popleft()
            result.append(node)
            for neighbor in adjacency[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if len(result) != len(tasks):
            raise ValueError("Circular dependency detected during topological sort")

        return result

    def days_until_event(self, event_date: date, today: Optional[date] = None) -> int:
        """Calculate days remaining until the event."""
        if today is None:
            today = date.today()
        return (event_date - today).days
