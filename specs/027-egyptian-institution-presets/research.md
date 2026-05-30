# Research: Egyptian Institution Presets

## Decision: Expand the existing registry into a typed institution catalog

**Decision**: Keep `packages/logic/src/parsers/egyptian-bank-registry.ts` as the
single source of truth, but promote its entries from sender-pattern-only
metadata into stable institution records with IDs, provider type, selectable
status, display names, Arabic names where available, and sender aliases.

**Rationale**: The registry is already the SMS filtering source. Extending it
keeps parsing, dropdown options, and sender presets aligned while preserving
`packages/logic` as the pure shared domain layer.

**Alternatives considered**:

- Mobile-only bank/wallet constants: rejected because it creates a second source
  of truth.
- DB seed table for institutions: rejected for this release because provider
  metadata is static, should work offline before sync, and must also be used by
  shared parser logic.

## Decision: Use stable registry IDs for known provider selections

**Decision**: Known bank/wallet selections save a stable registry ID such as
`cib` or `vodafone-cash` on the account plus provider display text. Manual/Other
providers keep no known-provider ID but still save the free-text provider
display name on the account.

**Rationale**: The stable ID lets mobile resolve logos and current registry
metadata without guessing from user-entered text, while the display field gives
wallets and manual/Other providers a place to persist the user's provider name.
This mirrors an Angular select control where the option value is a stable ID and
the label is presentation.

**Alternatives considered**:

- Save only text display names: rejected because renames and user edits make
  logo/display lookup fragile.
- Save only sender names: rejected because sender metadata is not enough to
  drive account-card branding or provider selection state.
- Reuse account name for provider display: rejected because account name is the
  user's account label and may be different from the bank or wallet provider.

## Decision: Add normalized account sender rows

**Decision**: Add an `account_sms_senders` child table for multiple sender names
per account, owned through the parent account. Remove the active use of
`bank_details.sms_sender_name`; no legacy backfill is required because the app
is pre-production.

**Rationale**: One institution can have multiple SMS senders. Normalized rows
are easier to validate, deduplicate, index, and scope than comma-separated
strings.

**Alternatives considered**:

- Comma-separated string: rejected because it hides validation errors and makes
  matching less reliable.
- JSON array column on accounts: rejected because matching/indexing and conflict
  behavior are less explicit than child rows.
- Move one `sms_sender_name` field to accounts: rejected because it still does
  not model multiple senders.

## Decision: Keep bank_details for bank-only metadata

**Decision**: Keep `bank_details` only for bank-specific card/account metadata:
card last four and optional account number. Provider display moves to
`accounts.provider_display_name`; sender ownership moves to the new multi-sender
rows.

**Rationale**: Card last four is bank/card-specific and does not apply to most
wallets. Provider name and sender values are no longer bank-only concepts, so
they belong outside `bank_details`.

**Alternatives considered**:

- Rename `bank_details` to a generic institution details table: rejected for
  this feature because it increases migration/sync risk without adding user
  value.
- Keep `bank_details.bank_name`: rejected because it overlaps with account-level
  provider display and would create two provider-name sources for bank accounts.

## Decision: Make known-provider account uniqueness provider-aware

**Decision**: For known providers, account uniqueness is scoped by user, account
name, currency, and `institution_id`. For manual/Other providers where
`institution_id` is null, keep the existing name-and-currency uniqueness
behavior. Manual free-text provider names do not participate in duplicate
checking.

**Rationale**: A user may reasonably have two accounts with the same nickname
and currency at different known providers. The provider identity disambiguates
those accounts. Manual providers do not have a stable identity, so allowing
duplicates there would make accidental duplicate accounts too easy.

**Alternatives considered**:

- Keep uniqueness as name plus currency for every account: rejected because it
  blocks valid same-nickname accounts at different known providers.
- Use provider display text for all uniqueness: rejected because display text is
  editable, localized, and less stable than the registry ID.

## Decision: Known-provider display resolves from the registry

**Decision**: Accounts with `institution_id` display the current registry
metadata and logo for that ID. `provider_display_name` is retained as the saved
snapshot/fallback, especially for manual/Other providers.

**Rationale**: Renames such as Bank NXT, KFH Egypt, and QNB Egypt should become
visible through registry updates without per-account migrations. The account's
provider display snapshot still gives manual accounts a display name and gives
known-provider accounts a fallback if registry metadata is temporarily
unavailable.

**Alternatives considered**:

- Always display the saved provider snapshot: rejected because current provider
  names would stay stale after registry rename updates.
- Display both current and saved provider names when they differ: rejected for
  this feature because it adds UI complexity without a current user need.

## Decision: Shared provider-and-senders UI for banks and wallets

**Decision**: Sender chips live in a shared provider-and-senders section used by
both Bank and Digital Wallet account types. Bank card/account-number fields
remain bank-only. In the new account flow, switching between Bank and Digital
Wallet clears provider identity, provider display text, and sender chips. Edit
flow does not support account type changes.

**Rationale**: Sender metadata is useful for wallets as well as banks, so it
should not remain inside a bank-only details section. Clearing state on account
type switching prevents bank presets from silently carrying into wallet setup or
the reverse.

**Alternatives considered**:

- Keep senders inside `BankDetailsSection`: rejected because wallets need sender
  metadata and should not depend on bank-only card details.
- Preserve sender chips when account type changes: rejected because sender
  aliases are provider-specific.

## Decision: Bundle logo assets locally

**Decision**: Provider logos live as local mobile assets with a mobile-side
exhaustive asset map keyed by selectable registry IDs. Manual providers use
default bank/wallet icons.

**Rationale**: Account setup and account cards must render offline and must not
wait on remote image URLs. Exhaustive coverage prevents adding a selectable
provider without visual identity.

**Alternatives considered**:

- Remote logo URLs: rejected due to offline-first UX and runtime performance.
- Generic icons for all providers: rejected because the issue requires provider
  logos for known banks/wallets.

## Decision: Eligibility uses preferred currency or runtime Egypt region

**Decision**: Egyptian provider presets show when preferred currency is EGP or
runtime/device region resolves to Egypt. No new profile region field is planned
for this feature.

**Rationale**: The existing app already uses preferred currency and timezone
signals. Adding a profile region setting would expand product scope and is not
needed for the specified behavior.

**Alternatives considered**:

- Add a new user region preference: rejected for this feature as unnecessary.
- Show Egyptian presets to all users: rejected because non-Egypt users should
  stay in free-text mode.

## Decision: myFawry Yellowcard is conditional

**Decision**: Include myFawry Yellowcard or another Fawry balance-holding
product in wallet/provider dropdowns only if the implementation audit verifies
it as a balance-holding wallet/account provider. Do not include plain Fawry as a
generic payment network. Verified bank-issued Meeza wallets may also be
selectable if current availability is confirmed during implementation.

**Rationale**: The dropdown should represent accounts that can hold user
balances. Payment networks or senders that are not balance containers should not
be selectable account providers.

**Alternatives considered**:

- Always include plain Fawry/myFawry: rejected because it may blur payment
  network and wallet account concepts.
- Always exclude Fawry balance-holding products: rejected because the issue
  explicitly calls Fawry/myFawry out pending verification.

## Decision: InstaPay/IPN excluded from provider and sender registry scope

**Decision**: Do not add InstaPay/IPN as selectable providers or sender-registry
entries for this issue.

**Rationale**: Product clarification says current evidence is that banks usually
send SMS messages for InstaPay transactions, and InstaPay/IPN do not currently
exist in the registry.

**Alternatives considered**:

- Add parsing-only sender entries: rejected after clarification.

## Decision: CBE source preferred, public fallback documented

**Decision**: During implementation, use the current Central Bank of Egypt
registered-bank list as the primary source when accessible. If inaccessible,
cross-check with a reputable public Egyptian banking directory and record
inclusion/exclusion decisions.

**Rationale**: Bank availability is time-sensitive. The spec requires named
decisions for Standard Chartered, Bank NXT, KFH Egypt/AUB aliases, onebank,
American Express Egypt, and BLOM.

**Alternatives considered**:

- Rely only on the existing registry: rejected because known gaps exist.
- Hard-code the issue's named examples without audit: rejected because the
  active bank list can change.

## Decision: Apply the 2026 registry audit findings before implementation

**Decision**: Use [registry-audit.md](./registry-audit.md) as the planning audit
baseline for the implementation. The registry update must add Standard
Chartered, rename Arab Investment Bank/aiBANK to Bank NXT, rename Ahli United
Bank Egypt to KFH Egypt, make BLOM legacy-only under Bank ABC, add e& Cash, and
verify bank-issued Meeza wallets and myFawry Yellowcard before marking them
selectable.

**Rationale**: The existing registry is stale in exactly the places named by
issue #389. Recording the audit now gives implementation a concrete include,
rename, exclude, and verify list.

**Alternatives considered**:

- Leave the audit for implementation only: rejected because provider coverage is
  part of the feature requirements and should shape the plan/tasks.
