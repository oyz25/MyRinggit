from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        CheckConstraint("type IN ('expense', 'income')", name="CK_categories_type"),
        UniqueConstraint("name", "type", "created_by", name="UQ_categories_name_type_owner"),
    )

    category_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)


class CategoryLimit(Base):
    """Per-student, per-category monthly spending limit -> drives the spending limit alert."""

    __tablename__ = "category_limits"
    __table_args__ = (
        UniqueConstraint("user_id", "category_id", name="UQ_category_limits_user_category"),
        CheckConstraint("monthly_limit >= 0", name="CK_category_limits_amount"),
    )

    limit_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.category_id", ondelete="CASCADE"), nullable=False
    )
    monthly_limit: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    alert_threshold_percent: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=80)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=datetime.utcnow, onupdate=datetime.utcnow)
