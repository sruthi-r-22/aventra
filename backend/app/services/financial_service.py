"""Shared financial exposure calculations for event budgets."""
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.budget import Expense
from app.models.vendor import Vendor


def get_financial_exposure(
    db: Session,
    event_id: str,
    expenses: Optional[List[Expense]] = None,
) -> Tuple[float, float]:
    """Return paid actual expenses and active booked/confirmed vendor commitments."""
    if expenses is None:
        expenses = db.query(Expense).filter(Expense.event_id == event_id).all()

    actual_expenses = sum(
        expense.actual_cost if expense.actual_cost is not None else expense.estimated_cost
        for expense in expenses
        if expense.is_paid
    )
    active_vendors = db.query(Vendor).filter(
        Vendor.event_id == event_id,
        Vendor.booking_status.in_(["booked", "confirmed"]),
        Vendor.estimated_cost.isnot(None),
    ).all()
    vendor_commitments = sum(vendor.estimated_cost or 0 for vendor in active_vendors)
    return actual_expenses, vendor_commitments
