"""Pydantic schemas for budget and expenses."""
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List


class BudgetCategoryCreate(BaseModel):
    name: str
    allocated_amount: float
    is_mandatory: bool = False
    is_fixed: bool = False
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    notes: Optional[str] = None


class BudgetCategoryUpdate(BaseModel):
    name: Optional[str] = None
    allocated_amount: Optional[float] = None
    is_mandatory: Optional[bool] = None
    is_fixed: Optional[bool] = None
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    notes: Optional[str] = None


class BudgetCategoryResponse(BaseModel):
    id: str
    event_id: str
    name: str
    allocated_amount: float
    is_mandatory: bool
    is_fixed: bool
    min_amount: Optional[float] = None
    max_amount: Optional[float] = None
    notes: Optional[str] = None
    actual_spent: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class ExpenseCreate(BaseModel):
    name: str
    estimated_cost: float
    actual_cost: Optional[float] = None
    is_paid: bool = False
    vendor_name: Optional[str] = None
    category_id: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("estimated_cost")
    @classmethod
    def cost_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Cost cannot be negative")
        return v


class ExpenseUpdate(BaseModel):
    name: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    is_paid: Optional[bool] = None
    vendor_name: Optional[str] = None
    category_id: Optional[str] = None
    notes: Optional[str] = None


class ExpenseResponse(BaseModel):
    id: str
    event_id: str
    category_id: Optional[str] = None
    name: str
    estimated_cost: float
    actual_cost: Optional[float] = None
    is_paid: bool
    vendor_name: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BudgetSummary(BaseModel):
    total_budget: float
    allocated_budget: float
    unallocated_budget: float
    actual_expenses: float
    vendor_commitments: float = 0.0
    total_exposure: float = 0.0
    unspent_budget: float
    remaining_budget: float
    categories: List[BudgetCategoryResponse]
