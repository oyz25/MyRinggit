from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class BadgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    badge_id: int
    name: str
    description: str | None = None
    icon: str | None = None
    criteria_type: str
    criteria_value: Decimal


class UserBadgeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    badge_id: int
    name: str
    description: str | None = None
    icon: str | None = None
    earned_at: datetime
