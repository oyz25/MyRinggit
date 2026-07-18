MyRinggit

A full-stack student finance management system built for Malaysian university students, with a focus on helping recipients of the PTPTN loan track and manage their disbursements responsibly.

Final Year Project (FYP) — Diploma in Information Technology, SEGi College Kota Damansara.

## About

Managing a PTPTN disbursement is harder than it sounds — the money has to stretch across tuition and living costs for an entire semester, and it's easy to lose track of how much is actually left. 
MyRinggit was built to solve that problem directly, with budgeting and tracking tools designed around how Malaysian students actually receive and spend their loan money.

## Key Features

- **PTPTN Two-Pool Tracking** — separates tuition and living expense funds so students always know what's available for daily spending versus what's reserved for fees
- **Semester-Based Budgeting** — budgets structured around the academic semester, not just the calendar month
- **Survival Countdown** — shows how many days of funds remain at the current spending rate
- **Spending Alerts** — proactive warnings before a budget category is overspent
- **Weekly Financial Health Score** — a composite score combining savings rate (40%), budget adherence (40%), and consistency (20%)
- **Streak Tracking with Anti-Cheat Design** — streaks are validated using server submission time rather than the user-entered expense date, preventing retroactive logging abuse
- **Badges & Achievements** — rewards tied to real financial behaviour (saving streaks, budget adherence) rather than trivial actions
- **Spending Heatmap** — visualizes spending patterns over time
- **PDF Report Export** — generate downloadable financial summaries

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Frontend | HTML, CSS, JavaScript, Chart.js |
| Database | Microsoft SQL Server 2022 |
| Auth | JWT with Role-Based Access Control (RBAC) |
| Reporting | ReportLab (PDF generation) |

## Getting Started

### Prerequisites
- Python 3.10+
- Microsoft SQL Server 2022
- Node.js (if applicable to frontend tooling)

### Installation

```bash
# Clone the repository
git clone https://github.com/Apples00/MyRinggit.git
cd MyRinggit

# Install backend dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# then fill in your SQL Server connection string and JWT secret

# Run database migrations / setup
# (add your specific migration command here)

# Start the server
uvicorn main:app --reload
```

Visit `http://localhost:8000` to view the app.

## Project Methodology

This project was developed using **Agile Scrum**, structured around a 12-week Gantt chart, with iterative development and regular check-ins with the project supervisor.

## Author

Developed by OYZ as a Final Year Project

## License
