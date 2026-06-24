from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class CategoryCreate(BaseModel):
    name: str
    type: str
    icon: str | None = None


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: int
    name: str
    type: str
    icon: str | None = None
    is_default: bool
    created_by: int | None = None


class CategoryLimitCreate(BaseModel):
    category_id: int
    monthly_limit: Decimal
    alert_threshold_percent: Decimal = Decimal("80.00")


class CategoryLimitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    limit_id: int
    category_id: int
    monthly_limit: Decimal
    alert_threshold_percent: Decimal
    updated_at: datetime | None = None


class CategoryLimitAlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    category_id: int
    monthly_limit: Decimal
    spent_so_far: Decimal
    percent_used: Decimal
    is_over_threshold: bool
    is_over_limit: bool
