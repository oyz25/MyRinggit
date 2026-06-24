from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.badge import BadgeOut


class IncomeCreate(BaseModel):
    category_id: int | None = None
    amount: Decimal
    source: str | None = None
    description: str | None = None
    income_date: date


class IncomeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    income_id: int
    category_id: int | None = None
    amount: Decimal
    source: str | None = None
    description: str | None = None
    income_date: date


class IncomeCreateResponse(IncomeOut):
    new_badges: list[BadgeOut] = []
