from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class BudgetCreate(BaseModel):
    semester_name: str
    start_date: date
    end_date: date
    total_budget: Decimal


class BudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    budget_id: int
    semester_name: str
    start_date: date
    end_date: date
    total_budget: Decimal
