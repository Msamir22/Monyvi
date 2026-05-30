# Quickstart: Egyptian Institution Presets

## Prerequisites

- Node 22.x.
- Workspace dependencies installed.
- Supabase CLI available for local SQL migration workflow.
- Android emulator available for Maestro/manual account journeys when running
  mobile validation.

## Implementation Order

1. Add failing registry tests for known bank/wallet aliases, selectable
   bank/wallet filtering, named audit decisions, verified bank-issued Meeza
   wallets, conditional myFawry Yellowcard, and InstaPay/IPN exclusion.
2. Expand the logic registry into stable institution records and helper
   functions.
3. Add failing schema/service tests for `institution_id`,
   `provider_display_name`, and `account_sms_senders`.
4. Add local SQL migration for account provider identity and normalized sender
   rows, then regenerate database schema/types/migrations.
5. Update account create/edit services to write provider identity and sender
   rows locally first.
6. Update SMS account matching to load sender rows and match wallet accounts.
7. Add mobile asset map and exhaustive visual coverage checks.
8. Add account create/edit UI tests for searchable provider dropdowns, Other
   flows, shared provider-and-senders section, sender chips, explainer sheet,
   account-type switching in create flow, immutable account type in edit flow,
   and fallback icons.
9. Implement UI changes in create/edit account screens and account cards.
10. Add/update English and Arabic copy.
11. Add Maestro/manual coverage for bank and wallet account journeys.
12. Update `docs/business/business-decisions.md` with the new account metadata
    rules.

## Verification Commands

```powershell
npm test -w @monyvi/mobile -- --runInBand
npm run test -w @monyvi/logic -- --runInBand
npm run typecheck -w @monyvi/logic
npm run typecheck -w @monyvi/db
npm run lint -w @monyvi/mobile
npm run i18n:check -w @monyvi/mobile
npm run db:sync-local
npm run e2e:flow:local -w @monyvi/mobile -- e2e/maestro/accounts/egyptian-institution-presets.yaml
```

## Manual Validation

- Egypt-context Bank account: select known bank, confirm logo, sender chips,
  saved account, and account card logo.
- Egypt-context Wallet account: select known wallet, confirm logo, sender chips,
  saved account, and account card logo.
- Other Bank: enter manual provider and sender, confirm default bank icon.
- Other Wallet: enter manual provider and sender, confirm default wallet icon.
- Known provider edit: confirm selected provider ID, provider display name, and
  sender chips persist after leaving and reopening edit.
- Non-Egypt context: confirm Egyptian preset dropdowns are hidden and manual
  fields still work.
- Account uniqueness: confirm same name/currency can be reused across different
  known providers, and still rejects duplicate manual/Other accounts with the
  same name/currency.
- Create-flow account type switch: select a bank provider with sender chips,
  switch to Digital Wallet, and confirm provider identity/display/senders are
  cleared before selecting a wallet.
- Registry audit coverage: confirm Standard Chartered, Bank NXT, KFH Egypt, Bank
  ABC/BLOM legacy handling, e& Cash, verified bank-issued Meeza wallets, and
  conditional myFawry Yellowcard behavior.

## Coverage Matrix

| Scenario                                                               | Unit/integration coverage                                                                                                                                | E2E/manual coverage                          |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Registry selectable banks/wallets, aliases, and InstaPay/IPN exclusion | `packages/logic/src/parsers/__tests__/egyptian-bank-registry.test.ts`                                                                                    | Manual registry audit review                 |
| Known bank/wallet picker and sender chip prefill                       | `InstitutionPicker.test.tsx`, `SenderChipsField.test.tsx`, `InstitutionProviderSection.test.tsx`, `useAccountForm.test.ts`, `useEditAccountForm.test.ts` | Maestro pending                              |
| Other/manual bank and wallet providers                                 | `InstitutionProviderSection.test.tsx`, `account-service.test.ts`, `AccountCard.test.tsx`                                                                 | Maestro/manual pending                       |
| Provider-aware uniqueness                                              | `account-service.test.ts`, `edit-account-service.test.ts`, `useAccountForm.test.ts`                                                                      | Manual timing/check pending                  |
| SMS sender matching for banks and wallets                              | `sms-account-matcher.test.ts`                                                                                                                            | Existing live/batch fingerprint tests        |
| Explainer sheet and localization                                       | `WhyInstitutionDetailsSheet.test.tsx`, `InstitutionProviderSection.test.tsx`, `npm run i18n:check -w @monyvi/mobile`                                     | App-route UI test pending                    |
| Provider logos                                                         | `egyptian-institution-assets.test.ts`, `account-institution-presentation.test.ts`, `AccountCard.test.tsx`                                                | Provider-specific logo source review pending |
