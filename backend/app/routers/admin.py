from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin
from app.models.category import Category
from app.models.expense import Expense
from app.models.income import Income
from app.models.user import User
from app.schemas.user import UserOut

router = APIRouter()


@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin-only: list every registered student/admin account."""
    return db.query(User).order_by(User.user_id).all()


@router.patch("/users/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin-only: deactivate a student/admin account without deleting their data."""
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")

    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Admin-only: delete a category only if no expense or income is linked to it."""
    category = db.get(Category, category_id)
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")

    in_use_by_expense = db.scalar(
        select(Expense.expense_id).where(Expense.category_id == category_id).limit(1)
    )
    if in_use_by_expense is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This category is in use and cannot be deleted",
        )

    in_use_by_income = db.scalar(
        select(Income.income_id).where(Income.category_id == category_id).limit(1)
    )
    if in_use_by_income is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "This category is in use and cannot be deleted",
        )

    db.delete(category)
    db.commit()
