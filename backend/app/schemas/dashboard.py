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
