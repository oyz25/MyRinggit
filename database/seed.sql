-- =============================================================================
-- seed.sql
-- Default categories available to every student (is_default = 1, created_by = NULL)
-- Run after schema.sql
-- =============================================================================
USE myringgit_db;
GO

-- =============================================================================
-- Expense categories
-- =============================================================================
INSERT INTO dbo.categories (name, type, icon, is_default, created_by) VALUES
    ('Food',          'expense', 'utensils',      1, NULL),
    ('Transport',     'expense', 'bus',           1, NULL),
    ('Rent',          'expense', 'home',          1, NULL),
    ('Education',     'expense', 'book',          1, NULL),
    ('Entertainment', 'expense', 'film',          1, NULL),
    ('Utilities',     'expense', 'bolt',          1, NULL),
    ('Groceries',     'expense', 'shopping-cart', 1, NULL),
    ('Health',        'expense', 'heart-pulse',   1, NULL),
    ('Shopping',      'expense', 'bag-shopping',  1, NULL),
    ('Others',        'expense', 'ellipsis',      1, NULL);
GO

-- =============================================================================
-- Income categories
-- =============================================================================
INSERT INTO dbo.categories (name, type, icon, is_default, created_by) VALUES
    ('Allowance',     'income', 'wallet',         1, NULL),
    ('PTPTN',         'income', 'graduation-cap', 1, NULL),
    ('Scholarship',   'income', 'award',          1, NULL),
    ('Part-time Job', 'income', 'briefcase',      1, NULL),
    ('Others',        'income', 'ellipsis',       1, NULL);
GO

-- =============================================================================
-- Badge catalog
-- criteria_type / criteria_value are evaluated by app/services/badge_service.py
-- =============================================================================
INSERT INTO dbo.badges (name, description, icon, criteria_type, criteria_value) VALUES
    ('First Step',      'Logged your first expense',                'shoe-prints',     'expenses_logged_count',    1),
    ('Habit Builder',   'Logged 10 expenses',                        'repeat',          'expenses_logged_count',    10),
    ('Tracking Pro',    'Logged 50 expenses',                        'medal',           'expenses_logged_count',    50),
    ('First Income',    'Logged your first income',                  'coins',           'income_logged_count',      1),
    ('Financially Fit', 'Reached a financial health score of 70+',   'heart-pulse',     'health_score_above',       70),
    ('Money Master',    'Reached a financial health score of 90+',   'crown',           'health_score_above',       90),
    ('Super Saver',     'Achieved a savings rate score of 70+',      'piggy-bank',      'savings_rate_above',       70),
    ('Daily Tracker',   'Logged activity every day for a week',      'calendar-check',  'consistency_score_above',  100),
    ('On Budget',       'Stayed within budget for a full week',      'scale-balanced',  'budget_adherence_above',   100);
GO
