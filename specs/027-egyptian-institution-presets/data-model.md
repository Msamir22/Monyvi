# Data Model: Egyptian Institution Presets

## EgyptianFinancialInstitution

**Layer**: `packages/logic`

Represents one canonical bank, wallet provider, or non-selectable financial
sender identity in Egypt.

**Fields**:

- `id`: stable literal registry ID, for example `cib`, `nbe`, `vodafone-cash`.
- `type`: institution kind. Selectable account providers are `bank` or `wallet`;
  other internal sender classes may exist only when approved by spec.
- `shortName`: primary short display name.
- `fullName`: current official or public full name.
- `nameAr`: Arabic display name when available.
- `senderPatterns`: verified sender aliases used for filtering and matching.
- `selectable`: whether this institution can appear in account provider
  dropdowns.
- `legacyIds`: prior identities or aliases retained for matching/display
  migration decisions.
- `auditStatus`: included, excluded, renamed, legacy-only, or pending audit.
- `auditNote`: short reason/source note for inclusion/exclusion decisions.

**Validation rules**:

- `id` is unique and never derived from mutable display names.
- `senderPatterns` are normalized for case-insensitive matching.
- Selectable `bank` entries appear only in the bank dropdown.
- Selectable `wallet` entries appear only in the wallet dropdown.
- InstaPay/IPN are not entries for this feature.

## Account

**Layer**: `packages/db`

Existing spendable account entity.

**New/changed fields**:

- `institution_id`: nullable string. Holds the stable registry ID for known
  bank/wallet selections. Null for Cash, Other/manual providers, and
  non-Egypt-context free-text accounts.
- `provider_display_name`: nullable string. Holds the saved provider display
  text for manual/Other providers and the selected provider short name snapshot
  for known providers. When `institution_id` is present, current display
  metadata should be resolved from the logic registry; this field preserves the
  user's saved display text and supports manual wallets.

**Relationships**:

- Has many `AccountSmsSender` rows.
- Has zero or one active `BankDetails` row for bank-specific card/account
  metadata.

**Validation rules**:

- `institution_id` is optional and must never use an empty string fallback.
- `institution_id` may be set for `BANK` and `DIGITAL_WALLET`.
- `institution_id` should be null for `CASH`.
- `provider_display_name` is optional for bank and wallet accounts. When a
  manual/Other provider name is entered, it participates in duplicate detection
  after trimming and case-normalization.
- `provider_display_name` must not replace the registry as the source of truth
  when `institution_id` is present.
- For known providers, account name uniqueness is scoped by user, currency, and
  `institution_id`.
- For manual/Other providers where `institution_id` is null and
  `provider_display_name` is present, account uniqueness is scoped by user,
  currency, account name, and normalized provider display name. If provider
  display name is absent, uniqueness falls back to user, currency, and account
  name.
- Account ownership remains scoped by `user_id`.

## AccountSmsSender

**Layer**: `packages/db`

Stores one SMS sender value for one account.

**Fields**:

- `id`: WatermelonDB/Supabase row ID.
- `account_id`: parent account ID.
- `sender_name`: user-visible sender value.
- `normalized_sender_name`: normalized sender for duplicate checks and matching.
- `created_at`: sync timestamp.
- `updated_at`: sync timestamp.
- `deleted`: soft-delete flag.

**Relationships**:

- Belongs to `Account` through `account_id`.
- Ownership is inherited through the parent account.

**Validation rules**:

- `sender_name` must not be empty after trimming.
- `normalized_sender_name` must be unique per active account.
- Duplicate input chips collapse or surface a user-friendly validation message.
- Soft-deleted sender rows do not participate in matching.
- Because the app is pre-production, no legacy `bank_details.sms_sender_name`
  backfill is required.

## BankDetails

**Layer**: `packages/db`

Existing child row for bank-specific metadata.

**Fields retained**:

- `card_last_4`: optional card matching helper.
- `account_number`: optional account identifier.

**Fields removed from active model**:

- `bank_name`: replaced by account-level `provider_display_name` so provider
  display works for both banks and wallets.
- `sms_sender_name`: replaced by `AccountSmsSender` rows.

**Validation rules**:

- Active one-row-per-account invariant remains.
- Card last four remains bank-specific.
- Wallet sender matching must not require a `BankDetails` row.
- Bank provider display must come from `accounts.provider_display_name` or the
  registry record for `accounts.institution_id`, not from `BankDetails`.

## InstitutionAsset

**Layer**: `apps/mobile`

Mobile-only visual identity for selectable known providers.

**Fields**:

- `institutionId`: stable registry ID.
- `logo`: local bundled image asset reference.
- `fallbackIcon`: default bank or wallet icon for missing/manual cases.
- `kind`: bank or wallet.

**Validation rules**:

- Asset coverage is exhaustive for selectable registry IDs.
- Assets are local and available offline.
- Manual providers use default account-type fallback icons.

## AccountProviderFormState

**Layer**: `apps/mobile/hooks`

Form state for account create/edit provider metadata.

**Fields**:

- `institutionId`: `string | null`, selected known provider ID or null.
- `providerName`: text shown/saved for manual provider display.
- `senderNames`: array of custom chip values. For known providers, registry
  sender defaults are resolved by `institutionId` and are not stored as editable
  chips.
- `isKnownProvider`: derived from `institutionId !== null`.
- `isSenderUnverified`: derived per chip when sender is not in selected provider
  aliases.

**Validation rules**:

- Missing IDs use `null`, never `""`.
- Sender chips trim whitespace and reject empty values.
- Unknown sender values are allowed with an unverified hint.
- Switching from known provider to Other clears known provider identity.
- Switching from Other to known provider applies provider identity only after
  explicit selection; registry sender presets stay internal and custom sender
  chips start empty.
- In the new account flow, switching between Bank and Digital Wallet clears
  provider identity, provider display text, and sender chips.
- In the edit flow, account type is immutable, so Bank/Digital Wallet switching
  does not apply.
