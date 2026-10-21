"""
PlanForge Validator — unified constraint validation interface.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import date

from app.planforge.budget_engine import BudgetConstraintEngine, BudgetItem, BudgetConstraintResult
from app.planforge.scheduling_engine import SchedulingConstraintEngine, ScheduleTask, SchedulingResult


@dataclass
class PlanValidationResult:
    """Combined budget and scheduling validation result."""
    is_feasible: bool
    budget_result: BudgetConstraintResult
    scheduling_result: SchedulingResult
    overall_status: str  # "feasible" | "infeasible" | "warning"
    summary: str
    violations: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class PlanForgeValidator:
    """
    Unified PlanForge constraint validator.

    Combines budget and scheduling validation into a single pass.
    Reports exactly which constraints are violated without fabricating feasibility.
    """

    def __init__(self):
        self.budget_engine = BudgetConstraintEngine()
        self.scheduling_engine = SchedulingConstraintEngine()

    def validate_plan(
        self,
        total_budget: float,
        budget_items: List[BudgetItem],
        tasks: List[ScheduleTask],
        event_date: date,
        today: Optional[date] = None,
    ) -> PlanValidationResult:
        """
        Full plan validation: budget + scheduling.
        """
        budget_result = self.budget_engine.validate(total_budget, budget_items)
        scheduling_result = self.scheduling_engine.validate(tasks, event_date, today)

        all_violations = list(budget_result.violations) + list(scheduling_result.conflicts)
        all_warnings = list(budget_result.warnings)

        is_feasible = budget_result.is_feasible and scheduling_result.is_feasible

        if is_feasible and all_warnings:
            status = "warning"
        elif is_feasible:
            status = "feasible"
        else:
            status = "infeasible"

        parts = []
        if not budget_result.is_feasible:
            parts.append(f"Budget: {budget_result.explanation}")
        if not scheduling_result.is_feasible:
            parts.append(f"Schedule: {scheduling_result.explanation}")
        if is_feasible:
            parts.append("Plan passes all constraints.")
        if all_warnings:
            parts.append(f"Warnings: {'; '.join(all_warnings)}")

        return PlanValidationResult(
            is_feasible=is_feasible,
            budget_result=budget_result,
            scheduling_result=scheduling_result,
            overall_status=status,
            summary="\n".join(parts),
            violations=all_violations,
            warnings=all_warnings,
        )

    def to_dict(self, result: PlanValidationResult) -> Dict[str, Any]:
        """Serialize validation result to dictionary."""
        return {
            "is_feasible": result.is_feasible,
            "overall_status": result.overall_status,
            "summary": result.summary,
            "violations": result.violations,
            "warnings": result.warnings,
            "budget": {
                "is_feasible": result.budget_result.is_feasible,
                "total_budget": result.budget_result.total_budget,
                "mandatory_total": result.budget_result.mandatory_total,
                "fixed_total": result.budget_result.fixed_total,
                "variable_total": result.budget_result.variable_total,
                "allocated_total": result.budget_result.allocated_total,
                "shortfall": result.budget_result.shortfall,
                "violations": result.budget_result.violations,
                "warnings": result.budget_result.warnings,
                "explanation": result.budget_result.explanation,
            },
            "scheduling": {
                "is_feasible": result.scheduling_result.is_feasible,
                "schedule": result.scheduling_result.schedule,
                "circular_dependencies": result.scheduling_result.circular_dependencies,
                "impossible_deadlines": result.scheduling_result.impossible_deadlines,
                "conflicts": result.scheduling_result.conflicts,
                "explanation": result.scheduling_result.explanation,
            }
        }
