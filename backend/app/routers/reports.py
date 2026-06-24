from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.services import pdf_service

router = APIRouter()


@router.get("/monthly")
def export_monthly_report(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate and download a PDF summary of the student's income/expenses for the given month."""
    pdf_buffer = pdf_service.generate_monthly_report(db, current_user, year, month)
    filename = f"myringgit-report-{current_user.user_id}-{year}-{month:02d}.pdf"
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
