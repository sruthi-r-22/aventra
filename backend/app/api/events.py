"""Events API router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.plan import ActivityRecord
from app.schemas.event import EventCreate, EventUpdate, EventResponse, EventSummary, AIDraftRequest, AIDraftResponse
from app.services import event_service
from app.core.auth import get_current_user, get_user_event_or_404

router = APIRouter(prefix="/events", tags=["events"])


@router.post("/ai-draft", response_model=AIDraftResponse)
def generate_ai_draft(
    draft_data: AIDraftRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate an AI plan draft for preview and user modification prior to saving.
    Requires authentication. Does not write to database.
    """
    try:
        return event_service.generate_ai_draft(draft_data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate draft plan: {str(e)}"
        )


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_event(
    event_data: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new event in Manual or AI Planner mode, strictly bound to the authenticated user."""
    try:
        result = event_service.create_event(db, event_data, user_id=current_user.id)
        event = result["event"]
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
            "total_budget": event.total_budget,
            "status": event.status if isinstance(event.status, str) else event.status.value,
            "plan_theme": result.get("plan_theme", "Event Plan"),
            "plan_description": result.get("plan_description", ""),
            "planning_notes": result.get("planning_notes", ""),
            "is_ai_generated": result.get("is_ai_generated", False),
            "feasibility": result.get("feasibility", {}),
        }
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create event: {str(e)}"
        )


@router.get("/")
def list_events(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all events owned by the authenticated user."""
    events = event_service.list_events(db, user_id=current_user.id, skip=skip, limit=limit)
    result = []
    for event in events:
        summary = event_service.get_event_summary(db, event.id, user_id=current_user.id)
        if summary:
            result.append(summary)
    return result


@router.get("/{event_id}")
def get_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get event details owned by the authenticated user."""
    summary = event_service.get_event_summary(db, event_id, user_id=current_user.id)
    if not summary:
        raise HTTPException(status_code=404, detail="Event not found")
    return summary


@router.put("/{event_id}")
def update_event(
    event_id: str,
    data: EventUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update event details owned by the authenticated user."""
    event = event_service.update_event(db, event_id, data, user_id=current_user.id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event_service.get_event_summary(db, event_id, user_id=current_user.id)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an event owned by the authenticated user."""
    deleted = event_service.delete_event(db, event_id, user_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Event not found")


@router.post("/{event_id}/validate")
def validate_plan(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run PlanForge validation on current event state."""
    result = event_service.validate_event_plan(db, event_id, user_id=current_user.id)
    if result is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return result


@router.get("/{event_id}/activities")
def get_activities(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent activity records for an event owned by the authenticated user."""
    get_user_event_or_404(db, event_id, current_user.id)
    activities = (
        db.query(ActivityRecord)
        .filter(ActivityRecord.event_id == event_id)
        .order_by(ActivityRecord.created_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": a.id,
            "action": a.action,
            "entity_type": a.entity_type,
            "details": a.details,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in activities
    ]
