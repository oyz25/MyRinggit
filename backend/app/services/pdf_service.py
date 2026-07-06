"""
Builds the "Export Monthly Report to PDF" document using ReportLab.
Styled with the MyRinggit brand palette: blue primary, status green/amber/red.
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
MARGIN = 50
CONTENT_RIGHT = PAGE_WIDTH - MARGIN
CONTENT_WIDTH = CONTENT_RIGHT - MARGIN          # ~495 pt

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

# Brand palette — RGB triples, sourced from theme.css hex values
C_PRIMARY = (0.145, 0.388, 0.922)   # #2563eb  brand blue
C_SUCCESS = (0.086, 0.639, 0.290)   # #16a34a  green (positive / good)
C_DANGER  = (0.863, 0.149, 0.149)   # #dc2626  red   (negative / critical)
C_WARNING = (0.851, 0.467, 0.024)   # #d97706  amber (caution)
C_SURFACE = (0.957, 0.965, 0.976)   # #f4f6f9  light grey surface
C_ROW_ALT = (0.933, 0.949, 1.000)   # #eef2ff  subtle blue row tint
C_TEXT    = (0.122, 0.161, 0.200)   # #1f2933  near-black body text
C_MUTED   = (0.420, 0.447, 0.502)   # #6b7280  secondary / caption text
C_WHITE   = (1.0,   1.0,   1.0  )


def generate_monthly_report(db: Session, user: User, year: int, month: int) -> io.BytesIO:
    """Render a styled one-page PDF summary for the given month."""
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    total_income = _sum_income(db, user.user_id, first_day, last_day)
    total_expenses = _sum_expenses(db, user.user_id, first_day, last_day)
    net_balance = total_income - total_expenses
    breakdown = _expense_breakdown(db, user.user_id, first_day, last_day)
    health_score = _average_health_score(db, user.user_id, first_day, last_day)

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)

    y = _draw_header(pdf, user, year, month)
    y -= 24

    y = _draw_summary_boxes(pdf, y, total_income, total_expenses, net_balance)
    y -= 28

    y = _draw_section_heading(pdf, y, "Expense Breakdown by Category")
    y = _draw_expense_table(pdf, y, breakdown, total_expenses)
    y -= 28

    y = _draw_section_heading(pdf, y, "Financial Health Score")
    _draw_health_score(pdf, y, health_score)

    _draw_footer(pdf, year, month)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer


# ─── Header banner ───────────────────────────────────────────────────────────

def _draw_header(pdf: canvas.Canvas, user: User, year: int, month: int) -> float:
    """Full-width blue banner. Returns y at the bottom edge of the banner."""
    BANNER_H = 88

    pdf.setFillColorRGB(*C_PRIMARY)
    pdf.rect(0, PAGE_HEIGHT - BANNER_H, PAGE_WIDTH, BANNER_H, fill=1, stroke=0)

    # App name
    pdf.setFillColorRGB(*C_WHITE)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 34, "MyRinggit")

    # Report subtitle
    pdf.setFont("Helvetica", 11)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 52, "Monthly Financial Report")

    # Student name + period in soft off-white
    pdf.setFillColorRGB(0.85, 0.90, 0.98)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(MARGIN, PAGE_HEIGHT - 69, f"{user.full_name}  ·  {user.email}")
    pdf.drawRightString(CONTENT_RIGHT, PAGE_HEIGHT - 69, f"{MONTH_NAMES[month]} {year}")

    return PAGE_HEIGHT - BANNER_H


# ─── Section headings ────────────────────────────────────────────────────────

def _draw_section_heading(pdf: canvas.Canvas, y: float, text: str) -> float:
    """Bold heading with a 2 pt blue underline. Returns y below the underline."""
    pdf.setFillColorRGB(*C_TEXT)
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(MARGIN, y, text)

    pdf.setStrokeColorRGB(*C_PRIMARY)
    pdf.setLineWidth(2)
    pdf.line(MARGIN, y - 5, CONTENT_RIGHT, y - 5)
    pdf.setLineWidth(1)

    return y - 18


# ─── Summary boxes ───────────────────────────────────────────────────────────

def _draw_summary_boxes(
    pdf: canvas.Canvas, y: float,
    income: Decimal, expenses: Decimal, net: Decimal,
) -> float:
    """Three side-by-side stat boxes. Returns y below them."""
    GAP = 12
    BOX_H = 70
    box_w = (CONTENT_WIDTH - GAP * 2) / 3

    entries = [
        ("Total Income",   income,   C_SUCCESS),
        ("Total Expenses", expenses, C_DANGER),
        ("Net Balance",    net,      C_SUCCESS if net >= 0 else C_DANGER),
    ]

    for i, (label, amount, accent) in enumerate(entries):
        x = MARGIN + i * (box_w + GAP)

        # Box background
        pdf.setFillColorRGB(*C_SURFACE)
        pdf.roundRect(x, y - BOX_H, box_w, BOX_H, 6, fill=1, stroke=0)

        # Colored top accent stripe
        pdf.setFillColorRGB(*accent)
        pdf.roundRect(x, y - 4, box_w, 4, 2, fill=1, stroke=0)

        # Label
        pdf.setFillColorRGB(*C_MUTED)
        pdf.setFont("Helvetica", 9)
        pdf.drawString(x + 10, y - 24, label)

        # Amount (colored for Net Balance; neutral for Income/Expenses)
        pdf.setFillColorRGB(*(accent if label == "Net Balance" else C_TEXT))
        pdf.setFont("Helvetica-Bold", 15)
        pdf.drawString(x + 10, y - 50, f"RM {amount:,.2f}")

    return y - BOX_H


# ─── Expense table ───────────────────────────────────────────────────────────

_COL_CAT = 280    # category name column
_COL_AMT = 115    # amount column; percent takes remainder (~100 pt)

def _draw_expense_table(
    pdf: canvas.Canvas, y: float,
    breakdown: list[tuple[str, Decimal]], total_expenses: Decimal,
) -> float:
    ROW_H = 20

    # Header row (blue background, white text)
    pdf.setFillColorRGB(*C_PRIMARY)
    pdf.rect(MARGIN, y - ROW_H, CONTENT_WIDTH, ROW_H, fill=1, stroke=0)
    pdf.setFillColorRGB(*C_WHITE)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(MARGIN + 6, y - 14, "Category")
    pdf.drawRightString(MARGIN + _COL_CAT + _COL_AMT - 6, y - 14, "Amount (RM)")
    pdf.drawRightString(MARGIN + CONTENT_WIDTH - 6, y - 14, "% of Total")
    y -= ROW_H

    if not breakdown:
        pdf.setFillColorRGB(*C_MUTED)
        pdf.setFont("Helvetica", 10)
        pdf.drawString(MARGIN + 6, y - 14, "No expenses recorded for this period.")
        return y - ROW_H

    for i, (name, amount) in enumerate(breakdown):
        pdf.setFillColorRGB(*(C_WHITE if i % 2 == 0 else C_ROW_ALT))
        pdf.rect(MARGIN, y - ROW_H, CONTENT_WIDTH, ROW_H, fill=1, stroke=0)

        percent = (amount / total_expenses * 100) if total_expenses else Decimal("0")

        pdf.setFillColorRGB(*C_TEXT)
        pdf.setFont("Helvetica", 10)
        pdf.drawString(MARGIN + 6, y - 14, name)
        pdf.drawRightString(MARGIN + _COL_CAT + _COL_AMT - 6, y - 14, f"{amount:,.2f}")
        pdf.setFillColorRGB(*C_MUTED)
        pdf.drawRightString(MARGIN + CONTENT_WIDTH - 6, y - 14, f"{percent:.1f}%")
        y -= ROW_H

    # Totals row
    pdf.setFillColorRGB(*C_SURFACE)
    pdf.rect(MARGIN, y - ROW_H, CONTENT_WIDTH, ROW_H, fill=1, stroke=0)
    pdf.setFillColorRGB(*C_TEXT)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(MARGIN + 6, y - 14, "Total")
    pdf.drawRightString(MARGIN + _COL_CAT + _COL_AMT - 6, y - 14, f"{total_expenses:,.2f}")
    pdf.setFillColorRGB(*C_MUTED)
    pdf.drawRightString(MARGIN + CONTENT_WIDTH - 6, y - 14, "100.0%")
    y -= ROW_H

    return y


# ─── Health score ────────────────────────────────────────────────────────────

def _draw_health_score(pdf: canvas.Canvas, y: float, score: Decimal | None) -> None:
    if score is None:
        pdf.setFillColorRGB(*C_MUTED)
        pdf.setFont("Helvetica", 11)
        pdf.drawString(MARGIN, y - 18, "No health score has been calculated for this period.")
        return

    value = float(score)
    color = C_SUCCESS if value >= 70 else (C_WARNING if value >= 50 else C_DANGER)
    verdict = (
        "Good standing" if value >= 70
        else ("Needs attention" if value >= 50 else "Action required")
    )

    BUBBLE_W, BUBBLE_H = 110, 58

    # Bubble background
    pdf.setFillColorRGB(*C_SURFACE)
    pdf.roundRect(MARGIN, y - BUBBLE_H, BUBBLE_W, BUBBLE_H, 8, fill=1, stroke=0)

    # Colored top accent
    pdf.setFillColorRGB(*color)
    pdf.roundRect(MARGIN, y - 4, BUBBLE_W, 4, 2, fill=1, stroke=0)

    # Score number
    pdf.setFillColorRGB(*color)
    pdf.setFont("Helvetica-Bold", 26)
    pdf.drawCentredString(MARGIN + BUBBLE_W / 2, y - 36, f"{value:.1f}")

    # "out of 100" caption
    pdf.setFillColorRGB(*C_MUTED)
    pdf.setFont("Helvetica", 9)
    pdf.drawCentredString(MARGIN + BUBBLE_W / 2, y - 50, "out of 100")

    # Verdict label beside the bubble
    pdf.setFillColorRGB(*color)
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(MARGIN + BUBBLE_W + 16, y - 28, verdict)
    pdf.setFillColorRGB(*C_MUTED)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(MARGIN + BUBBLE_W + 16, y - 42, "Average score for this month")


# ─── Footer ──────────────────────────────────────────────────────────────────

def _draw_footer(pdf: canvas.Canvas, year: int, month: int) -> None:
    y = 36
    pdf.setStrokeColorRGB(*C_MUTED)
    pdf.setLineWidth(0.5)
    pdf.line(MARGIN, y + 14, CONTENT_RIGHT, y + 14)
    pdf.setFillColorRGB(*C_MUTED)
    pdf.setFont("Helvetica", 8)
    pdf.drawString(MARGIN, y, f"Generated by MyRinggit  ·  {MONTH_NAMES[month]} {year} Report")
    pdf.drawRightString(CONTENT_RIGHT, y, f"Generated on {date.today().strftime('%d %b %Y')}")


# ─── Data queries (unchanged) ────────────────────────────────────────────────

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
