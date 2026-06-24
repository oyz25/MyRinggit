"""
Builds the "Export Monthly Report to PDF" document using ReportLab.
Pulls the student's income/expenses/health score for the requested
month and renders them into a downloadable PDF (see app/routers/reports.py).
"""

import calendar
import io
from datetime import date
from decimal import Decimal

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.expense import Expense
from app.models.health_score import HealthScore
from app.models.income import Income
from app.models.user import User

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 50
RIGHT_MARGIN = PAGE_WIDTH - 50

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def generate_monthly_report(db: Session, user: User, year: int, month: int) -> io.BytesIO:
    """Render a one-page PDF summary for the given month."""
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    total_income = _sum_income(db, user.user_id, first_day, last_day)
    total_expenses = _sum_expenses(db, user.user_id, first_day, last_day)
    net_balance = total_income - total_expenses
    breakdown = _expense_breakdown(db, user.user_id, first_day, last_day)
    health_score = _average_health_score(db, user.user_id, first_day, last_day)

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    y = PAGE_HEIGHT - 50

    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(LEFT_MARGIN, y, "MyRinggit - Monthly Financial Report")
    y -= 28

    pdf.setFont("Helvetica", 11)
    pdf.drawString(LEFT_MARGIN, y, f"Student: {user.full_name} ({user.email})")
    y -= 16
    pdf.drawString(LEFT_MARGIN, y, f"Period: {MONTH_NAMES[month]} {year}")
    y -= 30

    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(LEFT_MARGIN, y, "Summary")
    y -= 20
    pdf.setFont("Helvetica", 11)
    y = _draw_amount_row(pdf, y, "Total Income", total_income)
    y = _draw_amount_row(pdf, y, "Total Expenses", total_expenses)
    y = _draw_amount_row(pdf, y, "Net Balance", net_balance)
    y -= 20

    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(LEFT_MARGIN, y, "Expense Breakdown by Category")
    y -= 20
    pdf.setFont("Helvetica", 11)
    if not breakdown:
        pdf.drawString(LEFT_MARGIN, y, "No expenses recorded for this period.")
        y -= 18
    else:
        for category_name, amount in breakdown:
            percent = (amount / total_expenses * 100) if total_expenses else Decimal("0")
            pdf.drawString(LEFT_MARGIN, y, category_name)
            pdf.drawRightString(RIGHT_MARGIN, y, f"RM {amount:.2f} ({percent:.1f}%)")
            y -= 18
    y -= 20

    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(LEFT_MARGIN, y, "Financial Health Score")
    y -= 20
    pdf.setFont("Helvetica", 11)
    if health_score is None:
        pdf.drawString(LEFT_MARGIN, y, "No health score has been calculated for this period.")
    else:
        pdf.drawString(LEFT_MARGIN, y, f"Average Overall Score: {health_score:.1f} / 100")
    y -= 18

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer


def _draw_amount_row(pdf: canvas.Canvas, y: float, label: str, amount: Decimal) -> float:
    pdf.drawString(LEFT_MARGIN, y, label)
    pdf.drawRightString(RIGHT_MARGIN, y, f"RM {amount:.2f}")
    return y - 18


def _sum_income(db: Session, user_id: int, start: date, end: date) -> Decimal:
    result = db.scalar(
        select(func.coalesce(func.sum(Income.amount), 0))
        .where(Income.user_id == user_id)
        .where(Income.income_date >= start)
        .where(Income.income_date <= end)
    )
    return Decimal(str(result)) if result is not None else Decimal("0")


def _sum_expenses(db: Session, user_id: int, start: date, end: date) -> Decimal:
    result = db.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.user_id == user_id)
        .where(Expense.expense_date >= start)
        .where(Expense.expense_date <= end)
    )
    return Decimal(str(result)) if result is not None else Decimal("0")


def _expense_breakdown(db: Session, user_id: int, start: date, end: date) -> list[tuple[str, Decimal]]:
    rows = (
        db.query(Category.name, func.coalesce(func.sum(Expense.amount), 0))
        .join(Category, Category.category_id == Expense.category_id)
        .filter(Expense.user_id == user_id)
        .filter(Expense.expense_date >= start)
        .filter(Expense.expense_date <= end)
        .group_by(Category.name)
        .order_by(func.coalesce(func.sum(Expense.amount), 0).desc())
        .all()
    )
    return [(name, Decimal(str(total))) for name, total in rows]


def _average_health_score(db: Session, user_id: int, start: date, end: date) -> Decimal | None:
    """Average overall_score across weekly health scores that overlap the given month."""
    result = db.scalar(
        select(func.avg(HealthScore.overall_score))
        .where(HealthScore.user_id == user_id)
        .where(HealthScore.week_start_date <= end)
        .where(HealthScore.week_end_date >= start)
    )
    return Decimal(str(result)) if result is not None else None
