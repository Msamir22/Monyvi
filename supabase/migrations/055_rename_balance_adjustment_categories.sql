-- =============================================================================
-- Migration 055: Rename Balance Adjustment Categories
-- =============================================================================
-- Use one shared compact display name for internal balance-adjustment
-- categories while keeping income/expense behavior in the category type.
-- =============================================================================

UPDATE public.categories
SET
  display_name = 'Balance Adjustment',
  updated_at = now()
WHERE system_name IN ('balance_adjustment_income', 'balance_adjustment_expense')
  AND user_id IS NULL;
