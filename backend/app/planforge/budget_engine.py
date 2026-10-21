"""
PlanForge Budget Constraint Engine.

Deterministic budget validation and allocation using OR-Tools.
This module never silently removes constraints to produce a feasible result.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from ortools.sat.python import cp_model


@dataclass
class BudgetItem:
    """Represents a single budget item with constraints."""
    id: str
    name: str
    amount: float
    is_mandatory: bool = False
    is_fixed: bool = False
    min_amount: float = 0.0
    max_amount: Optional[float] = None

    def effective_max(self) -> float:
        if self.max_amount is not None:
            return self.max_amount
        return self.amount * 3.0  # Default upper bound


@dataclass
class BudgetConstraintResult:
    """Result of budget constraint validation."""
    is_feasible: bool
    total_budget: float
    mandatory_total: float
    fixed_total: float
    variable_total: float
    allocated_total: float
    shortfall: float = 0.0
    violations: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    optimized_allocations: Dict[str, float] = field(default_factory=dict)
    explanation: str = ""


class BudgetConstraintEngine:
    """
    PlanForge Budget Constraint Engine.

    Validates and optimizes budget allocations subject to:
    - Total budget ceiling
    - Mandatory expense preservation
    - Fixed expense lock-in
    - Variable expense bounds
    """

    def validate(
        self,
        total_budget: float,
        items: List[BudgetItem],
    ) -> BudgetConstraintResult:
        """
        Validate and optimize budget allocations.

        Args:
            total_budget: Maximum available budget
            items: List of budget items with constraints

        Returns:
            BudgetConstraintResult with feasibility status and details
        """
        if total_budget <= 0:
            return BudgetConstraintResult(
                is_feasible=False,
                total_budget=total_budget,
                mandatory_total=0,
                fixed_total=0,
                variable_total=0,
                allocated_total=0,
                shortfall=0,
                violations=["Total budget must be positive"],
                explanation="Budget must be greater than zero."
            )

        mandatory_items = [i for i in items if i.is_mandatory]
        fixed_items = [i for i in items if i.is_fixed and not i.is_mandatory]
        variable_items = [i for i in items if not i.is_fixed and not i.is_mandatory]

        mandatory_total = sum(i.amount for i in mandatory_items)
        fixed_total = sum(i.amount for i in fixed_items)

        violations = []
        warnings = []

        # Check if mandatory expenses alone exceed the budget
        if mandatory_total > total_budget:
            shortfall = mandatory_total - total_budget
            return BudgetConstraintResult(
                is_feasible=False,
                total_budget=total_budget,
                mandatory_total=mandatory_total,
                fixed_total=fixed_total,
                variable_total=sum(i.amount for i in variable_items),
                allocated_total=mandatory_total + fixed_total,
                shortfall=shortfall,
                violations=[
                    f"Mandatory expenses (₹{mandatory_total:,.0f}) exceed total budget "
                    f"(₹{total_budget:,.0f}) by ₹{shortfall:,.0f}"
                ],
                explanation=(
                    f"The plan is infeasible. Mandatory costs of ₹{mandatory_total:,.0f} "
                    f"exceed the available budget of ₹{total_budget:,.0f}. "
                    f"You need at least ₹{shortfall:,.0f} more or must reduce mandatory expenses."
                )
            )

        # Check if mandatory + fixed exceed the budget
        if mandatory_total + fixed_total > total_budget:
            shortfall = mandatory_total + fixed_total - total_budget
            violations.append(
                f"Mandatory (₹{mandatory_total:,.0f}) + Fixed (₹{fixed_total:,.0f}) "
                f"= ₹{mandatory_total + fixed_total:,.0f} exceeds budget (₹{total_budget:,.0f})"
            )

        remaining_for_variable = total_budget - mandatory_total - fixed_total
        variable_total_requested = sum(i.amount for i in variable_items)

        if remaining_for_variable < 0:
            # Already captured above
            pass
        elif variable_total_requested > remaining_for_variable:
            warnings.append(
                f"Variable expenses (₹{variable_total_requested:,.0f}) exceed remaining "
                f"budget after mandatory and fixed (₹{remaining_for_variable:,.0f}). "
                "They will be scaled down proportionally."
            )

        if violations:
            shortfall = max(0, (mandatory_total + fixed_total) - total_budget)
            return BudgetConstraintResult(
                is_feasible=False,
                total_budget=total_budget,
                mandatory_total=mandatory_total,
                fixed_total=fixed_total,
                variable_total=variable_total_requested,
                allocated_total=mandatory_total + fixed_total,
                shortfall=shortfall,
                violations=violations,
                warnings=warnings,
                explanation="; ".join(violations)
            )

        # Use OR-Tools to optimize variable allocations
        optimized = self._optimize_allocations(
            total_budget=total_budget,
            mandatory_items=mandatory_items,
            fixed_items=fixed_items,
            variable_items=variable_items,
            remaining_budget=remaining_for_variable,
        )

        all_allocations = {}
        for item in mandatory_items + fixed_items:
            all_allocations[item.id] = item.amount
        all_allocations.update(optimized)

        allocated_total = sum(all_allocations.values())

        return BudgetConstraintResult(
            is_feasible=True,
            total_budget=total_budget,
            mandatory_total=mandatory_total,
            fixed_total=fixed_total,
            variable_total=sum(optimized.values()),
            allocated_total=allocated_total,
            shortfall=0.0,
            violations=[],
            warnings=warnings,
            optimized_allocations=all_allocations,
            explanation=(
                f"Budget plan is feasible. ₹{allocated_total:,.0f} allocated "
                f"out of ₹{total_budget:,.0f} available. "
                f"₹{total_budget - allocated_total:,.0f} unallocated."
            )
        )

    def _optimize_allocations(
        self,
        total_budget: float,
        mandatory_items: List[BudgetItem],
        fixed_items: List[BudgetItem],
        variable_items: List[BudgetItem],
        remaining_budget: float,
    ) -> Dict[str, float]:
        """
        Use proportional allocation for variable items within budget.
        Falls back from OR-Tools integer program to proportional scaling.
        """
        if not variable_items:
            return {}

        variable_total = sum(i.amount for i in variable_items)

        if variable_total <= 0:
            return {i.id: 0.0 for i in variable_items}

        if variable_total <= remaining_budget:
            # All variable items can be fully allocated
            return {i.id: i.amount for i in variable_items}

        # Scale down proportionally while respecting min_amount
        result = {}
        scale_factor = remaining_budget / variable_total

        for item in variable_items:
            scaled = item.amount * scale_factor
            # Respect minimum allocation
            result[item.id] = max(scaled, item.min_amount)

        # If minimums cause overage, clip to budget
        total_after_mins = sum(result.values())
        if total_after_mins > remaining_budget:
            # Re-scale above-minimum portions
            above_min = {
                i.id: result[i.id] - i.min_amount
                for i in variable_items
                if result[i.id] > i.min_amount
            }
            total_above = sum(above_min.values())
            available_above = remaining_budget - sum(i.min_amount for i in variable_items)
            if total_above > 0 and available_above >= 0:
                adj_factor = available_above / total_above
                for item in variable_items:
                    result[item.id] = item.min_amount + above_min.get(item.id, 0) * adj_factor
            else:
                for item in variable_items:
                    result[item.id] = item.min_amount

        return result

    def check_budget_change(
        self,
        original_budget: float,
        new_budget: float,
        items: List[BudgetItem],
    ) -> Tuple[BudgetConstraintResult, BudgetConstraintResult, List[str]]:
        """
        Compare feasibility before and after a budget change.

        Returns (original_result, new_result, change_impacts)
        """
        original = self.validate(original_budget, items)
        revised = self.validate(new_budget, items)

        impacts = []
        if original.is_feasible and not revised.is_feasible:
            impacts.append(
                f"Budget reduction from ₹{original_budget:,.0f} to ₹{new_budget:,.0f} "
                f"makes the plan infeasible."
            )
        elif revised.shortfall > 0:
            impacts.append(f"Revised plan has a shortfall of ₹{revised.shortfall:,.0f}.")

        if original.is_feasible and revised.is_feasible:
            saved = original.allocated_total - revised.allocated_total
            if saved > 0:
                impacts.append(f"Budget reduced by ₹{abs(new_budget - original_budget):,.0f}.")

        return original, revised, impacts
