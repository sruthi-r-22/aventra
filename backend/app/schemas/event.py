"""Pydantic schemas for events."""
from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from enum import Enum


class EventType(str, Enum):
    wedding = "wedding"
    birthday = "birthday"
    college_fest = "college_fest"
    community = "community"
    corporate = "corporate"
    other = "other"


class EventStatus(str, Enum):
    draft = "draft"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class PlanningMode(str, Enum):
    manual = "manual"
    ai = "ai"


class EventCreate(BaseModel):
    name: str
    event_type: EventType
    planning_mode: PlanningMode = PlanningMode.ai
    event_date: str  # ISO date string
    location: str
    guest_count: int
    total_budget: float
    description: Optional[str] = None
    preferences: Optional[str] = None
    mandatory_expenses: Optional[List[dict]] = None
    # Optional pre-approved items for AI draft approval or manual initial setup
    initial_categories: Optional[List[dict]] = None
    initial_tasks: Optional[List[dict]] = None
    initial_vendors: Optional[List[dict]] = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Event name cannot be empty")
        return v.strip()

    @field_validator("total_budget")
    @classmethod
    def budget_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Budget must be positive")
        return v

    @field_validator("guest_count")
    @classmethod
    def guests_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Guest count must be positive")
        return v


class EventUpdate(BaseModel):
    name: Optional[str] = None
    event_date: Optional[str] = None
    location: Optional[str] = None
    guest_count: Optional[int] = None
    total_budget: Optional[float] = None
    description: Optional[str] = None
    preferences: Optional[str] = None
    status: Optional[EventStatus] = None


class EventResponse(BaseModel):
    id: str
    name: str
    event_type: str
    planning_mode: str = "ai"
    event_date: str
    location: str
    guest_count: int
    total_budget: float
    description: Optional[str] = None
    preferences: Optional[str] = None
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EventSummary(BaseModel):
    id: str
    name: str
    event_type: str
    planning_mode: str = "ai"
    event_date: str
    location: str
    guest_count: int
    total_budget: float
    status: str
    days_remaining: int
    allocated_budget: float
    unallocated_budget: float
    actual_expenses: float
    unspent_budget: float
    remaining_budget: float
    task_count: int
    completed_tasks: int
    feasibility_status: str

    model_config = ConfigDict(from_attributes=True)


class AIDraftRequest(BaseModel):
    name: str
    event_type: EventType
    event_date: str
    location: str
    guest_count: int
    total_budget: float
    description: Optional[str] = None
    preferences: Optional[str] = None
    mandatory_expenses: Optional[List[dict]] = None


class AIDraftResponse(BaseModel):
    theme: str
    description: str
    budget_categories: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    vendor_categories: List[Dict[str, Any]]
    planning_notes: str
    is_ai_generated: bool
    validation: Dict[str, Any]
