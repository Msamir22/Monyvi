-- =============================================================================
-- Migration 007: Make market_rates fields non-nullable
-- Description: Make market_rates fields non-nullable
-- =============================================================================

DO $$
DECLARE
  rate_column text;
BEGIN
  FOREACH rate_column IN ARRAY ARRAY[
    'silver_egp_per_gram',
    'usd_egp',
    'gold_egp_per_gram',
    'eur_egp',
    'silver_usd_per_gram',
    'egp_usd',
    'gold_usd_per_gram',
    'eur_usd'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'market_rates'
        AND column_name = rate_column
    ) THEN
      EXECUTE format(
        'UPDATE public.market_rates SET %I = COALESCE(%I, 0)',
        rate_column,
        rate_column
      );
      EXECUTE format(
        'ALTER TABLE public.market_rates ALTER COLUMN %I SET NOT NULL',
        rate_column
      );
    END IF;
  END LOOP;
END $$;

UPDATE public.market_rates
SET created_at = COALESCE(created_at, NOW());

ALTER TABLE public.market_rates
ALTER COLUMN created_at SET NOT NULL;
