"""
Math-based Financial Health Score calculation (no AI/external APIs).

Formula:
  savings_rate_score      = f(weekly income vs expenses),       weight 0.40
  budget_adherence_score  = f(actual spend vs pro-rata budget), weight 0.40
  consistency_score       = f(distinct days with any entry),    weight 0.20
  overall_score           = weighted average of the three
"""

from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select, union
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.expense import Expense
from app.models.health_score import HealthScore
from app.models.income import Income

SAVINGS_RATE_WEIGHT = Decimal("0.4")
BUDGET_ADHERENCE_WEIGHT = Decimal("0.4")
CONSISTENCY_WEIGHT = Decimal("0.2")


def calculate_weekly_score(db: Session, user_id: int, week_start: date | None = None) -> HealthScore:
    """
    Calculate (or recalculate) the financial health score for the week
    starting on `week_start` (Monday).  Defaults to the current week.
    If a record already exists for that week it is updated in-place.
    """
    if week_start is None:
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

    week_end = week_start + timedelta(days=6)

    savings_score = _savings_rate_score(db, user_id, week_start, week_end)
    adherence_score = _budget_adherence_score(db, user_id, week_start, week_end)
    consistency_score = _consistency_score(db, user_id, week_start, week_end)

    overall = (
        savings_score * SAVINGS_RATE_WEIGHT
        + adherence_score * BUDGET_ADHERENCE_WEIGHT
        + consistency_score * CONSISTENCY_WEIGHT
    )

    existing = db.scalar(
        select(HealthScore)
        .where(HealthScore.user_id == user_id)
        .where(HealthScore.week_start_date == week_start)
    )

    now = datetime.utcnow()

    if existing:
        existing.savings_rate = _r(savings_score)
        existing.budget_adherence_score = _r(adherence_score)
        existing.consistency_score = _r(consistency_score)
        existing.overall_score = _r(overall)
        existing.calculated_at = now
        db.commit()
        db.refresh(existing)
        return existing

    record = HealthScore(
        user_id=user_id,
        week_start_date=week_start,
        week_end_date=week_end,
        savings_rate=_r(savings_score),
        budget_adherence_score=_r(adherence_score),
        consistency_score=_r(consistency_score),
        overall_score=_r(overall),
        calculated_at=now,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ---------------------------------------------------------------------------
# Sub-score helpers
# ---------------------------------------------------------------------------

def _savings_rate_score(db: Session, user_id: int, week_start: date, week_end: date) -> Decimal:
    """
    Maps (income - expenses) / income onto [0, 100].
    Break-even → 50.  Saving 20% → 60.  Overspending 50% → 25.
    Returns 50 when no data exists (neutral); 0 when spending with zero income.
    """
    income = _sum_income(db, user_id, week_start, week_end)
    expenses = _sum_expenses(db, user_id, week_start, week_end)

    if income == 0 and expenses == 0:
        return Decimal("50")
    if income == 0:
        return Decimal("0")

    raw = (income - expenses) / income
    return _clamp((raw + 1) / 2 * 100, Decimal("0"), Decimal("100"))


def _budget_adherence_score(db: Session, user_id: int, week_start: date, week_end: date) -> Decimal:
    """
    Compares actual spend to a pro-rated weekly allowance from the active budget.
    Within budget → 100.  50% over → 50.  100%+ over → 0.
    Returns 50 when no budget has been set (no benchmark, neutral).
    """
    budget = db.scalar(
        select(Budget)
        .where(Budget.user_id == user_id)
        .where(Budget.start_date <= week_end)
        .where(Budget.end_date >= week_start)
        .order_by(Budget.start_date.desc())
        .limit(1)
    )

    if budget is None:
        return Decimal("50")

    budget_days = (budget.end_date - budget.start_date).days
    if budget_days <= 0:
        return Decimal("50")

    allowance = Decimal(str(budget.total_budget)) / budget_days * 7
    expenses = _sum_expenses(db, user_id, week_start, week_end)

    if allowance == 0:
        return Decimal("100") if expenses == 0 else Decimal("0")

    overrun = max(Decimal("0"), expenses - allowance) / allowance
    return _clamp(Decimal("100") - overrun * 100, Decimal("0"), Decimal("100"))


def _consistency_score(db: Session, user_id: int, week_start: date, week_end: date) -> Decimal:
    """
    Fraction of the 7-day week on which the student logged at least one
    income or expense record, scaled to [0, 100].
    """
    income_dates = (
        select(Income.income_date.label("activity_date"))
        .where(Income.user_id == user_id)
        .where(Income.income_date >= week_start)
        .where(Income.income_date <= week_end)
    )
    expense_dates = (
        select(Expense.expense_date.label("activity_date"))
        .where(Expense.user_id == user_id)
        .where(Expense.expense_date >= week_start)
        .where(Expense.expense_date <= week_end)
    )
    all_dates = union(income_dates, expense_dates).subquery()
    active_days = db.scalar(select(func.count()).select_from(all_dates)) or 0
    return _clamp(Decimal(active_days) / 7 * 100, Decimal("0"), Decimal("100"))


# ---------------------------------------------------------------------------
# Shared aggregation helpers
# ---------------------------------------------------------------------------

def _sum_income(db: Session, user_id: int, week_start: date, week_end: date) -> Decimal:
    result = db.scalar(
        select(func.coalesce(func.sum(Income.amount), 0))
        .where(Income.user_id == user_id)
        .where(Income.income_date >= week_start)
        .where(Income.income_date <= week_end)
    )
    return Decimal(str(result)) if result is not None else Decimal("0")


def _sum_expenses(db: Session, user_id: int, week_start: date, week_end: date) -> Decimal:
    result = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.user_id == user_id)
        .where(Expense.expense_date >= week_start)
        .where(Expense.expense_date <= week_end)
    )
    return Decimal(str(result)) if result is not None else Decimal("0")


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _clamp(value: Decimal, lo: Decimal, hi: Decimal) -> Decimal:
    return max(lo, min(hi, value))


def _r(value: Decimal) -> Decimal:
    """Round to 2 d.p. to match DECIMAL(5,2) column precision."""
    return value.quantize(Decimal("0.01"))


def _week_bounds(reference: date) -> tuple[date, date]:
    start = reference - timedelta(days=reference.weekday())
    return start, start + timedelta(days=6)
