# Manual Test Results: Egyptian Institution Presets

Date: 2026-05-30 Environment: Android emulator `emulator-5554`, Expo dev client,
local mode. Source of truth: `spec.md`.

## Results

| ID     | Status                         | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MT-001 | Passed                         | Egypt/EGP context shows a searchable Bank dropdown. The Bank field aligns with the fields above it, has no divider above it, keeps the divider above Add card details, shows logos in the sheet, and filters to `CIB (Commercial International Bank)` when searching `CIB`. Bank options did not show wallet-only providers. Arabic-name matching is covered by the focused picker test because direct Arabic text entry through raw ADB was unreliable in this emulator session. |
| MT-002 | Passed                         | Created `Manual 027 CIB` from the Bank dropdown. CIB logo appeared in the selector and account surfaces, sender chips prefilled as `cib`, `cibank`, and `cibegypt`, and edit preserved the shared Bank/sender section without the old single sender field.                                                                                                                                                                                                                        |
| MT-003 | Passed                         | Created `Manual 027 Vodafone` from the Wallet dropdown. Wallet sheet was separate from banks, showed Vodafone Cash, e& money, Orange Cash, WE Pay, and Other only. Vodafone logo rendered correctly, and account cards use known-provider logos on both the Accounts list and Home carousel.                                                                                                                                                                                      |
| MT-004 | Passed                         | Manually switched Bank -> Wallet -> Bank in the create flow. Provider selection, manual provider text, and sender chips cleared on each account-type change. Focused hook/component coverage also protects this branch.                                                                                                                                                                                                                                                           |
| MT-005 | Passed                         | Created custom bank account `QA Bank 027 by` through Other. It saved with provider display name `QA Bank`, no `institution_id`, custom sender row, and the default bank visual identity. The extra trailing text in the account/sender names came from raw ADB input artifacts, not app behavior.                                                                                                                                                                                 |
| MT-006 | Passed                         | Created custom wallet account `QA Wallet 027` through Other. It saved with provider display name `QA Wallet`, no `institution_id`, custom sender row, and the default wallet visual identity. Edit now correctly shows the selected provider as Other instead of returning to `Choose a provider`.                                                                                                                                                                                |
| MT-007 | Passed                         | On the custom wallet edit flow, removing all sender chips made Save available and persisted the removal. Adding `ALPHA027`, `BETA027`, and `GAMMA027` worked; empty sender input did not create a chip; duplicate `alpha027` showed the duplicate error and did not persist. After removing `BETA027`, saving, and reopening edit, only `ALPHA027` and `GAMMA027` remained active. A regression hook test now covers the all-senders-removed dirty state.                         |
| MT-008 | Passed                         | Add and edit info controls open compact Monyvi-owned product UI without leaving the screen. The copy explains that bank or wallet details help SMS matching and says Monyvi never asks for full card numbers, PINs, or passwords. Tapping outside the explainer closes it, and dismissal returns to the same form state.                                                                                                                                                          |
| MT-009 | Passed with harness limitation | English feature copy was reviewed in the emulator. Arabic i18n parity passed, and Arabic provider metadata search is covered by the picker test against `nameAr` even when the visible language is English. A full Arabic visual pass still needs an app-language/locale harness because this emulator session did not expose a reliable in-app language switch.                                                                                                                  |
| MT-010 | Passed by focused checks       | The app did not expose a safe manual way to change preferred currency/region during this session. `useEgyptianInstitutionEligibility` focused tests cover the required behavior: Egypt region or EGP preference shows presets; non-Egypt plus non-EGP hides presets while manual provider entry remains available.                                                                                                                                                                |
| MT-011 | Passed                         | Registry tests and asset-coverage tests pass. InstaPay/IPN are absent, triage decisions are covered, and selectable providers are coverage-checked against assets.                                                                                                                                                                                                                                                                                                                |
| MT-012 | Passed                         | SMS matcher tests cover known bank aliases, wallet aliases, sender-plus-card confidence, unknown sender fallback, and duplicate safety assumptions.                                                                                                                                                                                                                                                                                                                               |
| MT-013 | Passed                         | Migration/model/service tests cover `accounts.institution_id`, `accounts.provider_display_name`, `account_sms_senders`, removal of active `bank_details.bank_name`/`sms_sender_name`, and known/manual uniqueness behavior.                                                                                                                                                                                                                                                       |

## Visual Fixes Found During Manual QA

- Bank selector was visually list-like instead of a searchable dropdown: fixed
  by using a modal bottom-sheet dropdown.
- Bank logos were missing from selector rows: fixed by rendering provider logo
  marks in the dropdown and selected field.
- Bank section heading said Provider Details: fixed to Bank/Wallet based on
  account type.
- Bank field had a divider above it: fixed by moving the divider back above Add
  card details.
- Bank field alignment was off relative to other fields: fixed by aligning
  label/dropdown with the form field grid and moving helper copy below the
  field.
- Android keyboard covered searched dropdown results: fixed by lifting the sheet
  above the keyboard.
- Vodafone Cash logo asset was incorrect and rendered as a dark strip: fixed by
  replacing it with a vector Vodafone brand mark and wiring it as SVG.
- Home dashboard account cards used generic account-type icons for known
  providers: fixed by resolving provider visual identity there too.
- Add/edit account loading skeleton still matched the old large-card layout:
  fixed by reshaping it to the compact preview card, locked account-type row,
  and current field rhythm.
- Add Account currency used a short dropdown list: fixed by using the searchable
  currency picker backed by all supported fiat currencies.
- The SMS section title was too technical and bank-specific: fixed to
  `SMS matching details (Optional)` with bank/wallet-neutral description copy.
- The info explainer was too large and did not close on outside tap: fixed as a
  smaller popover with shorter copy, smaller icon trigger, and outside-tap
  dismissal.
- Gboard covered the sender/card fields near the bottom of the add/edit forms:
  fixed with keyboard-aware bottom spacing and verified in both add and edit
  account screens.

## Verification Commands Run

- `npm test -w @monyvi/mobile -- --runInBand apps/mobile/__tests__/components/add-account/InstitutionPicker.test.tsx apps/mobile/__tests__/components/add-account/InstitutionProviderSection.test.tsx`
- `npm test -w @monyvi/mobile -- --runInBand apps/mobile/__tests__/app/add-account-institution-info.test.tsx apps/mobile/__tests__/app/edit-account-institution-info.test.tsx`
- `npm test -w @monyvi/mobile -- --runInBand apps/mobile/__tests__/constants apps/mobile/__tests__/components/add-account/InstitutionPicker.test.tsx`
- `npm test -w @monyvi/mobile -- --runInBand apps/mobile/__tests__/components/dashboard/AccountsSection.test.tsx apps/mobile/__tests__/components/accounts/AccountCard.test.tsx`
- `npx jest --runInBand --detectOpenHandles --forceExit __tests__/components/add-account/InstitutionPicker.test.tsx __tests__/components/add-account/InstitutionProviderSection.test.tsx __tests__/hooks/useEgyptianInstitutionEligibility.test.ts __tests__/constants/egyptian-institution-assets.test.ts __tests__/services/sms-account-matcher.test.ts __tests__/services/sms-account-resolver.test.ts __tests__/migrations/account-institution-senders-migration.test.ts __tests__/services/edit-account-service.test.ts __tests__/services/account-service.test.ts __tests__/services/sync-config.test.ts __tests__/utils/account-institution-presentation.test.ts __tests__/app/add-account-institution-info.test.tsx __tests__/app/edit-account-institution-info.test.tsx __tests__/hooks/useEditAccountForm.test.ts`
- `npm test -w @monyvi/logic -- --runInBand src/parsers/__tests__/egyptian-bank-registry.test.ts`
- `npm run i18n:check -w @monyvi/mobile`
- `npx tsc -p apps/mobile/tsconfig.json --noEmit --pretty false`
- `npx jest --runInBand --detectOpenHandles --forceExit __tests__/components/add-account/WhyInstitutionDetailsSheet.test.tsx __tests__/components/add-account/InstitutionProviderSection.test.tsx __tests__/app/add-account-institution-info.test.tsx __tests__/app/edit-account-institution-info.test.tsx __tests__/hooks/useEditAccountForm.test.ts`
- `npm run lint -w @monyvi/mobile`
- `npm run db:migrate`
- `npx jest --runInBand --detectOpenHandles --forceExit __tests__/services/sms-account-matcher.test.ts __tests__/services/sms-account-resolver.test.ts __tests__/services/edit-account-service.test.ts __tests__/services/account-service.test.ts __tests__/validation/account-validation.test.ts __tests__/hooks/useEgyptianInstitutionEligibility.test.ts __tests__/hooks/useAccountForm.test.ts __tests__/components/add-account/SenderChipsField.test.tsx __tests__/components/add-account/InstitutionPicker.test.tsx __tests__/components/add-account/InstitutionProviderSection.test.tsx __tests__/components/add-account/WhyInstitutionDetailsSheet.test.tsx __tests__/app/add-account-institution-info.test.tsx __tests__/app/edit-account-institution-info.test.tsx __tests__/components/accounts/AccountCard.test.tsx __tests__/components/dashboard/AccountsSection.test.tsx __tests__/migrations/account-institution-senders-migration.test.ts __tests__/utils/account-institution-presentation.test.ts __tests__/scripts/manual-qa-seed.test.ts`

## Latest Manual Re-Checks

- Compact info explainer: passed on Add Account and Edit Account. Outside tap
  closed the explainer.
- Currency picker: passed on Add Account. The picker shows all supported fiat
  currencies from `SUPPORTED_CURRENCIES` and search filters to `USD`.
- Keyboard overlap: passed on Add Account and Edit Account. Sender and card
  fields remain visible above Gboard.
- Loading skeleton: code reviewed against the current layout and covered by
  focused type/lint checks. A deterministic emulator capture of the loading
  transient was not available because local data resolves too quickly.

## E2E Review

- Updated `apps/mobile/e2e/maestro/accounts/egyptian-institution-presets.yaml`
  so the flow opens the searchable Bank/Wallet dropdowns and searches for CIB,
  Vodafone Cash, and Other instead of expecting the old flat provider list.
- Attempted the focused flow through
  `npm run e2e:flow:local -w @monyvi/mobile -- e2e/maestro/accounts/egyptian-institution-presets.yaml`.
  The first run reached the provider picker and exposed the stale flat-list
  assumption. The second run failed during E2E preflight before Maestro executed
  the flow while the app was visibly on Accounts.
- Attempted a direct Maestro run against `emulator-5554`; Maestro failed before
  executing the flow because the Android driver did not start on its control
  port. This is recorded as an E2E runner/emulator blocker, not an app assertion
  failure.
