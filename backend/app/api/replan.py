"""Replanning API router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.plan import ReplanRequest, AcceptReplanRequest
from app.services import replan_service
from app.core.auth import get_current_user, get_user_event_or_404

router = APIRouter(prefix="/events/{event_id}/replan", tags=["replanning"])


@router.post("/preview")
def preview_replan(
    event_id: str,
    request: ReplanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Preview the effect of replanning changes WITHOUT modifying the original plan."""
    get_user_event_or_404(db, event_id, current_user.id)
    try:
        result = replan_service.preview_replan(
            db=db,
            event_id=event_id,
            change_description=request.change_description,
            new_budget=request.new_budget,
            new_date=request.new_date,
            new_guest_count=request.new_guest_count,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Replan preview failed: {str(e)}")


@router.post("/accept")
def accept_replan(
    event_id: str,
    request: AcceptReplanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Accept a previously previewed replan and save as a new plan version."""
    get_user_event_or_404(db, event_id, current_user.id)
    try:
        result = replan_service.accept_replan(
            db=db,
            event_id=event_id,
            preview_token=request.preview_token,
            notes=request.notes,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to accept replan: {str(e)}")


@router.get("/history")
def get_plan_history(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all plan versions for an event owned by the authenticated user."""
    get_user_event_or_404(db, event_id, current_user.id)
    return replan_service.get_plan_history(db, event_id)
