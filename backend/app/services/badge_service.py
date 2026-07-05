"""
Evaluates a student's activity against the badge catalog (`badges.criteria_type`
/ `criteria_value`) and awards any newly-earned badges via `user_badges`.

Supported criteria_type values:
  expenses_logged_count    - total number of expense records >= criteria_value
  income_logged_count      - total number of income records >= criteria_value
  health_score_above       - best-ever overall_score >= criteria_value
  savings_rate_above       - best-ever savings_rate >= criteria_value
  consistency_score_above  - best-ever consistency_score >= criteria_value
  budget_adherence_above   - best-ever budget_adherence_score >= criteria_value
  health_streak_weeks      - current trailing streak of consecutive weeks with
                             overall_score >= 60, skipping a week breaks it

NOTE: 'streak_days' badges are NOT handled here. They're awarded directly by
app/services/streak_service.py at the moment the expense-logging streak is
updated, since that's the only place that knows the streak just changed.
"""

from datetime import datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.badge import Badge, UserBadge
from app.models.expense import Expense
from app.models.health_score import HealthScore
from app.models.income import Income


def evaluate_and_award_badges(db: Session, user_id: int) -> list[Badge]:
    """
    Check all badge criteria for this user and award any badges not yet earned.
    Returns the list of newly-awarded badges.
    """
    earned_badge_ids = set(
        db.scalars(select(UserBadge.badge_id).where(UserBadge.user_id == user_id)).all()
    )

    newly_awarded: list[Badge] = []
    for badge in db.scalars(select(Badge)).all():
        if badge.badge_id in earned_badge_ids:
            continue
        if _meets_criteria(db, user_id, badge.criteria_type, badge.criteria_value):
            _award_badge(db, user_id, badge.badge_id)
            newly_awarded.append(badge)

    return newly_awarded


def _meets_criteria(db: Session, user_id: int, criteria_type: str, criteria_value: Decimal) -> bool:
    if criteria_type == "expenses_logged_count":
        count = db.scalar(
            select(func.count()).select_from(Expense).where(Expense.user_id == user_id)
        )
        return (count or 0) >= criteria_value

    if criteria_type == "income_logged_count":
        count = db.scalar(
            select(func.count()).select_from(Income).where(Income.user_id == user_id)
        )
        return (count or 0) >= criteria_value

    if criteria_type == "health_score_above":
        best = db.scalar(
            select(func.max(HealthScore.overall_score)).where(HealthScore.user_id == user_id)
        )
        return best is not None and best >= criteria_value

    if criteria_type == "savings_rate_above":
        best = db.scalar(
            select(func.max(HealthScore.savings_rate)).where(HealthScore.user_id == user_id)
        )
        return best is not None and best >= criteria_value

    if criteria_type == "consistency_score_above":
        best = db.scalar(
            select(func.max(HealthScore.consistency_score)).where(HealthScore.user_id == user_id)
        )
        return best is not None and best >= criteria_value

    if criteria_type == "budget_adherence_above":
        best = db.scalar(
            select(func.max(HealthScore.budget_adherence_score)).where(HealthScore.user_id == user_id)
        )
        return best is not None and best >= criteria_value

    if criteria_type == "health_streak_weeks":
        streak = _compute_health_streak_weeks(db, user_id)
        return streak >= criteria_value

    return False


def _compute_health_streak_weeks(db: Session, user_id: int) -> int:
    """
    Returns the current trailing streak of consecutive calendar weeks where the
    student's health score was >= 60.  A gap (skipped week) or any score below
    60 resets the streak.  Weeks are identified by week_start_date; consecutive
    means exactly 7 days apart.
    """
    scores = db.scalars(
        select(HealthScore)
        .where(HealthScore.user_id == user_id)
        .order_by(HealthScore.week_start_date.asc())
    ).all()

    if not scores:
        return 0

    streak = 1 if scores[0].overall_score >= 60 else 0
    for i in range(1, len(scores)):
        prev = scores[i - 1]
        curr = scores[i]
        is_consecutive = (curr.week_start_date - prev.week_start_date) == timedelta(days=7)
        if is_consecutive and curr.overall_score >= 60:
            streak += 1
        else:
            streak = 1 if curr.overall_score >= 60 else 0

    return streak


def _award_badge(db: Session, user_id: int, badge_id: int) -> UserBadge:
    user_badge = UserBadge(user_id=user_id, badge_id=badge_id, earned_at=datetime.utcnow())
    db.add(user_badge)
    db.commit()
    db.refresh(user_badge)
    return user_badge
