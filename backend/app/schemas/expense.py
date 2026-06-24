from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.badge import BadgeOut
from app.schemas.category import CategoryLimitAlertOut


class ExpenseCreate(BaseModel):
    category_id: int
    amount: Decimal
    description: str | None = None
    expense_date: date


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    expense_id: int
    category_id: int
    amount: Decimal
    description: str | None = None
    expense_date: date


class ExpenseCreateResponse(ExpenseOut):
    alerts: list[CategoryLimitAlertOut] = []
    new_badges: list[BadgeOut] = []
