"""Authentication dependencies and ownership verification."""
from fastapi import Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.core.security import decode_access_token
from app.config import settings


def get_token_from_request(request: Request) -> Optional[str]:
    """
    Extract token from Authorization header if present, or from HttpOnly cookie.
    """
    # 1. Explicit Authorization: Bearer <token> header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:].strip()

    # 2. HttpOnly session cookie
    token = request.cookies.get("access_token")
    if token:
        return token

    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    """Dependency that requires an authenticated user."""
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_user_event_or_404(db: Session, event_id: str, user_id: str) -> Event:
    """
    Ensure the event exists and is strictly owned by the authenticated user.
    Returns 404 if the event does not exist or belongs to another user/is unowned,
    preventing resource enumeration attacks and ensuring absolute data isolation.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event or event.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found"
        )
    return event


def set_auth_cookie(response: Response, token: str):
    """Set secure, HttpOnly session cookie."""
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


def clear_auth_cookie(response: Response):
    """Clear session cookie."""
    response.delete_cookie(
        key="access_token",
        path="/",
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
    )
