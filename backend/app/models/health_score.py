from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class HealthScore(Base):
    """Weekly Financial Health Score snapshot per student (math-based, no AI)."""

    __tablename__ = "health_scores"
    __table_args__ = (
        UniqueConstraint("user_id", "week_start_date", name="UQ_health_scores_user_week"),
        CheckConstraint("week_end_date > week_start_date", name="CK_health_scores_dates"),
    )

    health_score_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    week_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    week_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    savings_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    budget_adherence_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    consistency_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    overall_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=0)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
