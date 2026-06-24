from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.income import Income
from app.models.user import User
from app.schemas.badge import BadgeOut
from app.schemas.income import IncomeCreate, IncomeCreateResponse, IncomeOut
from app.services.badge_service import evaluate_and_award_badges

router = APIRouter()


@router.get("", response_model=list[IncomeOut])
def list_income(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Income).filter(Income.user_id == current_user.user_id)
    if start_date is not None:
        query = query.filter(Income.income_date >= start_date)
    if end_date is not None:
        query = query.filter(Income.income_date <= end_date)
    return query.order_by(Income.income_date.desc()).all()


@router.post("", response_model=IncomeCreateResponse, status_code=status.HTTP_201_CREATED)
def create_income(
    payload: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    income = Income(user_id=current_user.user_id, **payload.model_dump())
    db.add(income)
    db.commit()
    db.refresh(income)

    new_badges = evaluate_and_award_badges(db, current_user.user_id)

    return IncomeCreateResponse(
        **IncomeOut.model_validate(income).model_dump(),
        new_badges=[BadgeOut.model_validate(badge) for badge in new_badges],
    )


@router.get("/{income_id}", response_model=IncomeOut)
def get_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_income(db, income_id, current_user.user_id)


@router.put("/{income_id}", response_model=IncomeOut)
def update_income(
    income_id: int,
    payload: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    income = _get_owned_income(db, income_id, current_user.user_id)
    for field, value in payload.model_dump().items():
        setattr(income, field, value)
    db.commit()
    db.refresh(income)
    return income


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    income = _get_owned_income(db, income_id, current_user.user_id)
    db.delete(income)
    db.commit()


def _get_owned_income(db: Session, income_id: int, user_id: int) -> Income:
    income = db.get(Income, income_id)
    if income is None or income.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Income record not found")
    return income
