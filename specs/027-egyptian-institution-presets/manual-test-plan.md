# Manual Test Plan: Egyptian Institution Presets

Source of truth: `spec.md` for feature 027.

## Scope

This plan validates the shipped behavior from the user's point of view in the
Android emulator, with local Supabase running and the app opened in local mode.
Registry, migration, SMS matching, and coverage invariants that cannot be
honestly driven from the UI are verified with focused local checks and recorded
as non-UI manual checks.

## Preconditions

- Local Supabase is running and the app is connected to local Supabase.
- Android emulator is running with `com.monyvi.app` open.
- Test user is signed in and has Egypt financial context through EGP preference
  unless a test explicitly changes that context.
- Existing test data may be present; created test accounts use unique names
  prefixed with `Manual 027`.

## UI Manual Tests

### MT-001 Egypt Eligibility And Bank List

Coverage: US1, FR-010, FR-013, FR-015, FR-029, SC-001

1. Open Accounts.
2. Open Add Account.
3. Select Bank Account.
4. Verify the provider section appears with the info control.
5. Verify bank choices use `Short (Full Name)` labels.
6. Verify wallet-only providers are not visible in the bank list.
7. Search/scroll to CIB and verify `CIB (Commercial International Bank)`.

Expected: Egyptian bank presets are visible only for the bank account type,
labels use short/full-name format, and bank choices have visual identity.

### MT-002 Known Bank Selection And Save

Coverage: US1, US3, FR-017, FR-020, FR-022, FR-023, FR-024a, FR-033, SC-001

1. Continue from MT-001.
2. Select `CIB (Commercial International Bank)`.
3. Verify the message detection section says Monyvi already recognizes the
   selected bank and that the sender chip field is for extra senders only.
4. Enter account name `Manual 027 CIB`.
5. Save.
6. Verify the account appears in Accounts.
7. Verify the card uses the known CIB provider visual identity.
8. Open the account for editing.
9. Verify provider details are still visible and the sender chip field remains
   available for custom extra senders.
10. Verify the old single bank sender text field is not shown.

Expected: Known bank saves with provider identity and logo; registry sender
matching is configured internally, and edit preserves the shared provider/sender
section for custom extra senders.

### MT-003 Wallet List And Known Wallet Save

Coverage: US1, FR-014, FR-017, FR-020, FR-024, FR-029, FR-033, SC-002

1. Open Add Account.
2. Select Digital Wallet.
3. Verify wallet providers appear and bank providers are not shown.
4. Verify `Vodafone Cash (Vodafone Cash)` appears.
5. Select Vodafone Cash.
6. Verify message detection says Monyvi already recognizes the selected wallet
   and that the sender chip field is for extra senders only.
7. Enter account name `Manual 027 Vodafone`.
8. Save.
9. Verify the account appears with wallet visual identity.
10. Open edit and verify provider details and the custom sender field are
    visible.

Expected: Wallet presets are separate from banks, save provider identity, use
registry sender matching internally, and support custom sender metadata without
bank card fields.

### MT-004 Account-Type Switch Clears Provider State

Coverage: US1, FR-024b, Edge Cases

1. Open Add Account.
2. Select Bank Account.
3. Select CIB and observe provider identity plus the custom sender field.
4. Switch to Digital Wallet.
5. Verify CIB/provider text and custom sender chips are gone.
6. Verify wallet providers are visible.
7. Select Vodafone Cash.
8. Switch back to Bank Account.
9. Verify Vodafone/provider text and custom sender chips are gone.

Expected: Switching between Bank and Digital Wallet in create flow clears
provider identity, provider display text, and sender chips.

### MT-005 Other Bank Manual Provider

Coverage: US2, FR-016, FR-018, FR-021, FR-032, SC-010

1. Open Add Account.
2. Select Bank Account.
3. Choose Other.
4. Verify free-text provider-name field appears.
5. Enter provider `Manual Bank Provider`.
6. Add sender `MANUALBANK027`.
7. Verify sender is shown as an unverified/custom sender chip or hint.
8. Enter account name `Manual 027 Other Bank`.
9. Save.
10. Verify the account uses a default bank icon rather than a known provider
    logo.

Expected: Manual bank provider can save with custom sender and no known-provider
identity.

### MT-006 Other Wallet Manual Provider

Coverage: US2, FR-016, FR-018, FR-021, FR-032, SC-010

1. Open Add Account.
2. Select Digital Wallet.
3. Choose Other.
4. Verify free-text provider-name field appears.
5. Enter provider `Manual Wallet Provider`.
6. Add sender `MANUALWALLET027`.
7. Verify sender is shown as an unverified/custom sender chip or hint.
8. Enter account name `Manual 027 Other Wallet`.
9. Save.
10. Verify the account uses a default wallet icon rather than a known provider
    logo.

Expected: Manual wallet provider can save with custom sender and no
known-provider identity.

### MT-007 Sender Chips Validation

Coverage: US3, FR-023, FR-023a, SC-007

1. Open a bank or wallet account with provider details.
2. Add three sender chips.
3. Attempt to add an empty sender.
4. Attempt to add a duplicate sender with different casing or spacing.
5. Remove one sender chip.
6. Save and reopen edit.

Expected: Three senders can be saved, empty/duplicate sender values are not
persisted, removed senders stay removed after reopening.

### MT-008 Info Explainer

Coverage: US4, FR-034, FR-035, FR-036

1. Open Add Account and select Bank Account or Digital Wallet.
2. Tap the info control beside provider details.
3. Verify a compact Monyvi explainer opens without leaving the screen.
4. Verify copy explains the details are used only to match SMS alerts and that
   no PINs or passwords are needed.
5. Dismiss the explainer by tapping outside it and by using the action button.
6. Verify the previous form state remains.
7. Repeat from an edit screen.

Expected: Explanation is localized product UI, not a native alert, and dismiss
returns to the same form state.

### MT-009 Arabic Copy And Provider Metadata

Coverage: US1, US4, FR-009, FR-037, SC-009

1. Switch the app to Arabic if the app language setting is available.
2. Open Add Account and select Bank Account.
3. Verify feature copy is Arabic.
4. Verify provider identity remains recognizable with canonical short/full-name
   identity.
5. Open the info explainer and verify the explanation is Arabic.

Expected: Arabic review shows no untranslated feature strings and provider
identity remains stable.

### MT-010 Non-Egypt Context Manual Flow

Coverage: US2, FR-010, FR-012, SC-008

1. Change preferred currency away from EGP if available in the app.
2. Ensure runtime/device region is not Egypt if configurable for the test
   environment.
3. Open Add Account and choose Bank Account.
4. Verify Egyptian preset dropdown is hidden.
5. Verify provider details can still be entered manually.
6. Repeat for Digital Wallet.

Expected: Non-Egypt context does not show Egyptian presets and does not block
manual bank/wallet account creation.

## Non-UI Manual Checks

### MT-011 Registry Audit And Drift Guard

Coverage: FR-001 through FR-009, FR-029 through FR-031, SC-003, SC-004, SC-005

1. Inspect the registry and audit notes.
2. Confirm InstaPay/IPN is absent.
3. Confirm named triage decisions are applied.
4. Confirm every selectable known provider has visual identity coverage.
5. Confirm bank/wallet visual maps are coverage-checked against the canonical
   registry.

Expected: Registry is the single source of truth, audit decisions are recorded,
and visual coverage cannot drift silently.

### MT-012 SMS Matching And Duplicate Safety

Coverage: US3, FR-019, FR-025, FR-026, FR-027, SC-006, SC-007

1. Run focused matching checks for known bank sender aliases.
2. Run focused matching checks for known wallet sender aliases.
3. Verify sender-plus-card-last-four remains highest confidence for bank
   accounts with card details.
4. Verify unknown senders do not break matching fallback.
5. Verify duplicate SMS protection remains covered by existing fingerprint
   checks.

Expected: Every saved sender value can resolve to its account, wallet senders
work without card details, and duplicate-message safety is preserved.

### MT-013 Data Model And Migration

Coverage: FR-020a, FR-020b, FR-020c, FR-022, FR-024, FR-028, FR-028a

1. Verify `accounts.institution_id` and `accounts.provider_display_name` are
   present.
2. Verify `account_sms_senders` stores sender rows.
3. Verify active product code no longer depends on `bank_details.bank_name` or
   `bank_details.sms_sender_name`.
4. Verify known-provider uniqueness uses name, currency, and `institution_id`.
5. Verify manual-provider uniqueness remains name plus currency.

Expected: Provider display and sender ownership live at account level, and the
old single bank sender field is inactive.

## E2E Review After Manual Pass

After completing the manual pass:

1. Keep E2E coverage only for flows that Maestro can drive honestly and
   reliably.
2. Prefer stable `testID` selectors for account type, provider option, sender
   input, and save controls before expanding E2E coverage.
3. Mark any emulator-only or harness-limited behavior as manual-only in the
   coverage matrix.
