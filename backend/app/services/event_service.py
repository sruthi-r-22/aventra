"""
Event service — business logic for event CRUD and planning.
Supports Manual Planner and AI Planner modes with PlanForge constraint validation.
"""
import json
import logging
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session, selectinload

from app.models.event import Event, EventType, EventStatus, PlanningMode
from app.models.budget import BudgetCategory, Expense
from app.models.task import Task, TaskDependency, TaskStatus
from app.models.vendor import Vendor
from app.models.plan import PlanVersion, ActivityRecord
from app.schemas.event import EventCreate, EventUpdate, AIDraftRequest, AIDraftResponse
from app.services.groq_service import groq_service as gemini_service, EventPlanAI
from app.planforge.validator import PlanForgeValidator
from app.planforge.budget_engine import BudgetItem
from app.planforge.scheduling_engine import ScheduleTask

logger = logging.getLogger(__name__)


def _log_activity(db: Session, event_id: str, action: str, entity_type: str = None, details: str = None):
    """Log an activity record."""
    record = ActivityRecord(
        event_id=event_id,
        action=action,
        entity_type=entity_type,
        details=details,
    )
    db.add(record)


def _calculate_days_remaining(event_date_str: str) -> int:
    """Calculate days remaining until event."""
    try:
        event_date = datetime.fromisoformat(event_date_str).date()
        return (event_date - date.today()).days
    except Exception:
        return 0


def _stagger_task_deadlines(task_count: int, event_date_str: str, today: Optional[date] = None) -> List[str]:
    """
    Calculate realistic, staggered preparation deadlines prior to the event date.
    Tasks earlier in the list (e.g. venue, invitations) are given earlier deadlines;
    later tasks (e.g. rehearsal, seating) are placed near the event date.
    """
    if today is None:
        today = date.today()
    try:
        event_dt = datetime.fromisoformat(event_date_str).date()
    except Exception:
        event_dt = today + timedelta(days=60)

    days_to_event = (event_dt - today).days
    if days_to_event <= 1:
        # Event is today or tomorrow; default to today
        return [today.isoformat()] * task_count

    n = max(task_count, 1)
    deadlines = []
    for i in range(task_count):
        # Evenly distribute deadlines between today + 1 and event_dt - 1
        fraction = (i + 1) / (n + 1)
        offset_days = max(1, int(days_to_event * fraction))
        target_date = today + timedelta(days=offset_days)
        if target_date >= event_dt:
            target_date = event_dt - timedelta(days=1)
        deadlines.append(target_date.isoformat())
    return deadlines


def generate_ai_draft(event_data: AIDraftRequest) -> Dict[str, Any]:
    """
    Generate an AI plan draft for review and editing before approval.
    Does not persist to database until user accepts.
    """
    plan: EventPlanAI = gemini_service.generate_event_plan(
        event_type=event_data.event_type.value,
        event_name=event_data.name,
        total_budget=event_data.total_budget,
        guest_count=event_data.guest_count,
        event_date=event_data.event_date,
        location=event_data.location,
        description=event_data.description,
        preferences=event_data.preferences,
        mandatory_expenses=event_data.mandatory_expenses,
    )

    # Stagger task deadlines prior to event date
    deadlines = _stagger_task_deadlines(len(plan.tasks), event_data.event_date)
    tasks_with_deadlines = []
    for idx, t in enumerate(plan.tasks):
        tasks_with_deadlines.append({
            "name": t.name,
            "description": t.description,
            "priority": t.priority,
            "duration_days": t.duration_days,
            "is_milestone": t.is_milestone,
            "due_date": deadlines[idx] if idx < len(deadlines) else event_data.event_date,
            "notes": t.notes,
        })

    categories_list = [
        {
            "name": c.name,
            "allocated_amount": c.allocated_amount,
            "is_mandatory": c.is_mandatory,
            "is_fixed": c.is_fixed,
            "notes": c.notes,
        }
        for c in plan.budget_categories
    ]

    vendor_list = [
        {
            "category": v.category,
            "notes": v.notes,
            "estimated_cost": v.estimated_cost,
        }
        for v in plan.vendor_categories
    ]

    # Validate draft constraints
    validator = PlanForgeValidator()
    budget_items = [
        BudgetItem(
            id=f"draft_{i}",
            name=c["name"],
            amount=c["allocated_amount"],
            is_mandatory=c["is_mandatory"],
            is_fixed=c["is_fixed"],
        )
        for i, c in enumerate(categories_list)
    ]

    try:
        event_date_obj = datetime.fromisoformat(event_data.event_date).date()
    except Exception:
        event_date_obj = date.today()

    validation = validator.validate_plan(
        total_budget=event_data.total_budget,
        budget_items=budget_items,
        tasks=[],
        event_date=event_date_obj,
    )

    return {
        "theme": plan.theme,
        "description": plan.description,
        "budget_categories": categories_list,
        "tasks": tasks_with_deadlines,
        "vendor_categories": vendor_list,
        "planning_notes": plan.planning_notes,
        "is_ai_generated": plan.is_ai_generated,
        "validation": validator.to_dict(validation),
    }


def create_event(db: Session, event_data: EventCreate, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new event supporting two distinct modes:
    1. Manual Planner: Empty baseline, no LLM invoked, user adds all items manually.
    2. AI Planner: Synthesizes or accepts structured AI/template draft.
    """
    mode = event_data.planning_mode
    if hasattr(mode, "value"):
        mode_val = mode.value
    else:
        mode_val = str(mode)

    # 1. Persist the event entity associated with the authenticated user
    event = Event(
        user_id=user_id,
        name=event_data.name,
        event_type=event_data.event_type.value,
        planning_mode=mode_val,
        event_date=event_data.event_date,
        location=event_data.location,
        guest_count=event_data.guest_count,
        total_budget=event_data.total_budget,
        description=event_data.description,
        preferences=event_data.preferences,
        mandatory_expenses=json.dumps(event_data.mandatory_expenses or []),
        status=EventStatus.active,
    )
    db.add(event)
    db.flush()

    validator = PlanForgeValidator()
    try:
        event_date_obj = datetime.fromisoformat(event_data.event_date).date()
    except Exception:
        event_date_obj = date.today()

    # ─── MODE A: MANUAL PLANNER ───────────────────────────────────────────────
    if mode_val == "manual":
        # Do not automatically generate categories, tasks, or vendors.
        # Persist only user-supplied initial items if explicitly provided.
        category_map = {}
        if event_data.initial_categories:
            for cat_data in event_data.initial_categories:
                category = BudgetCategory(
                    event_id=event.id,
                    name=cat_data["name"],
                    allocated_amount=float(cat_data.get("allocated_amount", 0)),
                    is_mandatory=bool(cat_data.get("is_mandatory", False)),
                    is_fixed=bool(cat_data.get("is_fixed", False)),
                    notes=cat_data.get("notes"),
                )
                db.add(category)
                db.flush()
                category_map[cat_data["name"]] = category.id

        if event_data.initial_tasks:
            for task_data in event_data.initial_tasks:
                task = Task(
                    event_id=event.id,
                    name=task_data["name"],
                    description=task_data.get("description"),
                    priority=task_data.get("priority", "medium"),
                    due_date=task_data.get("due_date"),
                    duration_days=int(task_data.get("duration_days", 1)),
                    is_milestone=bool(task_data.get("is_milestone", False)),
                    notes=task_data.get("notes"),
                    status=TaskStatus.pending,
                )
                db.add(task)

        if event_data.initial_vendors:
            for vendor_data in event_data.initial_vendors:
                vendor = Vendor(
                    event_id=event.id,
                    category=vendor_data["category"],
                    vendor_name=vendor_data.get("vendor_name"),
                    notes=vendor_data.get("notes"),
                    estimated_cost=vendor_data.get("estimated_cost"),
                )
                db.add(vendor)

        # PlanForge validation on manual baseline
        manual_budget_items = [
            BudgetItem(
                id=f"man_cat_{i}",
                name=c["name"],
                amount=float(c.get("allocated_amount", 0)),
                is_mandatory=bool(c.get("is_mandatory", False)),
                is_fixed=bool(c.get("is_fixed", False)),
            )
            for i, c in enumerate(event_data.initial_categories or [])
        ]

        validation = validator.validate_plan(
            total_budget=event_data.total_budget,
            budget_items=manual_budget_items,
            tasks=[],
            event_date=event_date_obj,
        )
        validation_dict = validator.to_dict(validation)

        # Create Version 1 for Manual Planner
        plan_version = PlanVersion(
            event_id=event.id,
            version_number=1,
            is_active=True,
            plan_data=json.dumps({
                "theme": "Manual Event Plan",
                "description": event_data.description or "User-defined manual plan.",
                "planning_notes": "Created via Manual Planner mode without AI.",
                "is_ai_generated": False,
            }),
            feasibility_status=validation.overall_status,
            feasibility_details=json.dumps(validation_dict),
            change_summary="Initial manual plan created",
            created_by="user",
        )
        db.add(plan_version)

        _log_activity(
            db, event.id,
            f"Event '{event.name}' created in Manual Planner mode",
            entity_type="event",
            details="Manual baseline plan initialized."
        )

        db.commit()
        db.refresh(event)

        return {
            "event": event,
            "plan_theme": "Manual Event Plan",
            "plan_description": event_data.description or "User-defined manual plan.",
            "planning_notes": "Created via Manual Planner mode without AI.",
            "is_ai_generated": False,
            "feasibility": validation_dict,
        }

    # ─── MODE B: AI PLANNER ───────────────────────────────────────────────────
    # If pre-approved categories and tasks were provided, use them; otherwise generate
    if event_data.initial_categories and event_data.initial_tasks:
        categories_data = event_data.initial_categories
        tasks_data = event_data.initial_tasks
        vendors_data = event_data.initial_vendors or []
        theme = event_data.description or "Custom AI Plan"
        desc = event_data.description or "Approved draft plan."
        notes = "Created from approved AI draft."
        is_ai = True
    else:
        # Generate plan via Gemini or deterministic fallback
        plan: EventPlanAI = gemini_service.generate_event_plan(
            event_type=event_data.event_type.value,
            event_name=event_data.name,
            total_budget=event_data.total_budget,
            guest_count=event_data.guest_count,
            event_date=event_data.event_date,
            location=event_data.location,
            description=event_data.description,
            preferences=event_data.preferences,
            mandatory_expenses=event_data.mandatory_expenses,
        )
        categories_data = [
            {
                "name": c.name,
                "allocated_amount": c.allocated_amount,
                "is_mandatory": c.is_mandatory,
                "is_fixed": c.is_fixed,
                "notes": c.notes,
            }
            for c in plan.budget_categories
        ]
        # Calculate realistic staggered preparation deadlines
        deadlines = _stagger_task_deadlines(len(plan.tasks), event_data.event_date)
        tasks_data = [
            {
                "name": t.name,
                "description": t.description,
                "priority": t.priority,
                "duration_days": t.duration_days,
                "is_milestone": t.is_milestone,
                "due_date": deadlines[idx] if idx < len(deadlines) else event_data.event_date,
                "notes": t.notes,
            }
            for idx, t in enumerate(plan.tasks)
        ]
        vendors_data = [
            {
                "category": v.category,
                "notes": v.notes,
                "estimated_cost": v.estimated_cost,
            }
            for v in plan.vendor_categories
        ]
        theme = plan.theme
        desc = plan.description
        notes = plan.planning_notes
        is_ai = plan.is_ai_generated

    # Persist budget categories
    for cat in categories_data:
        category = BudgetCategory(
            event_id=event.id,
            name=cat["name"],
            allocated_amount=float(cat.get("allocated_amount", 0)),
            is_mandatory=bool(cat.get("is_mandatory", False)),
            is_fixed=bool(cat.get("is_fixed", False)),
            notes=cat.get("notes"),
        )
        db.add(category)

    # Persist tasks with distinct preparation deadlines
    for task_info in tasks_data:
        task = Task(
            event_id=event.id,
            name=task_info["name"],
            description=task_info.get("description"),
            priority=task_info.get("priority", "medium"),
            due_date=task_info.get("due_date"),
            duration_days=int(task_info.get("duration_days", 1)),
            is_milestone=bool(task_info.get("is_milestone", False)),
            notes=task_info.get("notes"),
            status=TaskStatus.pending,
        )
        db.add(task)

    # Persist vendor checklist items
    for v_info in vendors_data:
        vendor = Vendor(
            event_id=event.id,
            category=v_info["category"],
            notes=v_info.get("notes"),
            estimated_cost=v_info.get("estimated_cost"),
        )
        db.add(vendor)

    # PlanForge validation
    budget_items = [
        BudgetItem(
            id=f"ai_cat_{i}",
            name=c["name"],
            amount=float(c.get("allocated_amount", 0)),
            is_mandatory=bool(c.get("is_mandatory", False)),
            is_fixed=bool(c.get("is_fixed", False)),
        )
        for i, c in enumerate(categories_data)
    ]

    validation = validator.validate_plan(
        total_budget=event_data.total_budget,
        budget_items=budget_items,
        tasks=[],
        event_date=event_date_obj,
    )
    validation_dict = validator.to_dict(validation)

    # Persist initial Plan Version
    plan_version = PlanVersion(
        event_id=event.id,
        version_number=1,
        is_active=True,
        plan_data=json.dumps({
            "theme": theme,
            "description": desc,
            "planning_notes": notes,
            "is_ai_generated": is_ai,
        }),
        feasibility_status=validation.overall_status,
        feasibility_details=json.dumps(validation_dict),
        change_summary="Initial AI plan created",
        created_by="system",
    )
    db.add(plan_version)

    _log_activity(
        db, event.id,
        f"Event '{event.name}' created with {'AI-generated' if is_ai else 'template-based'} plan",
        entity_type="event",
        details=f"Status: {validation.overall_status}"
    )

    db.commit()
    db.refresh(event)

    return {
        "event": event,
        "plan_theme": theme,
        "plan_description": desc,
        "planning_notes": notes,
        "is_ai_generated": is_ai,
        "feasibility": validation_dict,
    }


def get_event(db: Session, event_id: str, user_id: Optional[str] = None) -> Optional[Event]:
    query = db.query(Event).filter(Event.id == event_id)
    if user_id is not None:
        query = query.filter(Event.user_id == user_id)
    return query.first()


def list_events(db: Session, user_id: Optional[str] = None, skip: int = 0, limit: int = 50) -> List[Event]:
    query = db.query(Event)
    if user_id is not None:
        query = query.filter(Event.user_id == user_id)
    else:
        # If no user_id is provided, only return non-null user events or empty
        query = query.filter(Event.user_id.isnot(None))
    return query.order_by(Event.created_at.desc()).offset(skip).limit(limit).all()


def get_event_summaries(db: Session, events: List[Event]) -> List[Dict[str, Any]]:
    """Build event summaries using one query per related model, regardless of event count."""
    if not events:
        return []

    event_ids = [event.id for event in events]
    categories_by_event: Dict[str, List[BudgetCategory]] = {}
    for category in db.query(BudgetCategory).filter(BudgetCategory.event_id.in_(event_ids)).all():
        categories_by_event.setdefault(category.event_id, []).append(category)

    expenses_by_event: Dict[str, List[Expense]] = {}
    for expense in db.query(Expense).filter(Expense.event_id.in_(event_ids)).all():
        expenses_by_event.setdefault(expense.event_id, []).append(expense)

    tasks_by_event: Dict[str, List[Task]] = {}
    for task in db.query(Task).filter(Task.event_id.in_(event_ids)).all():
        tasks_by_event.setdefault(task.event_id, []).append(task)

    plans_by_event: Dict[str, PlanVersion] = {}
    plans = (
        db.query(PlanVersion)
        .filter(PlanVersion.event_id.in_(event_ids))
        .order_by(PlanVersion.version_number.desc())
        .all()
    )
    for plan in plans:
        plans_by_event.setdefault(plan.event_id, plan)

    summaries = []
    for event in events:
        categories = categories_by_event.get(event.id, [])
        expenses = expenses_by_event.get(event.id, [])
        tasks = tasks_by_event.get(event.id, [])
        latest_plan = plans_by_event.get(event.id)

        total_budget = event.total_budget
        allocated_budget = sum(category.allocated_amount for category in categories)
        unallocated_budget = total_budget - allocated_budget
        actual_expenses = sum(
            expense.actual_cost if expense.actual_cost is not None else expense.estimated_cost
            for expense in expenses
        )
        unspent_budget = total_budget - actual_expenses
        planning_mode = getattr(event, "planning_mode", "ai")
        if hasattr(planning_mode, "value"):
            planning_mode = planning_mode.value

        summaries.append({
            "id": event.id,
            "name": event.name,
            "event_type": event.event_type if isinstance(event.event_type, str) else event.event_type.value,
            "planning_mode": planning_mode,
            "event_date": event.event_date,
            "location": event.location,
            "guest_count": event.guest_count,
            "total_budget": total_budget,
            "allocated_budget": allocated_budget,
            "unallocated_budget": unallocated_budget,
            "actual_expenses": actual_expenses,
            "unspent_budget": unspent_budget,
            "remaining_budget": unspent_budget,
            "description": event.description,
            "status": event.status if isinstance(event.status, str) else event.status.value,
            "days_remaining": _calculate_days_remaining(event.event_date),
            "task_count": len(tasks),
            "completed_tasks": sum(1 for task in tasks if task.status == "completed"),
            "feasibility_status": latest_plan.feasibility_status if latest_plan else "feasible",
        })

    return summaries


def get_event_summary(db: Session, event_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Get comprehensive event summary with exact budget distinctions."""
    event = get_event(db, event_id, user_id=user_id)
    if not event:
        return None

    # Budget stats
    categories = db.query(BudgetCategory).filter(BudgetCategory.event_id == event_id).all()
    expenses = db.query(Expense).filter(Expense.event_id == event_id).all()

    total_budget = event.total_budget
    allocated_budget = sum(c.allocated_amount for c in categories)
    unallocated_budget = total_budget - allocated_budget
    actual_expenses = sum(e.actual_cost if e.actual_cost is not None else e.estimated_cost for e in expenses)
    unspent_budget = total_budget - actual_expenses

    # Task stats
    tasks = db.query(Task).filter(Task.event_id == event_id).all()
    completed_tasks = sum(1 for t in tasks if t.status == "completed")

    # Latest feasibility
    latest_plan = (
        db.query(PlanVersion)
        .filter(PlanVersion.event_id == event_id)
        .order_by(PlanVersion.version_number.desc())
        .first()
    )
    feasibility = latest_plan.feasibility_status if latest_plan else "feasible"

    days_remaining = _calculate_days_remaining(event.event_date)
    planning_mode = getattr(event, "planning_mode", "ai")
    if hasattr(planning_mode, "value"):
        planning_mode = planning_mode.value

    return {
        "id": event.id,
        "name": event.name,
        "event_type": event.event_type if isinstance(event.event_type, str) else event.event_type.value,
        "planning_mode": planning_mode,
        "event_date": event.event_date,
        "location": event.location,
        "guest_count": event.guest_count,
        "total_budget": total_budget,
        "allocated_budget": allocated_budget,
        "unallocated_budget": unallocated_budget,
        "actual_expenses": actual_expenses,
        "unspent_budget": unspent_budget,
        "remaining_budget": unspent_budget,  # Preserved for backward compatibility
        "description": event.description,
        "status": event.status if isinstance(event.status, str) else event.status.value,
        "days_remaining": days_remaining,
        "task_count": len(tasks),
        "completed_tasks": completed_tasks,
        "feasibility_status": feasibility,
    }


def update_event(db: Session, event_id: str, data: EventUpdate, user_id: Optional[str] = None) -> Optional[Event]:
    event = get_event(db, event_id, user_id=user_id)
    if not event:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(event, field, value)
    _log_activity(db, event_id, "Event updated", entity_type="event")
    db.commit()
    db.refresh(event)
    return event


def delete_event(db: Session, event_id: str, user_id: Optional[str] = None) -> bool:
    event = get_event(db, event_id, user_id=user_id)
    if not event:
        return False
    # Safely clear task dependencies for event tasks prior to event deletion
    task_ids = [t.id for t in event.tasks]
    if task_ids:
        db.query(TaskDependency).filter(
            (TaskDependency.task_id.in_(task_ids)) | (TaskDependency.depends_on_id.in_(task_ids))
        ).delete(synchronize_session=False)
    db.delete(event)
    db.commit()
    return True


def validate_event_plan(db: Session, event_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Run PlanForge validation on current event state."""
    event = get_event(db, event_id, user_id=user_id)
    if not event:
        return None

    categories = db.query(BudgetCategory).filter(BudgetCategory.event_id == event_id).all()
    tasks = (
        db.query(Task)
        .options(selectinload(Task.dependencies))
        .filter(Task.event_id == event_id)
        .all()
    )
    task_deps = {t.id: [] for t in tasks}
    for task in tasks:
        for dep in task.dependencies:
            task_deps[task.id].append(dep.depends_on_id)

    budget_items = [
        BudgetItem(
            id=c.id,
            name=c.name,
            amount=c.allocated_amount,
            is_mandatory=c.is_mandatory,
            is_fixed=c.is_fixed,
            min_amount=c.min_amount or 0.0,
            max_amount=c.max_amount,
        )
        for c in categories
    ]

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
        event_date = datetime.fromisoformat(event.event_date).date()
    except Exception:
        event_date = date.today()

    validator = PlanForgeValidator()
    result = validator.validate_plan(
        total_budget=event.total_budget,
        budget_items=budget_items,
        tasks=schedule_tasks,
        event_date=event_date,
    )

    result_dict = validator.to_dict(result)

    # Update latest plan version status
    latest_plan = (
        db.query(PlanVersion)
        .filter(PlanVersion.event_id == event_id)
        .order_by(PlanVersion.version_number.desc())
        .first()
    )
    if latest_plan:
        latest_plan.feasibility_status = result.overall_status
        latest_plan.feasibility_details = json.dumps(result_dict)
        db.commit()

    return result_dict
