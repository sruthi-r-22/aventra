"""Budget API router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.budget import BudgetCategory, Expense
from app.models.user import User
from app.schemas.budget import (
    BudgetCategoryCreate, BudgetCategoryUpdate, BudgetCategoryResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, BudgetSummary,
)
from app.models.plan import ActivityRecord
from app.services.financial_service import get_financial_exposure
from app.core.auth import get_current_user, get_user_event_or_404

router = APIRouter(prefix="/events/{event_id}/budget", tags=["budget"])


def _log(db, event_id, action, details=None):
    db.add(ActivityRecord(event_id=event_id, action=action, entity_type="budget", details=details))


@router.get("/", response_model=BudgetSummary)
def get_budget_summary(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get budget summary for an event owned by the authenticated user."""
    event = get_user_event_or_404(db, event_id, current_user.id)
    categories = db.query(BudgetCategory).filter(BudgetCategory.event_id == event_id).all()
    expenses = db.query(Expense).filter(Expense.event_id == event_id).all()
    actual_expenses, vendor_commitments = get_financial_exposure(db, event_id, expenses)

    category_responses = []
    for cat in categories:
        cat_expenses = [e for e in expenses if e.category_id == cat.id]
        actual_spent = sum(
            e.actual_cost if e.actual_cost is not None else e.estimated_cost
            for e in cat_expenses if e.is_paid
        )
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


@router.post("/categories", status_code=201)
def create_category(
    event_id: str,
    data: BudgetCategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    cat = BudgetCategory(event_id=event_id, **data.model_dump())
    db.add(cat)
    _log(db, event_id, f"Budget category '{data.name}' created")
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/categories/{category_id}")
def update_category(
    event_id: str,
    category_id: str,
    data: BudgetCategoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
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
def delete_category(
    event_id: str,
    category_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    cat = db.query(BudgetCategory).filter(
        BudgetCategory.id == category_id, BudgetCategory.event_id == event_id
    ).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    db.delete(cat)
    _log(db, event_id, f"Budget category '{cat.name}' deleted")
    db.commit()


@router.get("/expenses")
def list_expenses(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    return db.query(Expense).filter(Expense.event_id == event_id).all()


@router.post("/expenses", status_code=201)
def create_expense(
    event_id: str,
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.is_paid and data.actual_cost is None:
        raise HTTPException(status_code=400, detail="Paid expenses must include actual_cost.")
    get_user_event_or_404(db, event_id, current_user.id)
    expense = Expense(event_id=event_id, **data.model_dump())
    db.add(expense)
    _log(db, event_id, f"Expense '{data.name}' added (₹{data.estimated_cost:,.0f})")
    db.commit()
    db.refresh(expense)
    return expense


@router.put("/expenses/{expense_id}")
def update_expense(
    event_id: str,
    expense_id: str,
    data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
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
def delete_expense(
    event_id: str,
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    expense = db.query(Expense).filter(
        Expense.id == expense_id, Expense.event_id == event_id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
