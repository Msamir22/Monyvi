-- Move bank/wallet provider identity to accounts and SMS senders to child rows.
-- Monyvi is pre-production, so legacy bank_details provider/sender columns can
-- be removed from active remote schema without a production backfill.

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS institution_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_display_name TEXT;

DROP INDEX IF EXISTS public.idx_accounts_unique_name_currency;
DROP INDEX IF EXISTS public.idx_accounts_unique_known_provider;
DROP INDEX IF EXISTS public.idx_accounts_unique_manual_provider;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT user_id, lower(name), currency
      FROM public.accounts
      WHERE deleted = false
        AND institution_id IS NULL
      GROUP BY user_id, lower(name), currency
      HAVING count(*) > 1
    ) duplicate_manual_accounts
  ) THEN
    RAISE EXCEPTION 'Cannot create manual account uniqueness index while duplicate active manual accounts exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_unique_known_provider
  ON public.accounts (user_id, lower(name), currency, institution_id)
  WHERE deleted = false AND institution_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_unique_manual_provider
  ON public.accounts (user_id, lower(name), currency)
  WHERE deleted = false AND institution_id IS NULL;

CREATE TABLE IF NOT EXISTS public.account_sms_senders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  normalized_sender_name TEXT NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_account_sms_senders_account_id
  ON public.account_sms_senders (account_id);

CREATE INDEX IF NOT EXISTS idx_account_sms_senders_normalized
  ON public.account_sms_senders (normalized_sender_name)
  WHERE deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_account_sms_senders_unique_active_normalized
  ON public.account_sms_senders (account_id, normalized_sender_name)
  WHERE deleted = false;

ALTER TABLE public.account_sms_senders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own account sms senders" ON public.account_sms_senders;
DROP POLICY IF EXISTS "Users can insert own account sms senders" ON public.account_sms_senders;
DROP POLICY IF EXISTS "Users can update own account sms senders" ON public.account_sms_senders;
DROP POLICY IF EXISTS "Users can delete own account sms senders" ON public.account_sms_senders;

CREATE POLICY "Users can view own account sms senders" ON public.account_sms_senders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.accounts WHERE accounts.id = account_sms_senders.account_id AND accounts.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can insert own account sms senders" ON public.account_sms_senders
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.accounts WHERE accounts.id = account_sms_senders.account_id AND accounts.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can update own account sms senders" ON public.account_sms_senders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.accounts WHERE accounts.id = account_sms_senders.account_id AND accounts.user_id = (SELECT auth.uid()))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.accounts WHERE accounts.id = account_sms_senders.account_id AND accounts.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Users can delete own account sms senders" ON public.account_sms_senders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.accounts WHERE accounts.id = account_sms_senders.account_id AND accounts.user_id = (SELECT auth.uid()))
  );

DROP TRIGGER IF EXISTS handle_account_sms_senders_updated_at ON public.account_sms_senders;
CREATE TRIGGER handle_account_sms_senders_updated_at
  BEFORE UPDATE ON public.account_sms_senders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.bank_details
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS sms_sender_name;
