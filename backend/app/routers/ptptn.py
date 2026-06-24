from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.ptptn import PtptnDisbursement
from app.models.user import User
from app.schemas.ptptn import PtptnDisbursementCreate, PtptnDisbursementOut, SurvivalCountdownOut
from app.services.ptptn_service import calculate_survival_countdown

router = APIRouter()


@router.get("", response_model=list[PtptnDisbursementOut])
def list_disbursements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(PtptnDisbursement)
        .filter(PtptnDisbursement.user_id == current_user.user_id)
        .order_by(PtptnDisbursement.disbursement_date.desc())
        .all()
    )


@router.post("", response_model=PtptnDisbursementOut, status_code=status.HTTP_201_CREATED)
def create_disbursement(
    payload: PtptnDisbursementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    disbursement = PtptnDisbursement(user_id=current_user.user_id, **payload.model_dump())
    db.add(disbursement)
    db.commit()
    db.refresh(disbursement)
    return disbursement


@router.get("/survival-countdown", response_model=SurvivalCountdownOut)
def survival_countdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Estimate how many days the remaining PTPTN balance will last,
    based on the student's recent average daily spending.
    """
    return calculate_survival_countdown(db, current_user.user_id)


@router.get("/{disbursement_id}", response_model=PtptnDisbursementOut)
def get_disbursement(
    disbursement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_owned_disbursement(db, disbursement_id, current_user.user_id)


@router.put("/{disbursement_id}", response_model=PtptnDisbursementOut)
def update_disbursement(
    disbursement_id: int,
    payload: PtptnDisbursementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    disbursement = _get_owned_disbursement(db, disbursement_id, current_user.user_id)
    for field, value in payload.model_dump().items():
        setattr(disbursement, field, value)
    db.commit()
    db.refresh(disbursement)
    return disbursement


@router.delete("/{disbursement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_disbursement(
    disbursement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    disbursement = _get_owned_disbursement(db, disbursement_id, current_user.user_id)
    db.delete(disbursement)
    db.commit()


def _get_owned_disbursement(db: Session, disbursement_id: int, user_id: int) -> PtptnDisbursement:
    disbursement = db.get(PtptnDisbursement, disbursement_id)
    if disbursement is None or disbursement.user_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Disbursement not found")
    return disbursement
