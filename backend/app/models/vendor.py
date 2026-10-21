"""Vendor SQLAlchemy model."""
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid

from app.database import Base


class BookingStatus(str, enum.Enum):
    not_contacted = "not_contacted"
    contacted = "contacted"
    negotiating = "negotiating"
    booked = "booked"
    confirmed = "confirmed"
    cancelled = "cancelled"


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(255), nullable=False)
    vendor_name = Column(String(255), nullable=True)
    contact_name = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    contact_email = Column(String(255), nullable=True)
    estimated_cost = Column(Float, nullable=True)
    actual_cost = Column(Float, nullable=True)
    booking_status = Column(Enum(BookingStatus), default=BookingStatus.not_contacted)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    event = relationship("Event", back_populates="vendors")
