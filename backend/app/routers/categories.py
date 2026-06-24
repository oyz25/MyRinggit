from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.category import Category, CategoryLimit
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryLimitAlertOut,
    CategoryLimitCreate,
    CategoryLimitOut,
    CategoryOut,
)
from app.services.alert_service import check_category_limits

router = APIRouter()


@router.get("", response_model=list[CategoryOut])
def list_categories(
    type: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Default categories plus any custom categories created by this user."""
    query = select(Category).where(
        (Category.is_default == True) | (Category.created_by == current_user.user_id)  # noqa: E712
    )
    if type is not None:
        query = query.where(Category.type == type)
    return db.scalars(query.order_by(Category.name)).all()


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = Category(**payload.model_dump(), created_by=current_user.user_id, is_default=False)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/limits", response_model=list[CategoryLimitOut])
def list_category_limits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.scalars(
        select(CategoryLimit).where(CategoryLimit.user_id == current_user.user_id)
    ).all()


@router.post("/limits", response_model=CategoryLimitOut, status_code=status.HTTP_201_CREATED)
def set_category_limit(
    payload: CategoryLimitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update (upsert) the monthly spending limit for a category."""
    existing = db.scalar(
        select(CategoryLimit)
        .where(CategoryLimit.user_id == current_user.user_id)
        .where(CategoryLimit.category_id == payload.category_id)
    )

    if existing:
        existing.monthly_limit = payload.monthly_limit
        existing.alert_threshold_percent = payload.alert_threshold_percent
        db.commit()
        db.refresh(existing)
        return existing

    limit = CategoryLimit(user_id=current_user.user_id, **payload.model_dump())
    db.add(limit)
    db.commit()
    db.refresh(limit)
    return limit


@router.delete("/limits/{limit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category_limit(
    limit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    limit = db.get(CategoryLimit, limit_id)
    if limit is None or limit.user_id != current_user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category limit not found")
    db.delete(limit)
    db.commit()


@router.get("/limits/alerts", response_model=list[CategoryLimitAlertOut])
def get_limit_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Categories at/over their monthly spending alert threshold, for the dashboard banner."""
    return check_category_limits(db, current_user.user_id)
