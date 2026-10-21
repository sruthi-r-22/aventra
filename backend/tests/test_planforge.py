"""
PlanForge unit tests.

Tests budget feasibility, scheduling, constraint detection, and replanning behavior.
"""
import pytest
from datetime import date, timedelta

from app.planforge.budget_engine import BudgetConstraintEngine, BudgetItem
from app.planforge.scheduling_engine import SchedulingConstraintEngine, ScheduleTask
from app.planforge.validator import PlanForgeValidator


# ─── Budget Engine Tests ──────────────────────────────────────────────────────

class TestBudgetConstraintEngine:
    """Tests for PlanForge budget constraint engine."""

    def setup_method(self):
        self.engine = BudgetConstraintEngine()

    def _make_item(self, id, name, amount, mandatory=False, fixed=False, min_amt=0.0, max_amt=None):
        return BudgetItem(
            id=id, name=name, amount=amount,
            is_mandatory=mandatory, is_fixed=fixed,
            min_amount=min_amt, max_amount=max_amt
        )

    def test_feasible_plan(self):
        """A plan where all items fit within budget is feasible."""
        items = [
            self._make_item("1", "Venue", 50000, mandatory=True),
            self._make_item("2", "Catering", 30000),
            self._make_item("3", "Decor", 20000),
        ]
        result = self.engine.validate(100000, items)
        assert result.is_feasible is True
        assert result.shortfall == 0.0
        assert len(result.violations) == 0

    def test_mandatory_expenses_preserved(self):
        """Mandatory expenses must never be reduced below their stated amount."""
        items = [
            self._make_item("1", "Venue", 60000, mandatory=True),
            self._make_item("2", "Catering", 50000, mandatory=True),
        ]
        result = self.engine.validate(100000, items)
        # Mandatory total = 110000 > budget 100000 → infeasible
        assert result.is_feasible is False
        assert result.mandatory_total == 110000

    def test_budget_shortfall_exact_amount(self):
        """Shortfall must be the exact difference between mandatory costs and budget."""
        items = [
            self._make_item("1", "Venue", 80000, mandatory=True),
            self._make_item("2", "Catering", 60000, mandatory=True),
        ]
        budget = 100000
        result = self.engine.validate(budget, items)
        assert result.is_feasible is False
        expected_shortfall = 80000 + 60000 - budget
        assert result.shortfall == pytest.approx(expected_shortfall)

    def test_fixed_expense_not_reduced(self):
        """Fixed expenses should remain at their stated amount when allocations are optimized."""
        items = [
            self._make_item("1", "Venue", 40000, mandatory=True, fixed=True),
            self._make_item("2", "Entertainment", 20000, mandatory=False, fixed=False),
        ]
        result = self.engine.validate(80000, items)
        assert result.is_feasible is True
        # Fixed mandatory item must be allocated exactly
        assert result.optimized_allocations.get("1") == pytest.approx(40000)

    def test_zero_budget_infeasible(self):
        """Zero or negative budget is always infeasible."""
        items = [self._make_item("1", "Venue", 10000)]
        result = self.engine.validate(0, items)
        assert result.is_feasible is False

    def test_variable_items_scaled_when_over_budget(self):
        """Variable items must be proportionally scaled when they exceed remaining budget."""
        items = [
            self._make_item("1", "Venue", 70000, mandatory=True),
            self._make_item("2", "Catering", 50000),  # variable
            self._make_item("3", "Decor", 30000),  # variable
        ]
        budget = 100000
        result = self.engine.validate(budget, items)
        assert result.is_feasible is True
        # Variable items get at most 30000 remaining
        variable_total = (
            result.optimized_allocations.get("2", 0) +
            result.optimized_allocations.get("3", 0)
        )
        assert variable_total <= 30000 + 0.01  # small float tolerance

    def test_mandatory_violation_in_violations_list(self):
        """Violations must be reported with clear messages when mandatory costs exceed budget."""
        items = [
            self._make_item("1", "Venue", 120000, mandatory=True),
        ]
        result = self.engine.validate(100000, items)
        assert result.is_feasible is False
        assert len(result.violations) > 0
        assert "mandatory" in result.violations[0].lower() or "exceed" in result.violations[0].lower()

    def test_budget_change_impact_detection(self):
        """check_budget_change correctly identifies when a budget reduction breaks feasibility."""
        items = [
            self._make_item("1", "Venue", 60000, mandatory=True),
            self._make_item("2", "Catering", 30000),
        ]
        original, revised, impacts = self.engine.check_budget_change(100000, 50000, items)
        assert original.is_feasible is True
        assert revised.is_feasible is False
        assert len(impacts) > 0

    def test_empty_items_feasible(self):
        """An event with no budget items is feasible (nothing to violate)."""
        result = self.engine.validate(100000, [])
        assert result.is_feasible is True


# ─── Scheduling Engine Tests ──────────────────────────────────────────────────

class TestSchedulingConstraintEngine:
    """Tests for PlanForge scheduling constraint engine."""

    def setup_method(self):
        self.engine = SchedulingConstraintEngine()
        self.today = date.today()
        self.event_date = self.today + timedelta(days=90)

    def _task(self, id, name, duration=2, due_date=None, deps=None, milestone=False):
        return ScheduleTask(
            id=id, name=name, duration_days=duration,
            due_date=due_date, dependency_ids=deps or [], is_milestone=milestone
        )

    def test_simple_schedule_feasible(self):
        """Simple tasks with no dependencies and generous deadlines are feasible."""
        tasks = [
            self._task("1", "Book Venue", duration=3),
            self._task("2", "Send Invites", duration=2),
        ]
        result = self.engine.validate(tasks, self.event_date)
        assert result.is_feasible is True
        assert len(result.conflicts) == 0

    def test_circular_dependency_detected(self):
        """Circular dependencies must be detected and reported."""
        tasks = [
            self._task("A", "Task A", deps=["B"]),
            self._task("B", "Task B", deps=["A"]),
        ]
        result = self.engine.validate(tasks, self.event_date)
        assert result.is_feasible is False
        assert len(result.circular_dependencies) > 0

    def test_impossible_deadline_detected(self):
        """Tasks that cannot finish by their deadline must be flagged."""
        yesterday = self.today - timedelta(days=1)
        tasks = [
            self._task("1", "Long Task", duration=30, due_date=yesterday),
        ]
        result = self.engine.validate(tasks, self.event_date)
        assert result.is_feasible is False
        assert len(result.impossible_deadlines) > 0

    def test_dependency_ordering(self):
        """Task B that depends on Task A must start after A completes."""
        tasks = [
            self._task("A", "Task A", duration=5),
            self._task("B", "Task B", duration=3, deps=["A"]),
        ]
        result = self.engine.validate(tasks, self.event_date)
        assert result.is_feasible is True
        # B must start after A ends
        a_end = result.schedule["A"]["end_date"]
        b_start = result.schedule["B"]["start_date"]
        assert b_start >= a_end

    def test_event_date_respected(self):
        """Tasks must all complete before the event date."""
        near_event = self.today + timedelta(days=5)
        tasks = [
            self._task("1", "Huge Task", duration=20),  # 20 days > 5 days until event
        ]
        result = self.engine.validate(tasks, near_event)
        assert result.is_feasible is False

    def test_empty_tasks_feasible(self):
        """Empty task list should return feasible."""
        result = self.engine.validate([], self.event_date)
        assert result.is_feasible is True

    def test_no_circular_for_valid_deps(self):
        """Linear dependency chain should not trigger circular detection."""
        tasks = [
            self._task("A", "Step 1"),
            self._task("B", "Step 2", deps=["A"]),
            self._task("C", "Step 3", deps=["B"]),
        ]
        result = self.engine.validate(tasks, self.event_date)
        assert result.circular_dependencies == []

    def test_days_until_event(self):
        """days_until_event correctly calculates remaining days."""
        future = date.today() + timedelta(days=30)
        days = self.engine.days_until_event(future)
        assert days == 30

    def test_three_way_circular_dependency(self):
        """Three-task circular dependency must be detected."""
        tasks = [
            self._task("A", "Task A", deps=["C"]),
            self._task("B", "Task B", deps=["A"]),
            self._task("C", "Task C", deps=["B"]),
        ]
        result = self.engine.validate(tasks, self.event_date)
        assert result.is_feasible is False
        assert len(result.circular_dependencies) > 0


# ─── Integrated Validator Tests ───────────────────────────────────────────────

class TestPlanForgeValidator:
    """Integration tests for the combined validator."""

    def setup_method(self):
        self.validator = PlanForgeValidator()
        self.today = date.today()
        self.event_date = self.today + timedelta(days=60)

    def test_fully_feasible_plan(self):
        """A plan with feasible budget and schedule should be fully feasible."""
        budget_items = [
            BudgetItem("1", "Venue", 50000, is_mandatory=True),
            BudgetItem("2", "Catering", 40000),
        ]
        tasks = [
            ScheduleTask("t1", "Book Venue", duration_days=3),
            ScheduleTask("t2", "Send Invites", duration_days=2),
        ]
        result = self.validator.validate_plan(100000, budget_items, tasks, self.event_date)
        assert result.is_feasible is True
        assert result.overall_status == "feasible"

    def test_budget_infeasible_makes_plan_infeasible(self):
        """Budget violation should make overall plan infeasible even with good schedule."""
        budget_items = [
            BudgetItem("1", "Venue", 120000, is_mandatory=True),
        ]
        result = self.validator.validate_plan(100000, budget_items, [], self.event_date)
        assert result.is_feasible is False
        assert result.overall_status == "infeasible"

    def test_schedule_infeasible_makes_plan_infeasible(self):
        """Schedule violation should make overall plan infeasible even with good budget."""
        budget_items = [BudgetItem("1", "Item", 10000)]
        # Past event date
        past_event = self.today - timedelta(days=1)
        tasks = [ScheduleTask("t1", "Task", duration_days=5)]
        result = self.validator.validate_plan(100000, budget_items, tasks, past_event)
        assert result.is_feasible is False

    def test_to_dict_serializable(self):
        """to_dict should return a JSON-serializable dictionary."""
        import json
        budget_items = [BudgetItem("1", "Venue", 50000)]
        result = self.validator.validate_plan(100000, budget_items, [], self.event_date)
        d = self.validator.to_dict(result)
        # Should be JSON serializable
        json.dumps(d)  # Will raise if not serializable
        assert "is_feasible" in d
        assert "budget" in d
        assert "scheduling" in d

    def test_replan_original_preserved(self):
        """Original plan validation result should not change when creating a new validation."""
        budget_items = [BudgetItem("1", "Venue", 50000, is_mandatory=True)]
        result1 = self.validator.validate_plan(100000, budget_items, [], self.event_date)
        # Simulate changed plan
        new_budget_items = [BudgetItem("1", "Venue", 110000, is_mandatory=True)]
        result2 = self.validator.validate_plan(100000, new_budget_items, [], self.event_date)
        # result1 should still be feasible
        assert result1.is_feasible is True
        assert result2.is_feasible is False
