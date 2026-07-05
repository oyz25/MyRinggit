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
-- criteria_type / criteria_value are evaluated by app/services/badge_service.py,
-- EXCEPT 'streak_days' which is awarded directly by app/services/streak_service.py
-- at the moment the streak is updated (see that file for why).
-- 'health_streak_weeks' is computed dynamically from health_scores history
-- by badge_service._compute_health_streak_weeks (no extra columns needed).
-- =============================================================================
INSERT INTO dbo.badges (name, description, icon, criteria_type, criteria_value) VALUES
    ('First Step',         'Logged your first expense',                               'shoe-prints', 'expenses_logged_count', 1),
    ('7-Day Streak',       'Logged an expense 7 days in a row',                       'fire',        'streak_days',            7),
    ('14-Day Streak',      'Logged an expense 14 days in a row',                      'fire',        'streak_days',           14),
    ('30-Day Streak',      'Logged an expense 30 days in a row',                      'trophy',      'streak_days',           30),
    ('Healthy Week',       'Maintained a 60+ Health Score for 1 week in a row',       'star',        'health_streak_weeks',    1),
    ('Healthy Fortnight',  'Maintained a 60+ Health Score for 2 weeks in a row',      'star',        'health_streak_weeks',    2),
    ('Healthy Month',      'Maintained a 60+ Health Score for 4 weeks in a row',      'trophy',      'health_streak_weeks',    4);
GO
