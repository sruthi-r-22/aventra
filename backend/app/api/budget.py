"""Budget API router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.budget import BudgetCategory, Expense
from app.models.event import Event
from app.schemas.budget import (
    BudgetCategoryCreate, BudgetCategoryUpdate, BudgetCategoryResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, BudgetSummary,
)
from app.models.plan import ActivityRecord

router = APIRouter(prefix="/events/{event_id}/budget", tags=["budget"])


def _log(db, event_id, action, details=None):
    db.add(ActivityRecord(event_id=event_id, action=action, entity_type="budget", details=details))


def _get_event_or_404(db, event_id):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.get("/", response_model=BudgetSummary)
def get_budget_summary(event_id: str, db: Session = Depends(get_db)):
    """Get budget summary for an event, including vendor commitments.
    Calculates actual expenses based only on paid expenses, includes confirmed vendor
    commitments, and returns a comprehensive summary.
    """
    event = _get_event_or_404(db, event_id)
    # Fetch related data
    categories = db.query(BudgetCategory).filter(BudgetCategory.event_id == event_id).all()
    expenses = db.query(Expense).filter(Expense.event_id == event_id).all()
    # Vendor commitments: sum estimated_cost of confirmed vendors (unpaid)
    from app.models.vendor import Vendor
    # Include both BOOKED and CONFIRMED vendors as active commitments (exclude cancelled and others)
    active_vendors = db.query(Vendor).filter(
        Vendor.event_id == event_id,
        Vendor.booking_status.in_(["booked", "confirmed"]),
        Vendor.estimated_cost != None,
    ).all()
    vendor_commitments = sum(v.estimated_cost or 0 for v in active_vendors)


    # Calculate actual expenses: only count actual_cost of paid expenses; fallback to estimated_cost if missing
    actual_expenses = 0.0
    for e in expenses:
        if e.is_paid:
            actual_expenses += e.actual_cost if e.actual_cost is not None else e.estimated_cost

    # Prepare category responses with actual spent per category
    category_responses = []
    for cat in categories:
        cat_expenses = [e for e in expenses if e.category_id == cat.id]
        actual_spent = 0.0
        for e in cat_expenses:
            if e.is_paid:
                actual_spent += e.actual_cost if e.actual_cost is not None else e.estimated_cost
        category_responses.append(
            BudgetCategoryResponse(
                id=cat.id,
                event_id=cat.event_id,
                name=cat.name,
                allocated_amount=cat.allocated_amount,
                is_mandatory=cat.is_mandatory,
                is_fixed=cat.is_fixed,
                min_amount=cat.min_amount,
                max_amount=cat.max_amount,
                notes=cat.notes,
                actual_spent=actual_spent,
            )
        )

    allocated_budget = sum(c.allocated_amount for c in categories)
    total_exposure = actual_expenses + vendor_commitments
    unallocated_budget = event.total_budget - allocated_budget
    unspent_budget = event.total_budget - total_exposure

    return BudgetSummary(
        total_budget=event.total_budget,
        allocated_budget=allocated_budget,
        unallocated_budget=unallocated_budget,
        actual_expenses=actual_expenses,
        vendor_commitments=vendor_commitments,
        total_exposure=total_exposure,
        unspent_budget=unspent_budget,
        remaining_budget=unspent_budget,
        categories=category_responses,
    )

    category_responses = []
    for cat in categories:
        cat_expenses = [e for e in expenses if e.category_id == cat.id]
        actual_spent = sum(e.actual_cost or e.estimated_cost for e in cat_expenses)
        category_responses.append(BudgetCategoryResponse(
            id=cat.id,
            event_id=cat.event_id,
            name=cat.name,
            allocated_amount=cat.allocated_amount,
            is_mandatory=cat.is_mandatory,
            is_fixed=cat.is_fixed,
            min_amount=cat.min_amount,
            max_amount=cat.max_amount,
            notes=cat.notes,
            actual_spent=actual_spent,
        ))

    allocated_budget = sum(c.allocated_amount for c in categories)
    actual_expenses = sum(e.actual_cost or e.estimated_cost for e in expenses)
    total_exposure = actual_expenses + vendor_commitments
    unallocated_budget = event.total_budget - allocated_budget
    unspent_budget = event.total_budget - total_exposure

    return BudgetSummary(
        total_budget=event.total_budget,
        allocated_budget=allocated_budget,
        unallocated_budget=unallocated_budget,
        actual_expenses=actual_expenses,
        vendor_commitments=vendor_commitments,
        total_exposure=total_exposure,
        unspent_budget=unspent_budget,
        remaining_budget=unspent_budget,
        categories=category_responses,
    )
    """Get budget summary for an event."""
    event = _get_event_or_404(db, event_id)
    categories = db.query(BudgetCategory).filter(BudgetCategory.event_id == event_id).all()
    expenses = db.query(Expense).filter(Expense.event_id == event_id).all()

    category_responses = []
    for cat in categories:
        cat_expenses = [e for e in expenses if e.category_id == cat.id]
        actual_spent = sum(e.actual_cost or e.estimated_cost for e in cat_expenses)
        category_responses.append(BudgetCategoryResponse(
            id=cat.id,
            event_id=cat.event_id,
            name=cat.name,
            allocated_amount=cat.allocated_amount,
            is_mandatory=cat.is_mandatory,
            is_fixed=cat.is_fixed,
            min_amount=cat.min_amount,
            max_amount=cat.max_amount,
            notes=cat.notes,
            actual_spent=actual_spent,
        ))

    allocated_budget = sum(c.allocated_amount for c in categories)
    actual_expenses = sum(e.actual_cost or e.estimated_cost for e in expenses)

    unallocated_budget = event.total_budget - allocated_budget
    unspent_budget = event.total_budget - actual_expenses

    return BudgetSummary(
        total_budget=event.total_budget,
        allocated_budget=allocated_budget,
        unallocated_budget=unallocated_budget,
        actual_expenses=actual_expenses,
        unspent_budget=unspent_budget,
        remaining_budget=unspent_budget,
        categories=category_responses,
    )


@router.post("/categories", status_code=201)
def create_category(event_id: str, data: BudgetCategoryCreate, db: Session = Depends(get_db)):
    _get_event_or_404(db, event_id)
    cat = BudgetCategory(event_id=event_id, **data.model_dump())
    db.add(cat)
    _log(db, event_id, f"Budget category '{data.name}' created")
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/categories/{category_id}")
def update_category(event_id: str, category_id: str, data: BudgetCategoryUpdate, db: Session = Depends(get_db)):
    cat = db.query(BudgetCategory).filter(
        BudgetCategory.id == category_id, BudgetCategory.event_id == event_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(cat, field, value)
    _log(db, event_id, f"Budget category '{cat.name}' updated")
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(event_id: str, category_id: str, db: Session = Depends(get_db)):
    cat = db.query(BudgetCategory).filter(
        BudgetCategory.id == category_id, BudgetCategory.event_id == event_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    _log(db, event_id, f"Budget category '{cat.name}' deleted")
    db.commit()


@router.get("/expenses")
def list_expenses(event_id: str, db: Session = Depends(get_db)):
    _get_event_or_404(db, event_id)
    return db.query(Expense).filter(Expense.event_id == event_id).all()


@router.post("/expenses", status_code=201)
def create_expense(event_id: str, data: ExpenseCreate, db: Session = Depends(get_db)):
    # Validate that if expense is marked as paid, actual_cost must be provided
    if data.is_paid and data.actual_cost is None:
        raise HTTPException(status_code=400, detail="Paid expenses must include actual_cost.")
    _get_event_or_404(db, event_id)
    expense = Expense(event_id=event_id, **data.model_dump())
    db.add(expense)
    _log(db, event_id, f"Expense '{data.name}' added (₹{data.estimated_cost:,.0f})")
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/expenses/{expense_id}")
def update_expense(event_id: str, expense_id: str, data: ExpenseUpdate, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(
        Expense.id == expense_id, Expense.event_id == event_id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(expense, field, value)
    _log(db, event_id, f"Expense '{expense.name}' updated")
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/expenses/{expense_id}", status_code=204)
def delete_expense(event_id: str, expense_id: str, db: Session = Depends(get_db)):
    expense = db.query(Expense).filter(
        Expense.id == expense_id, Expense.event_id == event_id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
