-- =============================================================================
-- Migration 053: Fix Balance Adjustment Categories
-- Issue: #554
-- =============================================================================
-- Balance adjustment categories were seeded with invalid icon values and labels
-- that are too long for compact account transaction rows.
-- =============================================================================

UPDATE public.categories
SET
  display_name = 'Adj. Income',
  icon = 'trending-up',
  icon_library = 'Ionicons',
  updated_at = now()
WHERE system_name = 'balance_adjustment_income'
  AND user_id IS NULL;

UPDATE public.categories
SET
  display_name = 'Adj. Expense',
  icon = 'trending-down',
  icon_library = 'Ionicons',
  updated_at = now()
WHERE system_name = 'balance_adjustment_expense'
  AND user_id IS NULL;
