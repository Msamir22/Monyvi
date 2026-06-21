ALTER TABLE public.bank_details
  ALTER COLUMN card_last_4 DROP NOT NULL;

ALTER TABLE public.bank_details
  ALTER COLUMN card_last_4 TYPE integer
  USING CASE
    WHEN card_last_4 IS NULL THEN NULL
    WHEN btrim(card_last_4) ~ '^[0-9]{1,4}$' THEN btrim(card_last_4)::integer
    ELSE NULL
  END;

ALTER TABLE public.bank_details
  ADD CONSTRAINT bank_details_card_last_4_range
  CHECK (
    card_last_4 IS NULL
    OR (card_last_4 >= 0 AND card_last_4 <= 9999)
  );
