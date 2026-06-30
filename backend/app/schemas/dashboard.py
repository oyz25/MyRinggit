from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class CategoryBreakdown(BaseModel):
    category_name: str
    total_amount: Decimal


class DashboardSummary(BaseModel):
    """Aggregated figures used to populate the Chart.js dashboard widgets."""

    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal
    expense_breakdown: list[CategoryBreakdown]
    overall_health_score: Decimal | None = None


class LivingExpenseCountdownOut(BaseModel):
    """How long this month's non-PTPTN income will last, based on living spend so far this month."""

    living_income: Decimal
    living_expenses: Decimal
    remaining_balance: Decimal
    average_daily_living_spend: Decimal
    estimated_days_remaining: int | None = None
    estimated_runout_date: date | None = None
    message: str | None = None
