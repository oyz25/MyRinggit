from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.badge import BadgeOut


class HealthScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    health_score_id: int
    week_start_date: date
    week_end_date: date
    savings_rate: Decimal
    budget_adherence_score: Decimal
    consistency_score: Decimal
    overall_score: Decimal
    calculated_at: datetime


class HealthScoreRecalculateResponse(HealthScoreOut):
    new_badges: list[BadgeOut] = []
