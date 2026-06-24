from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class PtptnDisbursementCreate(BaseModel):
    budget_id: int | None = None
    amount: Decimal
    disbursement_date: date
    expected_next_date: date | None = None
    remarks: str | None = None


class PtptnDisbursementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    disbursement_id: int
    budget_id: int | None = None
    amount: Decimal
    disbursement_date: date
    expected_next_date: date | None = None
    remarks: str | None = None


class SurvivalCountdownOut(BaseModel):
    """Derived projection of how long the remaining PTPTN balance will last."""

    remaining_balance: Decimal
    average_daily_spend: Decimal
    estimated_days_remaining: int | None = None
    estimated_runout_date: date | None = None
    message: str | None = None
