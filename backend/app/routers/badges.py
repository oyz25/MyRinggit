from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.badge import Badge, UserBadge
from app.models.user import User
from app.schemas.badge import BadgeOut, UserBadgeOut

router = APIRouter()


@router.get("/catalog", response_model=list[BadgeOut])
def list_badge_catalog(db: Session = Depends(get_db)):
    """All badges that exist in the system, regardless of who has earned them."""
    return db.query(Badge).order_by(Badge.badge_id).all()


@router.get("/me", response_model=list[UserBadgeOut])
def list_my_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Badge, UserBadge.earned_at)
        .join(UserBadge, UserBadge.badge_id == Badge.badge_id)
        .filter(UserBadge.user_id == current_user.user_id)
        .order_by(UserBadge.earned_at.desc())
        .all()
    )
    return [
        UserBadgeOut(
            badge_id=badge.badge_id,
            name=badge.name,
            description=badge.description,
            icon=badge.icon,
            earned_at=earned_at,
        )
        for badge, earned_at in rows
    ]
