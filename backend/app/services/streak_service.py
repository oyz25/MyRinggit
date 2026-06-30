"""
Tracks each student's expense-logging streak based on real submission time
(not the user-editable expense_date), converted to Malaysia time (UTC+8),
so the streak reflects actual daily engagement and can't be gamed by
backdating expenses.
"""

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.user import User

# Malaysia has a fixed UTC+8 offset with no DST, so a plain timezone offset
# is used instead of zoneinfo's "Asia/Kuala_Lumpur" - the IANA tzdata
# database isn't bundled with Python on Windows by default.
MALAYSIA_TZ = timezone(timedelta(hours=8))


def update_streak_on_expense_logged(db: Session, user: User) -> None:
    today_myt = datetime.now(MALAYSIA_TZ).date()

    if user.last_activity_date is None:
        user.current_streak = 1
    elif user.last_activity_date == today_myt:
        pass
    elif user.last_activity_date == today_myt - timedelta(days=1):
        user.current_streak += 1
    else:
        user.current_streak = 1

    user.last_activity_date = today_myt
    user.longest_streak = max(user.longest_streak, user.current_streak)
    db.commit()
