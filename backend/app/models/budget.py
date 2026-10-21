"""Budget SQLAlchemy models."""
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base


class BudgetCategory(Base):
    __tablename__ = "budget_categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    allocated_amount = Column(Float, nullable=False, default=0.0)
    is_mandatory = Column(Boolean, default=False)
    is_fixed = Column(Boolean, default=False)
    min_amount = Column(Float, nullable=True)
    max_amount = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    event = relationship("Event", back_populates="budget_categories")
    expenses = relationship("Expense", back_populates="category", cascade="all, delete-orphan")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String, ForeignKey("events.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String, ForeignKey("budget_categories.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(255), nullable=False)
    estimated_cost = Column(Float, nullable=False, default=0.0)
    actual_cost = Column(Float, nullable=True)
    is_paid = Column(Boolean, default=False)
    vendor_name = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    event = relationship("Event", back_populates="expenses")
    category = relationship("BudgetCategory", back_populates="expenses")
