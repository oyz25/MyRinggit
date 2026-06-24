"""
Estimates how many days a student's remaining PTPTN balance will last,
based on their recent average daily spending.
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.ptptn import PtptnDisbursement
from app.schemas.ptptn import SurvivalCountdownOut

AVERAGE_WINDOW_DAYS = 30


def calculate_survival_countdown(db: Session, user_id: int, reference_date: date | None = None) -> SurvivalCountdownOut:
    if reference_date is None:
        reference_date = date.today()

    total_disbursed = db.scalar(
        select(func.coalesce(func.sum(PtptnDisbursement.amount), 0))
        .where(PtptnDisbursement.user_id == user_id)
    )
    total_disbursed = Decimal(str(total_disbursed)) if total_disbursed is not None else Decimal("0")

    earliest_disbursement_date = db.scalar(
        select(func.min(PtptnDisbursement.disbursement_date))
        .where(PtptnDisbursement.user_id == user_id)
    )

    if earliest_disbursement_date is None:
        return SurvivalCountdownOut(
            remaining_balance=Decimal("0.00"),
            average_daily_spend=Decimal("0.00"),
            message="No PTPTN disbursements recorded yet.",
        )

    latest_disbursement_date = db.scalar(
        select(func.max(PtptnDisbursement.disbursement_date))
        .where(PtptnDisbursement.user_id == user_id)
    )

    spent_since_earliest = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.user_id == user_id)
        .where(Expense.expense_date >= earliest_disbursement_date)
        .where(Expense.expense_date <= reference_date)
    )
    spent_since_earliest = Decimal(str(spent_since_earliest)) if spent_since_earliest is not None else Decimal("0")

    remaining_balance = (total_disbursed - spent_since_earliest).quantize(Decimal("0.01"))

    if remaining_balance <= 0:
        return SurvivalCountdownOut(
            remaining_balance=remaining_balance,
            average_daily_spend=Decimal("0.00"),
            estimated_days_remaining=0,
            estimated_runout_date=reference_date,
            message="Your PTPTN balance is already exhausted.",
        )

    # Use the last 30 days, or since the most recent disbursement if that's more recent.
    default_window_start = reference_date - timedelta(days=AVERAGE_WINDOW_DAYS - 1)
    window_start = max(default_window_start, latest_disbursement_date)
    window_days = (reference_date - window_start).days + 1

    recent_spend = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.user_id == user_id)
        .where(Expense.expense_date >= window_start)
        .where(Expense.expense_date <= reference_date)
    )
    recent_spend = Decimal(str(recent_spend)) if recent_spend is not None else Decimal("0")
    average_daily_spend = (recent_spend / window_days).quantize(Decimal("0.01"))

    if average_daily_spend <= 0:
        return SurvivalCountdownOut(
            remaining_balance=remaining_balance,
            average_daily_spend=average_daily_spend,
            message="Not enough spending data yet to estimate a countdown.",
        )

    estimated_days_remaining = int(remaining_balance / average_daily_spend)
    estimated_runout_date = reference_date + timedelta(days=estimated_days_remaining)

    return SurvivalCountdownOut(
        remaining_balance=remaining_balance,
        average_daily_spend=average_daily_spend,
        estimated_days_remaining=estimated_days_remaining,
        estimated_runout_date=estimated_runout_date,
    )
