from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    admin,
    auth,
    badges,
    categories,
    dashboard,
    expenses,
    health_score,
    income,
    ptptn,
    reports,
)

app = FastAPI(title="MyRinggit API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(expenses.router, prefix="/api/expenses", tags=["Expenses"])
app.include_router(income.router, prefix="/api/income", tags=["Income"])
app.include_router(ptptn.router, prefix="/api/ptptn", tags=["PTPTN"])
app.include_router(health_score.router, prefix="/api/health-score", tags=["Health Score"])
app.include_router(badges.router, prefix="/api/badges", tags=["Badges"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
