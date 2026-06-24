from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.expense import Expense
from app.models.user import User
from app.schemas.badge import BadgeOut
from app.schemas.category import CategoryLimitAlertOut
from app.schemas.expense import ExpenseCreate, ExpenseCreateResponse, ExpenseOut
from app.services.alert_service import check_category_limits
from app.services.badge_service import evaluate_and_award_badges

router = APIRouter()


@router.get("", response_model=list[ExpenseOut])
def list_expenses(
    start_date: date | None = None,
    end_date: date | None = None,
    category_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Expense).filter(Expense.user_id == current_user.user_id)
    if start_date is not None:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date is not None:
        query = query.filter(Expense.expense_date <= end_date)
    if category_id is not None:
        query = query.filter(Expense.category_id == category_id)
    return query.order_by(Expense.expense_date.desc()).all()


@router.post("", response_model=ExpenseCreateResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = Expense(user_id=current_user.user_id, **payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)

    alerts = check_category_limits(db, current_user.user_id, expense.expense_date)
    relevant_alerts = [
        CategoryLimitAlertOut.model_validate(alert)
        for alert in alerts
        if alert.category_id == expense.category_id
    ]
    new_badges = evaluate_and_award_badges(db, current_user.user_id)

    return ExpenseCreateResponse(
        **ExpenseOut.model_validate(expense).model_dump(),
        alerts=relevant_alerts,
        new_badges=[BadgeOut.model_validate(badge) for badge in new_badges],
    )


@router.get("/{expense_id}", response_model=ExpenseOut)
def get_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = _get_owned_expense(db, expense_id, current_user.user_id)
    return expense


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = _get_owned_expense(db, expense_id, current_user.user_id)
    for field, value in payload.model_dump().items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = _get_owned_expense(db, expense_id, current_user.user_id)
    db.delete(expense)
    db.commit()


@router.get("/summary/by-category")
def summary_by_category(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Total expenses grouped by category - feeds the dashboard pie/bar charts."""
    query = (
        db.query(Expense.category_id, func.sum(Expense.amount).label("total_amount"))
        .filter(Expense.user_id == current_user.user_id)
    )
    if start_date is not None:
        query = query.filter(Expense.expense_date >= start_date)
    if end_date is not None:
        query = query.filter(Expense.expense_date <= end_date)

    rows = query.group_by(Expense.category_id).all()
    return [{"category_id": category_id, "total_amount": total} for category_id, total in rows]


def _get_owned_expense(db: Session, expense_id: int, user_id: int) -> Expense:
    expense = db.get(Expense, expense_id)
    if expense is None or expense.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Expense not found")
    return expense
