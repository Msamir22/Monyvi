-- Enforce one active bank_details row per account.
-- Monyvi is pre-production, so legacy duplicate active rows are hard-deleted.

WITH ranked_bank_details AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY account_id
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM public.bank_details
  WHERE deleted IS DISTINCT FROM true
)
DELETE FROM public.bank_details AS bank_details
USING ranked_bank_details
WHERE bank_details.id = ranked_bank_details.id
  AND ranked_bank_details.duplicate_rank > 1;

CREATE UNIQUE INDEX idx_bank_details_one_active_per_account
  ON public.bank_details (account_id)
  WHERE deleted IS DISTINCT FROM true;
