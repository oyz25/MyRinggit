/**
 * Types for the MyRinggit API, mirroring the Pydantic schemas in
 * backend/app/schemas. FastAPI serializes `Decimal` as a string, `date` as
 * "YYYY-MM-DD" and `datetime` as an ISO 8601 string, so those are typed as
 * `DecimalString` / `string`.
 */

export type DecimalString = string;

export type CategoryType = "income" | "expense";

// ─── Auth / users ───────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  university: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  university: string | null;
  is_active: boolean;
  current_streak: number;
  longest_streak: number;
  created_at: string;
}

// ─── Categories ─────────────────────────────────────────────────────────────

export interface Category {
  category_id: number;
  name: string;
  type: string;
  icon: string | null;
  is_default: boolean;
  created_by: number | null;
}

export interface CategoryCreate {
  name: string;
  type: string;
}

export interface CategoryLimitAlert {
  category_id: number;
  monthly_limit: DecimalString;
  spent_so_far: DecimalString;
  percent_used: DecimalString;
  is_over_threshold: boolean;
  is_over_limit: boolean;
}

// ─── Badges ─────────────────────────────────────────────────────────────────

export interface Badge {
  badge_id: number;
  name: string;
  description: string | null;
  icon: string | null;
  criteria_type: string;
  criteria_value: DecimalString;
}

export interface UserBadge {
  badge_id: number;
  name: string;
  description: string | null;
  icon: string | null;
  earned_at: string;
}

// ─── Expenses ───────────────────────────────────────────────────────────────

export interface Expense {
  expense_id: number;
  category_id: number;
  amount: DecimalString;
  description: string | null;
  expense_date: string;
}

export interface ExpensePayload {
  category_id: number;
  amount: string;
  description: string | null;
  expense_date: string;
}

export interface ExpenseCreateResponse extends Expense {
  alerts: CategoryLimitAlert[];
  new_badges: Badge[];
}

export interface ExpenseDayTotal {
  date: string;
  total_amount: DecimalString;
}

// ─── Income ─────────────────────────────────────────────────────────────────

export interface Income {
  income_id: number;
  category_id: number | null;
  amount: DecimalString;
  source: string | null;
  description: string | null;
  income_date: string;
}

export interface IncomePayload {
  category_id: number | null;
  amount: string;
  source: string | null;
  description: string | null;
  income_date: string;
}

export interface IncomeCreateResponse extends Income {
  new_badges: Badge[];
}

// ─── PTPTN ──────────────────────────────────────────────────────────────────

export interface PtptnDisbursement {
  disbursement_id: number;
  budget_id: number | null;
  amount: DecimalString;
  total_semester_tuition: DecimalString;
  disbursement_date: string;
  remarks: string | null;
}

export interface PtptnPayload {
  amount: string;
  total_semester_tuition: string;
  disbursement_date: string;
  remarks: string | null;
}

// ─── Health score ───────────────────────────────────────────────────────────

export interface HealthScore {
  health_score_id: number;
  week_start_date: string;
  week_end_date: string;
  savings_rate: DecimalString;
  budget_adherence_score: DecimalString;
  consistency_score: DecimalString;
  overall_score: DecimalString;
  calculated_at: string;
}

export interface HealthScoreRecalculateResponse extends HealthScore {
  new_badges: Badge[];
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface CategoryBreakdown {
  category_name: string;
  total_amount: DecimalString;
}

export interface DashboardSummary {
  total_income: DecimalString;
  total_expenses: DecimalString;
  net_balance: DecimalString;
  expense_breakdown: CategoryBreakdown[];
  overall_health_score: DecimalString | null;
}

export interface LivingExpenseCountdown {
  living_income: DecimalString;
  living_expenses: DecimalString;
  remaining_balance: DecimalString;
  average_daily_living_spend: DecimalString;
  estimated_days_remaining: number | null;
  estimated_runout_date: string | null;
  message: string | null;
}