"""
Estimates how many days this month's living money will last, based on
living income (everything except PTPTN) minus living expenses so far
this month, divided by the average daily living spend this month.

Completely separate from the PTPTN survival countdown: PTPTN disbursements
and tuition are excluded entirely.
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.expense import Expense
from app.models.income import Income
from app.schemas.dashboard import LivingExpenseCountdownOut


def calculate_living_expense_countdown(
    db: Session, user_id: int, reference_date: date | None = None
) -> LivingExpenseCountdownOut:
    if reference_date is None:
        reference_date = date.today()

    month_start = reference_date.replace(day=1)
    days_elapsed = (reference_date - month_start).days + 1

    living_income = db.scalar(
        select(func.coalesce(func.sum(Income.amount), 0))
        .select_from(Income)
        .outerjoin(Category, Category.category_id == Income.category_id)
        .where(Income.user_id == user_id)
        .where(Income.income_date >= month_start)
        .where(Income.income_date <= reference_date)
        .where(func.coalesce(Category.name, "") != "PTPTN")
    )
    living_income = Decimal(str(living_income)) if living_income is not None else Decimal("0")

    living_expenses = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.user_id == user_id)
        .where(Expense.expense_date >= month_start)
        .where(Expense.expense_date <= reference_date)
    )
    living_expenses = Decimal(str(living_expenses)) if living_expenses is not None else Decimal("0")

    if living_income == 0 and living_expenses == 0:
        return LivingExpenseCountdownOut(
            living_income=Decimal("0.00"),
            living_expenses=Decimal("0.00"),
            remaining_balance=Decimal("0.00"),
            average_daily_living_spend=Decimal("0.00"),
            message="No income or expenses recorded yet this month.",
        )

    remaining_balance = (living_income - living_expenses).quantize(Decimal("0.01"))
    average_daily_living_spend = (living_expenses / days_elapsed).quantize(Decimal("0.01"))

    if remaining_balance <= 0:
        return LivingExpenseCountdownOut(
            living_income=living_income,
            living_expenses=living_expenses,
            remaining_balance=remaining_balance,
            average_daily_living_spend=average_daily_living_spend,
            estimated_days_remaining=0,
            estimated_runout_date=reference_date,
            message="Your living expense budget for this month is already exhausted.",
        )

    if average_daily_living_spend <= 0:
        return LivingExpenseCountdownOut(
            living_income=living_income,
            living_expenses=living_expenses,
            remaining_balance=remaining_balance,
            average_daily_living_spend=average_daily_living_spend,
            message="Not enough spending data yet to estimate a countdown.",
        )

    estimated_days_remaining = int(remaining_balance / average_daily_living_spend)
    estimated_runout_date = reference_date + timedelta(days=estimated_days_remaining)

    return LivingExpenseCountdownOut(
        living_income=living_income,
        living_expenses=living_expenses,
        remaining_balance=remaining_balance,
        average_daily_living_spend=average_daily_living_spend,
        estimated_days_remaining=estimated_days_remaining,
        estimated_runout_date=estimated_runout_date,
    )
