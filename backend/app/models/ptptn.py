from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PtptnDisbursement(Base):
    __tablename__ = "ptptn_disbursements"
    __table_args__ = (
        CheckConstraint("amount >= 0", name="CK_ptptn_amount"),
    )

    disbursement_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    budget_id: Mapped[int | None] = mapped_column(
        ForeignKey("budgets.budget_id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    disbursement_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_next_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    remarks: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
