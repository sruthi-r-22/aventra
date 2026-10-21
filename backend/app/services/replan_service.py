"""
Replanning service — intelligent event plan modification with PlanForge validation.
"""
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session

from app.models.event import Event
from app.models.budget import BudgetCategory, Expense
from app.models.task import Task
from app.models.plan import PlanVersion, ActivityRecord
from app.services.groq_service import groq_service as gemini_service
from app.planforge.validator import PlanForgeValidator
from app.planforge.budget_engine import BudgetItem
from app.planforge.scheduling_engine import ScheduleTask
from app.services import event_service
from app.services.financial_service import get_financial_exposure

logger = logging.getLogger(__name__)

# In-memory store for replan previews (keyed by preview token)
_replan_previews: Dict[str, Dict[str, Any]] = {}


def _generate_preview_token(event_id: str) -> str:
    """Generate a unique token for a replan preview."""
    import hashlib
    import time
    token_str = f"{event_id}:{time.time()}"
    return hashlib.sha256(token_str.encode()).hexdigest()[:32]


def preview_replan(
    db: Session,
    event_id: str,
    change_description: str,
    new_budget: Optional[float] = None,
    new_date: Optional[str] = None,
    new_guest_count: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Preview the effect of replanning changes WITHOUT modifying the original plan.

    Returns a preview with:
    - Original plan snapshot
    - Revised plan snapshot
    - Detected changes
    - PlanForge feasibility result
    - Preview token for accepting the revision
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise ValueError(f"Event {event_id} not found")

    # Get current state snapshot
    categories = db.query(BudgetCategory).filter(BudgetCategory.event_id == event_id).all()
    tasks = db.query(Task).filter(Task.event_id == event_id).all()

    # Parse changes via Gemini or fallback
    parsed = gemini_service.parse_replan_request(
        change_description=change_description,
        current_budget=event.total_budget,
        current_date=event.event_date,
        current_guest_count=event.guest_count,
        event_type=event.event_type,
        event_name=event.name,
    )

    # Apply explicit overrides
    if new_budget is not None:
        parsed["new_budget"] = new_budget
    if new_date is not None:
        parsed["new_date"] = new_date
    if new_guest_count is not None:
        parsed["new_guest_count"] = new_guest_count

    # Compute revised values
    revised_budget = parsed.get("new_budget") or event.total_budget
    revised_date = parsed.get("new_date") or event.event_date
    revised_guests = parsed.get("new_guest_count") or event.guest_count

    # Detect changes
    changes = []
    if revised_budget != event.total_budget:
        changes.append({
            "field": "total_budget",
            "original": event.total_budget,
            "revised": revised_budget,
            "delta": revised_budget - event.total_budget,
        })
    if revised_date != event.event_date:
        changes.append({
            "field": "event_date",
            "original": event.event_date,
            "revised": revised_date,
        })
    if revised_guests != event.guest_count:
        changes.append({
            "field": "guest_count",
            "original": event.guest_count,
            "revised": revised_guests,
        })

    # Recalculate budget allocations proportionally if budget changed
    revised_categories = []
    budget_scale = revised_budget / event.total_budget if event.total_budget > 0 else 1.0

    for cat in categories:
        revised_amount = cat.allocated_amount
        if revised_budget != event.total_budget and not cat.is_fixed:
            revised_amount = round(cat.allocated_amount * budget_scale, 2)
        revised_categories.append({
            "id": cat.id,
            "name": cat.name,
            "original_amount": cat.allocated_amount,
            "revised_amount": revised_amount,
            "is_mandatory": cat.is_mandatory,
            "is_fixed": cat.is_fixed,
        })

    # PlanForge validation on revised plan
    budget_items = [
        BudgetItem(
            id=cat["id"],
            name=cat["name"],
            amount=cat["revised_amount"],
            is_mandatory=cat["is_mandatory"],
            is_fixed=cat["is_fixed"],
        )
        for cat in revised_categories
    ]

    task_deps = {t.id: [] for t in tasks}
    for task in tasks:
        for dep in task.dependencies:
            task_deps[task.id].append(dep.depends_on_id)

    schedule_tasks = [
        ScheduleTask(
            id=t.id,
            name=t.name,
            duration_days=t.duration_days,
            due_date=datetime.fromisoformat(t.due_date).date() if t.due_date else None,
            dependency_ids=task_deps.get(t.id, []),
            is_milestone=t.is_milestone,
        )
        for t in tasks
    ]

    try:
        event_date_obj = datetime.fromisoformat(revised_date).date()
    except Exception:
        event_date_obj = date.today()

    validator = PlanForgeValidator()
    validation = validator.validate_plan(
        total_budget=revised_budget,
        budget_items=budget_items,
        tasks=schedule_tasks,
        event_date=event_date_obj,
    )
    validation_dict = validator.to_dict(validation)

    actual_expenses, vendor_commitments = get_financial_exposure(db, event_id)
    financial_minimum = actual_expenses + vendor_commitments
    financial_shortfall = max(0.0, financial_minimum - revised_budget)
    financial_is_feasible = financial_shortfall == 0
    financial_feasibility = {
        "is_feasible": financial_is_feasible,
        "proposed_budget": revised_budget,
        "actual_expenses": actual_expenses,
        "vendor_commitments": vendor_commitments,
        "minimum_budget": financial_minimum,
        "shortfall": financial_shortfall,
    }
    is_feasible = validation.is_feasible and financial_is_feasible
    if not financial_is_feasible:
        financial_violation = (
            f"Existing actual expenses and booked/confirmed vendor commitments total "
            f"₹{financial_minimum:,.0f}, exceeding the proposed budget by "
            f"₹{financial_shortfall:,.0f}."
        )
        validation_dict["violations"].append(financial_violation)
    validation_dict["financial_feasibility"] = financial_feasibility
    validation_dict["is_feasible"] = is_feasible
    if not is_feasible:
        validation_dict["overall_status"] = "infeasible"

    # Get explanation
    if not financial_is_feasible:
        explanation = financial_violation
    elif not validation.is_feasible:
        explanation = gemini_service.explain_constraint_violation(
            violation_details=validation_dict,
            event_name=event.name,
        )
    else:
        explanation = parsed.get("summary", "Changes applied successfully.")

    # Build preview
    preview = {
        "event_id": event_id,
        "change_description": change_description,
        "is_ai_generated": parsed.get("is_ai_generated", False),
        "original_plan": {
            "total_budget": event.total_budget,
            "event_date": event.event_date,
            "guest_count": event.guest_count,
            "categories": [
                {
                    "id": c.id,
                    "name": c.name,
                    "allocated_amount": c.allocated_amount,
                    "is_mandatory": c.is_mandatory,
                    "is_fixed": c.is_fixed,
                }
                for c in categories
            ],
        },
        "revised_plan": {
            "total_budget": revised_budget,
            "event_date": revised_date,
            "guest_count": revised_guests,
            "categories": revised_categories,
        },
        "changes": changes,
        "feasibility_status": validation_dict["overall_status"],
        "feasibility_details": validation_dict,
        "is_feasible": is_feasible,
        "financial_feasibility": financial_feasibility,
        "explanation": explanation,
        "warnings": parsed.get("warnings", []),
    }

    # Store preview for later acceptance
    token = _generate_preview_token(event_id)
    _replan_previews[token] = preview

    return {"preview_token": token, **preview}


def accept_replan(
    db: Session,
    event_id: str,
    preview_token: str,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Accept a previously previewed replan.

    Creates a new plan version. Never overwrites the original.
    """
    preview = _replan_previews.get(preview_token)
    if not preview:
        raise ValueError("Invalid or expired preview token. Please generate a new replan preview.")

    if preview["event_id"] != event_id:
        raise ValueError("Preview token does not match event ID.")

    if not preview.get("is_feasible", False):
        raise ValueError(
            preview.get("explanation") or "Cannot accept an infeasible plan revision."
        )

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise ValueError(f"Event {event_id} not found")

    revised = preview["revised_plan"]
    actual_expenses, vendor_commitments = get_financial_exposure(db, event_id)
    financial_minimum = actual_expenses + vendor_commitments
    proposed_budget = revised.get("total_budget", event.total_budget)
    if proposed_budget < financial_minimum:
        shortfall = financial_minimum - proposed_budget
        raise ValueError(
            f"Cannot accept this revision: existing actual expenses and booked/confirmed "
            f"vendor commitments total ₹{financial_minimum:,.0f}, exceeding the proposed "
            f"budget by ₹{shortfall:,.0f}."
        )

    # Get current max version
    max_version = (
        db.query(PlanVersion)
        .filter(PlanVersion.event_id == event_id)
        .order_by(PlanVersion.version_number.desc())
        .first()
    )
    next_version = (max_version.version_number + 1) if max_version else 2

    # Deactivate old versions
    db.query(PlanVersion).filter(PlanVersion.event_id == event_id).update({"is_active": False})

    # Update event fields
    if "total_budget" in revised:
        event.total_budget = revised["total_budget"]
    if "event_date" in revised:
        event.event_date = revised["event_date"]
    if "guest_count" in revised:
        event.guest_count = revised["guest_count"]

    # Update budget categories
    if "categories" in revised:
        for cat_data in revised["categories"]:
            category = db.query(BudgetCategory).filter(
                BudgetCategory.id == cat_data["id"]
            ).first()
            if category:
                category.allocated_amount = cat_data["revised_amount"]

    # Create new plan version
    change_summary = preview.get("explanation", "")
    if notes:
        change_summary += f" Note: {notes}"

    new_version = PlanVersion(
        event_id=event_id,
        version_number=next_version,
        is_active=True,
        plan_data=json.dumps(revised),
        feasibility_status=preview["feasibility_status"],
        feasibility_details=json.dumps(preview["feasibility_details"]),
        change_summary=change_summary,
        created_by="user",
    )
    db.add(new_version)

    # Log activity
    activity = ActivityRecord(
        event_id=event_id,
        action=f"Plan version {next_version} accepted: {preview.get('change_description', '')}",
        entity_type="plan_version",
        details=change_summary,
    )
    db.add(activity)

    db.commit()

    # Clean up preview
    del _replan_previews[preview_token]

    return {
        "version_number": next_version,
        "feasibility_status": preview["feasibility_status"],
        "changes_applied": preview["changes"],
        "message": f"Plan version {next_version} saved successfully.",
    }


def get_plan_history(db: Session, event_id: str) -> list:
    """Get all plan versions for an event."""
    versions = (
        db.query(PlanVersion)
        .filter(PlanVersion.event_id == event_id)
        .order_by(PlanVersion.version_number.desc())
        .all()
    )
    result = []
    for v in versions:
        details = None
        try:
            details = json.loads(v.feasibility_details) if v.feasibility_details else None
        except Exception:
            pass
        result.append({
            "id": v.id,
            "event_id": v.event_id,
            "version_number": v.version_number,
            "is_active": v.is_active,
            "feasibility_status": v.feasibility_status,
            "feasibility_details": details,
            "change_summary": v.change_summary,
            "created_by": v.created_by,
            "created_at": v.created_at.isoformat() if v.created_at else None,
        })
    return result
