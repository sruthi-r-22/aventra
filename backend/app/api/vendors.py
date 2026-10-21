"""Vendors API router."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vendor import Vendor
from app.models.user import User
from app.models.plan import ActivityRecord
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorResponse
from app.core.auth import get_current_user, get_user_event_or_404

router = APIRouter(prefix="/events/{event_id}/vendors", tags=["vendors"])


def _log(db, event_id, action, details=None):
    db.add(ActivityRecord(event_id=event_id, action=action, entity_type="vendor", details=details))


@router.get("/")
def list_vendors(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    return db.query(Vendor).filter(Vendor.event_id == event_id).order_by(Vendor.category).all()


@router.post("/", status_code=201)
def create_vendor(
    event_id: str,
    data: VendorCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    vendor = Vendor(event_id=event_id, **data.model_dump())
    db.add(vendor)
    _log(db, event_id, f"Vendor '{data.vendor_name or data.category}' added")
    db.commit()
    db.refresh(vendor)
    return vendor


@router.put("/{vendor_id}")
def update_vendor(
    event_id: str,
    vendor_id: str,
    data: VendorUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id, Vendor.event_id == event_id
    ).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(vendor, field, value)
    _log(db, event_id, f"Vendor '{vendor.vendor_name or vendor.category}' updated")
    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}", status_code=204)
def delete_vendor(
    event_id: str,
    vendor_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_user_event_or_404(db, event_id, current_user.id)
    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id, Vendor.event_id == event_id
    ).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    db.delete(vendor)
    _log(db, event_id, f"Vendor '{vendor.vendor_name or vendor.category}' deleted")
    db.commit()
