# Contract: SMS Account Matching

## Purpose

Define how saved provider identities and multiple sender values influence SMS
account matching.

## Inputs

- SMS sender display name.
- Optional card last four extracted from SMS body.
- Optional transaction currency.
- Current user's scoped active accounts.
- Active sender rows for those accounts.
- Optional bank details for bank accounts.
- Optional account-level provider identity and provider display text.

## Matching Order

1. Bank account with matching card last four and matching sender.
2. Account with matching sender from `account_sms_senders`.
3. Account name, provider display text, or known institution identity match
   where existing behavior already supports registry-based matching.
4. Existing default-account fallback behavior.

## Required Guarantees

- Wallet accounts can match by sender without a bank details row.
- Bank sender-plus-card matching remains higher confidence than sender-only.
- Sender values are trimmed and case-normalized for duplicate detection within
  one account.
- Soft-deleted sender rows are ignored.
- Sender matching is scoped to the current authenticated user's accounts.
- Sender matching reads from `account_sms_senders`; the legacy
  `bank_details.sms_sender_name` field is removed from the active model because
  the app is pre-production.
- Matching changes do not weaken SMS fingerprint deduplication for transactions
  or transfers.

## Acceptance Tests

- Multiple sender rows for one account each match the same account.
- Wallet sender row matches a wallet account.
- Sender plus card last four chooses the correct bank account.
- Unknown sender falls back through existing safe fallback behavior.
- Foreign-account sender rows do not influence matching.
- Deleted sender rows do not match.
