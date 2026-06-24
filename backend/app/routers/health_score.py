from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.health_score import HealthScore
from app.models.user import User
from app.schemas.badge import BadgeOut
from app.schemas.health_score import HealthScoreOut, HealthScoreRecalculateResponse
from app.services import health_score_service
from app.services.badge_service import evaluate_and_award_badges

router = APIRouter()


@router.get("", response_model=list[HealthScoreOut])
def list_health_scores(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(HealthScore)
        .filter(HealthScore.user_id == current_user.user_id)
        .order_by(HealthScore.week_start_date.desc())
        .all()
    )


@router.get("/latest", response_model=HealthScoreOut)
def latest_health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    score = (
        db.query(HealthScore)
        .filter(HealthScore.user_id == current_user.user_id)
        .order_by(HealthScore.week_start_date.desc())
        .first()
    )
    if score is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No health score has been calculated yet")
    return score


@router.post("/recalculate", response_model=HealthScoreRecalculateResponse, status_code=status.HTTP_201_CREATED)
def recalculate_health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Recompute this week's financial health score from the latest income/expense data."""
    score = health_score_service.calculate_weekly_score(db, current_user.user_id)
    new_badges = evaluate_and_award_badges(db, current_user.user_id)

    return HealthScoreRecalculateResponse(
        **HealthScoreOut.model_validate(score).model_dump(),
        new_badges=[BadgeOut.model_validate(badge) for badge in new_badges],
    )
