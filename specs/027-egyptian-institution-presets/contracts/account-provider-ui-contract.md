# Contract: Account Provider UI

## Purpose

Define create/edit account behavior for Egyptian bank and wallet provider
selection.

## Eligibility

Egyptian presets are shown when:

- preferred currency is EGP, or
- runtime/device region resolves to Egypt.

Otherwise, provider details remain manual free text.

## Bank Account Flow

- Account type Bank shows a searchable bank-only dropdown when eligible.
- Dropdown labels use `shortName (fullName)`.
- Selecting a known bank sets `institutionId`, provider display text, and logo.
  Verified registry sender presets are used internally for matching and are not
  shown as editable chips.
- Selecting Other sets `institutionId` to null and shows a free-text provider-
  name field. The entered provider name is saved as account-level provider
  display text (`provider_display_name`).
- Bank-only card fields remain available where the existing bank details flow
  already supports them.

## Wallet Account Flow

- Account type Digital Wallet shows a searchable wallet-only dropdown when
  eligible.
- Selecting a known wallet sets `institutionId`, provider display text, and
  logo. Verified registry sender presets are used internally for matching and
  are not shown as editable chips.
- Selecting Other sets `institutionId` to null and shows a free-text
  wallet/provider-name field. The entered provider name is saved as
  account-level provider display text (`provider_display_name`).
- Wallet sender metadata does not require bank card details.

## Sender Chips

- Sender chips are part of a shared provider-and-senders section used by both
  Bank and Digital Wallet account types.
- For known providers, visible sender chips are custom/additional aliases only.
  Registry sender defaults are implied by `institutionId`.
- Bank-specific card/account-number fields stay outside this shared sender area.
- Each sender is a removable chip/token.
- An adjacent input adds new sender chips.
- Empty sender values are rejected.
- Duplicate sender values for the same account are rejected or collapsed with a
  friendly message.
- Unknown sender values are allowed and marked unverified.

## Account Type Switching

- Account type cannot be changed in edit flow.
- In the new account flow, switching between Bank and Digital Wallet clears
  `institutionId`, provider display text, and sender chips before showing the
  provider list for the new account type.

## Explainer

- The details prompt has an info control.
- The info control opens a compact Monyvi explanatory popover, not a native
  alert.
- The popover closes when the user taps outside it.
- Copy is localized in English and Arabic.
- The popover reassures users that the details are used only to match SMS alerts
  and that no PINs or passwords are needed.

## Account Cards

- Known bank/wallet accounts show provider logos.
- Known bank/wallet accounts resolve current display metadata from the registry
  by `institutionId`.
- `provider_display_name` is a saved snapshot/fallback for known providers and
  the primary provider display for manual/Other providers.
- Manual/Other bank accounts show the default bank icon.
- Manual/Other wallet accounts show the default wallet icon.
