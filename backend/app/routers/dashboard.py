from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.category import Category
from app.models.expense import Expense
from app.models.health_score import HealthScore
from app.models.income import Income
from app.models.user import User
from app.schemas.dashboard import CategoryBreakdown, DashboardSummary

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated totals and breakdowns that power the Chart.js dashboard widgets."""
    income_query = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
        Income.user_id == current_user.user_id
    )
    expense_query = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.user_id == current_user.user_id
    )
    breakdown_query = (
        db.query(Category.name, func.coalesce(func.sum(Expense.amount), 0))
        .join(Category, Category.category_id == Expense.category_id)
        .filter(Expense.user_id == current_user.user_id)
    )

    if start_date is not None:
        income_query = income_query.filter(Income.income_date >= start_date)
        expense_query = expense_query.filter(Expense.expense_date >= start_date)
        breakdown_query = breakdown_query.filter(Expense.expense_date >= start_date)
    if end_date is not None:
        income_query = income_query.filter(Income.income_date <= end_date)
        expense_query = expense_query.filter(Expense.expense_date <= end_date)
        breakdown_query = breakdown_query.filter(Expense.expense_date <= end_date)

    total_income = income_query.scalar()
    total_expenses = expense_query.scalar()
    breakdown_rows = breakdown_query.group_by(Category.name).all()

    latest_score = (
        db.query(HealthScore.overall_score)
        .filter(HealthScore.user_id == current_user.user_id)
        .order_by(HealthScore.week_start_date.desc())
        .first()
    )

    return DashboardSummary(
        total_income=total_income,
        total_expenses=total_expenses,
        net_balance=total_income - total_expenses,
        expense_breakdown=[
            CategoryBreakdown(category_name=name, total_amount=total) for name, total in breakdown_rows
        ],
        overall_health_score=latest_score[0] if latest_score else None,
    )
