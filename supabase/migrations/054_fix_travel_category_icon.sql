-- =============================================================================
-- Migration 054: Fix Travel Category Icon
-- =============================================================================
-- Earlier icon normalization only targeted the level-1 travel category, leaving
-- another shared travel row with an emoji icon that Ionicons cannot render.
-- =============================================================================

UPDATE public.categories
SET
  icon = 'airplane',
  icon_library = 'Ionicons',
  updated_at = now()
WHERE system_name = 'travel'
  AND user_id IS NULL;
