"""Plan version and activity models."""
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, Text, Integer, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base


class PlanVersion(Base):
    __tablename__ = "plan_versions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, default=True)
    plan_data = Column(Text, nullable=False)  # JSON string of full plan snapshot
    feasibility_status = Column(String(50), default="unknown")
    feasibility_details = Column(Text, nullable=True)  # JSON string
    change_summary = Column(Text, nullable=True)
    created_by = Column(String(100), default="system")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="plan_versions")


class ActivityRecord(Base):
    __tablename__ = "activity_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(100), nullable=True)
    entity_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="activities")
