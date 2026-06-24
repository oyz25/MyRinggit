-- =============================================================================
-- MyRinggit - Student Finance Management System
-- SQL Server Database Schema
-- Run this script in SSMS (SQL Server Management Studio)
-- =============================================================================

IF DB_ID('myringgit_db') IS NULL
BEGIN
    CREATE DATABASE myringgit_db;
END
GO

USE myringgit_db;
GO

-- Drop tables in dependency order (children first) so this script can be re-run during development
IF OBJECT_ID('dbo.user_badges', 'U') IS NOT NULL DROP TABLE dbo.user_badges;
IF OBJECT_ID('dbo.badges', 'U') IS NOT NULL DROP TABLE dbo.badges;
IF OBJECT_ID('dbo.health_scores', 'U') IS NOT NULL DROP TABLE dbo.health_scores;
IF OBJECT_ID('dbo.category_limits', 'U') IS NOT NULL DROP TABLE dbo.category_limits;
IF OBJECT_ID('dbo.ptptn_disbursements', 'U') IS NOT NULL DROP TABLE dbo.ptptn_disbursements;
IF OBJECT_ID('dbo.expenses', 'U') IS NOT NULL DROP TABLE dbo.expenses;
IF OBJECT_ID('dbo.income', 'U') IS NOT NULL DROP TABLE dbo.income;
IF OBJECT_ID('dbo.budgets', 'U') IS NOT NULL DROP TABLE dbo.budgets;
IF OBJECT_ID('dbo.categories', 'U') IS NOT NULL DROP TABLE dbo.categories;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
GO

-- =============================================================================
-- 1. users
-- Stores both Student and Admin accounts
-- =============================================================================
CREATE TABLE dbo.users (
    user_id         INT IDENTITY(1,1)   PRIMARY KEY,
    full_name       NVARCHAR(100)       NOT NULL,
    email           NVARCHAR(150)       NOT NULL UNIQUE,
    password_hash   NVARCHAR(255)       NOT NULL,
    role            NVARCHAR(20)        NOT NULL CONSTRAINT DF_users_role DEFAULT ('student'),
    university      NVARCHAR(150)       NULL,
    is_active       BIT                 NOT NULL CONSTRAINT DF_users_is_active DEFAULT (1),
    created_at      DATETIME2           NOT NULL CONSTRAINT DF_users_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at      DATETIME2           NULL,
    CONSTRAINT CK_users_role CHECK (role IN ('student', 'admin'))
);
GO

-- =============================================================================
-- 2. categories
-- Shared catalog of expense/income categories. System defaults have created_by = NULL;
-- students may add their own custom categories.
-- =============================================================================
CREATE TABLE dbo.categories (
    category_id     INT IDENTITY(1,1)   PRIMARY KEY,
    name            NVARCHAR(50)        NOT NULL,
    type            NVARCHAR(10)        NOT NULL,
    icon            NVARCHAR(50)        NULL,
    is_default      BIT                 NOT NULL CONSTRAINT DF_categories_is_default DEFAULT (0),
    created_by      INT                 NULL,
    created_at      DATETIME2           NOT NULL CONSTRAINT DF_categories_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_categories_type CHECK (type IN ('expense', 'income')),
    CONSTRAINT FK_categories_created_by FOREIGN KEY (created_by) REFERENCES dbo.users(user_id) ON DELETE SET NULL,
    CONSTRAINT UQ_categories_name_type_owner UNIQUE (name, type, created_by)
);
GO

-- =============================================================================
-- 3. budgets
-- Semester-based budget envelope per student (drives the survival countdown)
-- =============================================================================
CREATE TABLE dbo.budgets (
    budget_id       INT IDENTITY(1,1)   PRIMARY KEY,
    user_id         INT                 NOT NULL,
    semester_name   NVARCHAR(50)        NOT NULL,
    start_date      DATE                NOT NULL,
    end_date        DATE                NOT NULL,
    total_budget    DECIMAL(10,2)       NOT NULL CONSTRAINT DF_budgets_total DEFAULT (0),
    created_at      DATETIME2           NOT NULL CONSTRAINT DF_budgets_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at      DATETIME2           NULL,
    CONSTRAINT FK_budgets_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT CK_budgets_dates CHECK (end_date > start_date)
);
GO

-- =============================================================================
-- 4. income
-- Daily income records (allowances, part-time work, PTPTN credits, etc.)
-- =============================================================================
CREATE TABLE dbo.income (
    income_id       INT IDENTITY(1,1)   PRIMARY KEY,
    user_id         INT                 NOT NULL,
    category_id     INT                 NULL,
    amount          DECIMAL(10,2)       NOT NULL CONSTRAINT DF_income_amount DEFAULT (0),
    source          NVARCHAR(100)       NULL,
    description     NVARCHAR(255)       NULL,
    income_date     DATE                NOT NULL,
    created_at      DATETIME2           NOT NULL CONSTRAINT DF_income_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_income_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_income_category FOREIGN KEY (category_id) REFERENCES dbo.categories(category_id) ON DELETE SET NULL,
    CONSTRAINT CK_income_amount CHECK (amount >= 0)
);
GO

-- =============================================================================
-- 5. expenses
-- Daily expense records, categorised for spending analysis and limit alerts
-- =============================================================================
CREATE TABLE dbo.expenses (
    expense_id      INT IDENTITY(1,1)   PRIMARY KEY,
    user_id         INT                 NOT NULL,
    category_id     INT                 NOT NULL,
    amount          DECIMAL(10,2)       NOT NULL CONSTRAINT DF_expenses_amount DEFAULT (0),
    description     NVARCHAR(255)       NULL,
    expense_date    DATE                NOT NULL,
    created_at      DATETIME2           NOT NULL CONSTRAINT DF_expenses_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_expenses_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_expenses_category FOREIGN KEY (category_id) REFERENCES dbo.categories(category_id),
    CONSTRAINT CK_expenses_amount CHECK (amount >= 0)
);
GO

-- =============================================================================
-- 6. ptptn_disbursements
-- Each PTPTN/loan disbursement as its own row -> supports history across
-- semesters and feeds the survival countdown calculation
-- =============================================================================
CREATE TABLE dbo.ptptn_disbursements (
    disbursement_id     INT IDENTITY(1,1)   PRIMARY KEY,
    user_id             INT                 NOT NULL,
    budget_id           INT                 NULL,
    amount              DECIMAL(10,2)       NOT NULL,
    disbursement_date   DATE                NOT NULL,
    expected_next_date  DATE                NULL,
    remarks             NVARCHAR(255)       NULL,
    created_at          DATETIME2           NOT NULL CONSTRAINT DF_ptptn_created_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_ptptn_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE NO ACTION,
    CONSTRAINT FK_ptptn_budget FOREIGN KEY (budget_id) REFERENCES dbo.budgets(budget_id) ON DELETE SET NULL,
    CONSTRAINT CK_ptptn_amount CHECK (amount >= 0)
);
GO

-- =============================================================================
-- 7. category_limits
-- Per-student, per-category monthly spending limit -> drives "Spending Limit Alert"
-- =============================================================================
CREATE TABLE dbo.category_limits (
    limit_id                INT IDENTITY(1,1)   PRIMARY KEY,
    user_id                 INT                 NOT NULL,
    category_id             INT                 NOT NULL,
    monthly_limit           DECIMAL(10,2)       NOT NULL,
    alert_threshold_percent DECIMAL(5,2)        NOT NULL CONSTRAINT DF_category_limits_threshold DEFAULT (80.00),
    created_at              DATETIME2           NOT NULL CONSTRAINT DF_category_limits_created_at DEFAULT (SYSUTCDATETIME()),
    updated_at              DATETIME2           NULL,
    CONSTRAINT FK_category_limits_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_category_limits_category FOREIGN KEY (category_id) REFERENCES dbo.categories(category_id) ON DELETE CASCADE,
    CONSTRAINT UQ_category_limits_user_category UNIQUE (user_id, category_id),
    CONSTRAINT CK_category_limits_amount CHECK (monthly_limit >= 0)
);
GO

-- =============================================================================
-- 8. health_scores
-- Weekly Financial Health Score snapshot per student (math-based, no AI)
-- =============================================================================
CREATE TABLE dbo.health_scores (
    health_score_id         INT IDENTITY(1,1)   PRIMARY KEY,
    user_id                 INT                 NOT NULL,
    week_start_date         DATE                NOT NULL,
    week_end_date           DATE                NOT NULL,
    savings_rate            DECIMAL(5,2)        NOT NULL CONSTRAINT DF_health_savings DEFAULT (0),
    budget_adherence_score  DECIMAL(5,2)        NOT NULL CONSTRAINT DF_health_adherence DEFAULT (0),
    consistency_score       DECIMAL(5,2)        NOT NULL CONSTRAINT DF_health_consistency DEFAULT (0),
    overall_score           DECIMAL(5,2)        NOT NULL CONSTRAINT DF_health_overall DEFAULT (0),
    calculated_at           DATETIME2           NOT NULL CONSTRAINT DF_health_calculated_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_health_scores_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT UQ_health_scores_user_week UNIQUE (user_id, week_start_date),
    CONSTRAINT CK_health_scores_dates CHECK (week_end_date > week_start_date)
);
GO

-- =============================================================================
-- 9. badges
-- Catalog of all possible badges/achievements and the criteria to earn them
-- =============================================================================
CREATE TABLE dbo.badges (
    badge_id        INT IDENTITY(1,1)   PRIMARY KEY,
    name            NVARCHAR(100)       NOT NULL UNIQUE,
    description     NVARCHAR(255)       NULL,
    icon            NVARCHAR(100)       NULL,
    criteria_type   NVARCHAR(50)        NOT NULL,
    criteria_value  DECIMAL(10,2)       NOT NULL CONSTRAINT DF_badges_criteria_value DEFAULT (0),
    created_at      DATETIME2           NOT NULL CONSTRAINT DF_badges_created_at DEFAULT (SYSUTCDATETIME())
);
GO

-- =============================================================================
-- 10. user_badges
-- Join table recording which student earned which badge and when
-- =============================================================================
CREATE TABLE dbo.user_badges (
    user_badge_id   INT IDENTITY(1,1)   PRIMARY KEY,
    user_id         INT                 NOT NULL,
    badge_id        INT                 NOT NULL,
    earned_at       DATETIME2           NOT NULL CONSTRAINT DF_user_badges_earned_at DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_user_badges_user FOREIGN KEY (user_id) REFERENCES dbo.users(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_user_badges_badge FOREIGN KEY (badge_id) REFERENCES dbo.badges(badge_id) ON DELETE CASCADE,
    CONSTRAINT UQ_user_badges_user_badge UNIQUE (user_id, badge_id)
);
GO

-- =============================================================================
-- Helpful indexes for common lookups (date-range queries, dashboards, alerts)
-- =============================================================================
CREATE INDEX IX_expenses_user_date        ON dbo.expenses (user_id, expense_date);
CREATE INDEX IX_income_user_date          ON dbo.income (user_id, income_date);
CREATE INDEX IX_ptptn_user_date           ON dbo.ptptn_disbursements (user_id, disbursement_date);
CREATE INDEX IX_health_scores_user_week   ON dbo.health_scores (user_id, week_start_date);
GO
