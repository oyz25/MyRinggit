"""
Checks a student's spending against their per-category monthly limits
(`category_limits.monthly_limit` / `alert_threshold_percent`) and reports
when a category is approaching or has exceeded its limit.

Intended to be called after an expense is created/updated (see
app/routers/expenses.py) so the frontend can surface a real-time alert.
"""

from calendar import monthrange
from dataclasses import dataclass
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.category import CategoryLimit
from app.models.expense import Expense


@dataclass
class CategoryLimitAlert:
    category_id: int
    monthly_limit: Decimal
    spent_so_far: Decimal
    percent_used: Decimal
    is_over_threshold: bool
    is_over_limit: bool


def check_category_limits(db: Session, user_id: int, reference_date: date | None = None) -> list[CategoryLimitAlert]:
    """
    Compare this month's spend per category against the student's configured
    limits and return any categories that are at/over their alert threshold.
    """
    if reference_date is None:
        reference_date = date.today()

    month_start = reference_date.replace(day=1)
    month_end = reference_date.replace(day=monthrange(reference_date.year, reference_date.month)[1])

    limits = db.scalars(
        select(CategoryLimit).where(CategoryLimit.user_id == user_id)
    ).all()

    alerts: list[CategoryLimitAlert] = []
    for limit in limits:
        spent = db.scalar(
            select(func.coalesce(func.sum(Expense.amount), 0))
            .where(Expense.user_id == user_id)
            .where(Expense.category_id == limit.category_id)
            .where(Expense.expense_date >= month_start)
            .where(Expense.expense_date <= month_end)
        )
        spent = Decimal(str(spent)) if spent is not None else Decimal("0")

        monthly_limit = Decimal(str(limit.monthly_limit))
        threshold = Decimal(str(limit.alert_threshold_percent))

        percent_used = (spent / monthly_limit * 100) if monthly_limit > 0 else Decimal("0")
        is_over_threshold = percent_used >= threshold
        is_over_limit = monthly_limit > 0 and spent >= monthly_limit

        if is_over_threshold:
            alerts.append(
                CategoryLimitAlert(
                    category_id=limit.category_id,
                    monthly_limit=monthly_limit,
                    spent_so_far=spent.quantize(Decimal("0.01")),
                    percent_used=percent_used.quantize(Decimal("0.01")),
                    is_over_threshold=is_over_threshold,
                    is_over_limit=is_over_limit,
                )
            )

    return alerts
