"""Event SQLAlchemy model."""
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid

from app.database import Base


class EventType(str, enum.Enum):
    wedding = "wedding"
    birthday = "birthday"
    college_fest = "college_fest"
    community = "community"
    corporate = "corporate"
    other = "other"


class EventStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class PlanningMode(str, enum.Enum):
    manual = "manual"
    ai = "ai"


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    event_type = Column(Enum(EventType), nullable=False, default=EventType.other)
    planning_mode = Column(Enum(PlanningMode), nullable=False, default=PlanningMode.ai, server_default="ai")
    event_date = Column(String(20), nullable=False)  # ISO date string
    location = Column(String(500), nullable=False)
    guest_count = Column(Integer, nullable=False, default=0)
    total_budget = Column(Float, nullable=False, default=0.0)
    description = Column(Text, nullable=True)
    preferences = Column(Text, nullable=True)
    mandatory_expenses = Column(Text, nullable=True)  # JSON string
    status = Column(Enum(EventStatus), nullable=False, default=EventStatus.active)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="events")
    budget_categories = relationship("BudgetCategory", back_populates="event", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="event", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="event", cascade="all, delete-orphan")
    vendors = relationship("Vendor", back_populates="event", cascade="all, delete-orphan")
    plan_versions = relationship("PlanVersion", back_populates="event", cascade="all, delete-orphan")
    activities = relationship("ActivityRecord", back_populates="event", cascade="all, delete-orphan")
