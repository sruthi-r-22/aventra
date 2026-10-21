"""Pydantic schemas for tasks."""
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class TaskStatus(str, Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"
    blocked = "blocked"
    overdue = "overdue"


class TaskPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: TaskStatus = TaskStatus.pending
    priority: TaskPriority = TaskPriority.medium
    due_date: Optional[str] = None
    duration_days: int = 1
    is_milestone: bool = False
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    dependency_ids: Optional[List[str]] = None


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[str] = None
    duration_days: Optional[int] = None
    is_milestone: Optional[bool] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None


class TaskResponse(BaseModel):
    id: str
    event_id: str
    name: str
    description: Optional[str] = None
    status: str
    priority: str
    due_date: Optional[str] = None
    duration_days: int
    is_milestone: bool
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    dependency_ids: List[str] = []

    class Config:
        from_attributes = True
