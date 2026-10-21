"""Pydantic schemas for vendors."""
from pydantic import BaseModel
from typing import Optional
from enum import Enum


class BookingStatus(str, Enum):
    not_contacted = "not_contacted"
    contacted = "contacted"
    negotiating = "negotiating"
    booked = "booked"
    confirmed = "confirmed"
    cancelled = "cancelled"


class VendorCreate(BaseModel):
    category: str
    vendor_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    booking_status: BookingStatus = BookingStatus.not_contacted
    notes: Optional[str] = None


class VendorUpdate(BaseModel):
    category: Optional[str] = None
    vendor_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    booking_status: Optional[BookingStatus] = None
    notes: Optional[str] = None


class VendorResponse(BaseModel):
    id: str
    event_id: str
    category: str
    vendor_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    booking_status: str
    notes: Optional[str] = None

    class Config:
        from_attributes = True
