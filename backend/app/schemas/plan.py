"""Pydantic schemas for plan versions and replanning."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


class PlanVersionResponse(BaseModel):
    id: str
    event_id: str
    version_number: int
    is_active: bool
    feasibility_status: str
    feasibility_details: Optional[Dict[str, Any]] = None
    change_summary: Optional[str] = None
    created_by: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class ReplanRequest(BaseModel):
    change_description: str
    new_budget: Optional[float] = None
    new_date: Optional[str] = None
    new_guest_count: Optional[int] = None
    additional_context: Optional[str] = None


class ReplanPreview(BaseModel):
    original_plan: Dict[str, Any]
    revised_plan: Dict[str, Any]
    changes: List[Dict[str, Any]]
    feasibility_status: str
    feasibility_details: Dict[str, Any]
    explanation: str
    is_feasible: bool


class AcceptReplanRequest(BaseModel):
    preview_token: str
    notes: Optional[str] = None


class ActivityResponse(BaseModel):
    id: str
    event_id: str
    action: str
    entity_type: Optional[str] = None
    details: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True
