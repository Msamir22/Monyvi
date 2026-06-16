# Tasks: Egyptian Institution Presets

**Input**: Design documents from `/specs/027-egyptian-institution-presets/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
registry-audit.md, contracts/, quickstart.md

**Tests**: Required. Project instructions mandate TDD, and this feature's spec
requires registry, service, UI, matching, and journey coverage.

**Organization**: Tasks are grouped by user story so each story can be
implemented, validated, and reviewed independently after the shared foundation
is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no
  dependency on another incomplete task in the same phase.
- **[Story]**: Maps to the user story from spec.md.
- Every task includes exact file paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the implementation surface and test locations.

- [x] T001 Review the current account create/edit, account card, registry, and
      SMS matcher surfaces in
      `packages/logic/src/parsers/egyptian-bank-registry.ts`,
      `apps/mobile/app/(private)/add-account.tsx`,
      `apps/mobile/app/(private)/edit-account.tsx`, current
      `apps/mobile/components/add-account/BankDetailsSection.tsx` as the source
      to split into planned
      `apps/mobile/components/add-account/BankCardDetailsSection.tsx`,
      `apps/mobile/components/accounts/AccountCard.tsx`, and
      `apps/mobile/services/sms-account-matcher.ts`
- [x] T002 [P] Create placeholder test directories for the feature in
      `packages/logic/src/parsers/__tests__/`,
      `apps/mobile/__tests__/components/add-account/`,
      `apps/mobile/__tests__/services/`, `apps/mobile/__tests__/constants/`, and
      `apps/mobile/e2e/maestro/accounts/`
- [x] T003 [P] Create provider asset directories in
      `apps/mobile/assets/institutions/banks/`,
      `apps/mobile/assets/institutions/wallets/`, and
      `apps/mobile/assets/institutions/defaults/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared registry, schema, sync, and asset foundation that
all user stories depend on.

**CRITICAL**: No user story implementation should begin until this phase is
complete.

### Tests First

- [x] T004 [P] Add failing registry catalog tests for stable IDs, selectable
      bank/wallet filtering, Arabic `nameAr` metadata where available, current
      rename decisions, legacy aliases, e& Cash, verified Meeza wallet gates,
      conditional myFawry Yellowcard, and InstaPay/IPN exclusion in
      `packages/logic/src/parsers/__tests__/egyptian-bank-registry.test.ts`
- [x] T005 [P] Add failing DB schema/model tests for `accounts.institution_id`,
      `accounts.provider_display_name`, `account_sms_senders`, and removal of
      active `bank_details.bank_name`/`bank_details.sms_sender_name` usage in
      `apps/mobile/__tests__/migrations/account-institution-senders-migration.test.ts`
- [x] T006 [P] Add failing sync configuration tests for `account_sms_senders` as
      an account-owned child table in
      `apps/mobile/__tests__/services/sync-config.test.ts`
- [x] T007 [P] Add failing visual coverage tests proving every selectable
      registry provider has a local logo asset and defaults exist for manual
      banks/wallets in
      `apps/mobile/__tests__/constants/egyptian-institution-assets.test.ts`

### Implementation

- [x] T008 Implement the canonical Egyptian institution catalog, stable IDs,
      Arabic `nameAr` metadata where available, selectable helpers,
      current/legacy audit decisions, and sender lookup helpers in
      `packages/logic/src/parsers/egyptian-bank-registry.ts`
- [x] T009 Add local SQL migration
      `supabase/migrations/051_account_institution_senders.sql` for
      `accounts.institution_id`, `accounts.provider_display_name`,
      `account_sms_senders`, child-table RLS, indexes, removal from active use
      of old bank-detail fields, and provider-aware uniqueness using separate
      enforcement for known-provider accounts (`institution_id` present) and
      manual/Other accounts (`institution_id` null)
- [x] T010 Regenerate WatermelonDB schema, migrations, generated models, and
      Supabase types from the migration into `packages/db/src/schema.ts`,
      `packages/db/src/migrations.ts`,
      `packages/db/src/models/base/base-account.ts`,
      `packages/db/src/models/base/base-bank-details.ts`,
      `packages/db/src/types.ts`, and `packages/db/src/supabase-types.ts`
- [x] T011 Add the `AccountSmsSender` model and account relationships in
      `packages/db/src/models/AccountSmsSender.ts`,
      `packages/db/src/models/Account.ts`,
      `packages/db/src/models/base/base-account-sms-sender.ts`, and
      `packages/db/src/database.ts`
- [x] T012 Update sync child-table configuration for `account_sms_senders` in
      `apps/mobile/services/sync/config.ts`,
      `apps/mobile/services/sync/types.ts`,
      `apps/mobile/services/sync/pull-strategies.ts`, and
      `apps/mobile/services/sync/push-service.ts`
- [x] T013 Create the local institution asset map with exhaustive registry
      coverage in `apps/mobile/constants/egyptian-institution-assets.ts`
- [x] T014 Add provider-specific local logo assets for every selectable known
      provider in `apps/mobile/assets/institutions/banks/` and
      `apps/mobile/assets/institutions/wallets/`, plus default bank and wallet
      icon assets or approved local fallbacks in
      `apps/mobile/assets/institutions/defaults/`
- [x] T015 Review `docs/business/business-decisions.md` before implementation
      and confirm the documented provider identity, provider display, sender
      row, and uniqueness rules match this feature plan

**Checkpoint**: Registry, schema, sync, and visual asset foundation are ready.

---

## Phase 3: User Story 1 - Egyptian User Selects a Known Bank or Wallet (Priority: P1) MVP

**Goal**: Egypt-context users can select known banks or wallets, see
`shortName (fullName)`, get local logos, and have registry sender matching
configured internally while visible sender chips stay reserved for custom
additions.

**Independent Test**: Start account creation as an Egypt-context user, choose
Bank, select a known bank, verify label/logo and internal sender matching.
Repeat with Digital Wallet and verify only wallet providers appear.

### Tests for User Story 1

- [x] T016 [P] [US1] Add failing eligibility hook tests for EGP preferred
      currency, Egypt runtime region, and non-Egypt manual mode in
      `apps/mobile/__tests__/hooks/useEgyptianInstitutionEligibility.test.ts`
- [x] T017 [P] [US1] Add failing provider picker component tests for bank-only
      filtering, wallet-only filtering, search, labels, logo rendering, and
      provider selection in
      `apps/mobile/__tests__/components/add-account/InstitutionPicker.test.tsx`
- [x] T018 [P] [US1] Add failing sender chip component tests for preset
      population, trim/case duplicate detection, chip removal, and custom
      unverified values in
      `apps/mobile/__tests__/components/add-account/SenderChipsField.test.tsx`
- [x] T019 [P] [US1] Add failing account form hook tests for known provider
      selection, account-type switching in create flow, immutable account type
      in edit flow, and `null` ID semantics in
      `apps/mobile/__tests__/hooks/useAccountForm.test.ts` and
      `apps/mobile/__tests__/hooks/useEditAccountForm.test.ts`
- [x] T020 [P] [US1] Add failing create/edit service tests for saving
      `institution_id`, `provider_display_name`, and sender rows locally first
      in `apps/mobile/__tests__/services/account-service.test.ts` and
      `apps/mobile/__tests__/services/edit-account-service.test.ts`

### Implementation for User Story 1

- [x] T021 [US1] Implement Egypt-context eligibility logic in
      `apps/mobile/hooks/useEgyptianInstitutionEligibility.ts`
- [x] T022 [US1] Extend account validation for `institutionId`,
      `providerDisplayName`, and sender chip arrays in
      `apps/mobile/validation/account-validation.ts`
- [x] T023 [US1] Update create account form state for known provider identity,
      provider display, sender chips, and account-type switching reset behavior
      in `apps/mobile/hooks/useAccountForm.ts`
- [x] T024 [US1] Update edit account form state for known provider identity,
      provider display, sender chips, and immutable account type assumptions in
      `apps/mobile/hooks/useEditAccountForm.ts`
- [x] T025 [US1] Implement the searchable institution picker in
      `apps/mobile/components/add-account/InstitutionPicker.tsx`
- [x] T026 [US1] Implement shared provider and sender composition in
      `apps/mobile/components/add-account/InstitutionProviderSection.tsx`
- [x] T027 [US1] Implement reusable sender chips input in
      `apps/mobile/components/add-account/SenderChipsField.tsx`
- [x] T028 [US1] Split bank-only card/account fields from provider/sender UI in
      `apps/mobile/components/add-account/BankCardDetailsSection.tsx`
- [x] T029 [US1] Wire the shared provider-and-senders section into account
      creation in `apps/mobile/app/(private)/add-account.tsx`
- [x] T030 [US1] Wire the shared provider-and-senders section into account
      editing in `apps/mobile/app/(private)/edit-account.tsx`
- [x] T031 [US1] Persist known provider metadata and sender rows during account
      creation in `apps/mobile/services/account-service.ts`
- [x] T032 [US1] Persist known provider metadata and sender row replacements
      during account editing in `apps/mobile/services/edit-account-service.ts`
- [x] T033 [US1] Add account sender row helpers for create, replace, normalize,
      and soft-delete behavior in
      `apps/mobile/services/account-sms-sender-service.ts`
- [x] T034 [US1] Add provider-aware account read model shaping for edit/account
      display in `apps/mobile/utils/account-institution-presentation.ts`
- [x] T035 [US1] Update account cards to resolve known-provider logos and
      current registry display metadata in
      `apps/mobile/components/accounts/AccountCard.tsx`

**Checkpoint**: User Story 1 is functional and independently testable.

---

## Phase 4: User Story 2 - User Can Enter a Bank or Wallet Manually (Priority: P1)

**Goal**: Users can choose Other or operate outside Egypt-context, enter manual
provider details, save custom sender chips, and see default bank/wallet icons.

**Independent Test**: Create Bank and Digital Wallet accounts through Other and
through non-Egypt manual mode; verify no known provider identity is saved,
manual provider display persists, sender values persist, and fallback icons
render.

### Tests for User Story 2

- [x] T036 [P] [US2] Add failing component tests for Other/free-text provider
      fields and default icons in
      `apps/mobile/__tests__/components/add-account/InstitutionProviderSection.test.tsx`
- [x] T037 [P] [US2] Add failing account form tests for non-Egypt manual mode
      and Other-to-known/known-to-Other transitions in
      `apps/mobile/__tests__/hooks/useAccountForm.test.ts`
- [x] T038 [P] [US2] Add failing service tests for manual provider save
      behavior, null `institution_id`, optional `provider_display_name`, and
      provider-aware manual uniqueness in
      `apps/mobile/__tests__/services/account-service.test.ts`
- [x] T039 [P] [US2] Add failing account card tests for manual bank and wallet
      fallback icons in
      `apps/mobile/__tests__/components/accounts/AccountCard.test.tsx`

### Implementation for User Story 2

- [x] T040 [US2] Implement Other/free-text provider behavior in
      `apps/mobile/components/add-account/InstitutionProviderSection.tsx`
- [x] T041 [US2] Implement non-Egypt manual provider mode in
      `apps/mobile/hooks/useEgyptianInstitutionEligibility.ts` and
      `apps/mobile/hooks/useAccountForm.ts`
- [x] T042 [US2] Enforce optional manual provider validation and `null`
      known-provider identity in `apps/mobile/validation/account-validation.ts`
- [x] T043 [US2] Implement manual provider create and edit persistence in
      `apps/mobile/services/account-service.ts` and
      `apps/mobile/services/edit-account-service.ts`
- [x] T044 [US2] Implement provider-aware uniqueness checks for known providers
      and existing manual uniqueness for Other providers in
      `apps/mobile/services/account-service.ts`
- [x] T045 [US2] Render manual provider display names and default bank/wallet
      icons in `apps/mobile/components/accounts/AccountCard.tsx`

**Checkpoint**: User Story 2 is functional and independently testable.

---

## Phase 5: User Story 3 - SMS Matching Handles All Sender Names for Banks and Wallets (Priority: P1)

**Goal**: SMS account matching considers every saved sender row for bank and
wallet accounts, preserves sender-plus-card confidence, and ignores deleted or
foreign-account sender rows.

**Independent Test**: Save bank and wallet accounts with multiple senders, then
match sample messages from each sender and verify they resolve to the intended
account without weakening SMS fingerprint deduplication.

### Tests for User Story 3

- [x] T046 [P] [US3] Add failing SMS matcher tests for multiple sender rows,
      wallet sender matching, deleted sender exclusion, foreign account
      exclusion, and unknown sender fallback in
      `apps/mobile/__tests__/services/sms-account-matcher.test.ts`
- [x] T047 [P] [US3] Add failing SMS matcher tests for bank
      sender-plus-card-last-four priority over sender-only matching in
      `apps/mobile/__tests__/services/sms-account-matcher.test.ts`
- [x] T048 [P] [US3] Add failing live/batch SMS regression tests proving wallet
      senders reach live matching and SMS fingerprint deduplication is unchanged
      in `apps/mobile/__tests__/services/sms-account-resolver.test.ts` and
      `apps/mobile/__tests__/services/sms-live-detection-handler.test.ts`

### Implementation for User Story 3

- [x] T049 [US3] Update SMS account matching read logic to load scoped accounts,
      bank details, and `account_sms_senders` without N+1 queries in
      `apps/mobile/services/sms-account-matcher.ts`
- [x] T050 [US3] Implement wallet sender matching without requiring bank details
      in `apps/mobile/services/sms-account-matcher.ts`
- [x] T051 [US3] Preserve bank sender-plus-card-last-four priority over
      sender-only matching in `apps/mobile/services/sms-account-matcher.ts`
- [x] T052 [US3] Ensure live SMS detection continues using stable
      `smsFingerprint` deduplication after account matching changes in
      `apps/mobile/services/sms-live-detection-handler.ts`
- [x] T053 [US3] Ensure batch SMS sync continues checking transaction and
      transfer fingerprints after account matching changes in
      `apps/mobile/services/sms-sync-service.ts`

**Checkpoint**: User Story 3 is functional and independently testable.

---

## Phase 6: User Story 4 - User Understands Why Bank or Wallet Details Matter (Priority: P2)

**Goal**: Users can open a localized compact Monyvi explanation for why provider
and sender details help SMS automation, without using a native alert.

**Independent Test**: Open account creation/editing, tap the info control,
verify localized explanatory copy appears, then dismiss it and confirm form
state is preserved.

### Tests for User Story 4

- [x] T054 [P] [US4] Add failing explainer component tests for
      open/dismiss/outside-tap behavior and no native Alert usage in
      `apps/mobile/__tests__/components/add-account/WhyInstitutionDetailsSheet.test.tsx`
- [x] T055 [P] [US4] Add failing account form UI tests for info control presence
      in create and edit flows in
      `apps/mobile/__tests__/app/add-account-institution-info.test.tsx` and
      `apps/mobile/__tests__/app/edit-account-institution-info.test.tsx`
- [x] T056 [P] [US4] Add failing i18n coverage tests or baseline entries for
      English and Arabic account provider explainer copy in
      `apps/mobile/locales/en/accounts.json` and
      `apps/mobile/locales/ar/accounts.json`

### Implementation for User Story 4

- [x] T057 [US4] Implement the Monyvi-owned provider details explainer popover
      in `apps/mobile/components/add-account/WhyInstitutionDetailsSheet.tsx`
- [x] T058 [US4] Add the explainer info control to the provider-and-senders
      section in
      `apps/mobile/components/add-account/InstitutionProviderSection.tsx`
- [x] T059 [US4] Add localized English and Arabic explainer copy in
      `apps/mobile/locales/en/accounts.json` and
      `apps/mobile/locales/ar/accounts.json`

**Checkpoint**: User Story 4 is functional and independently testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full-flow automation, manual validation, and final quality gates.

- [x] T060 [P] Add Maestro create/edit flows for known bank, known wallet, Other
      bank, Other wallet, create-flow Bank-to-Digital-Wallet switching, and
      manual timing validation for the 90-second known bank/wallet creation
      targets in
      `apps/mobile/e2e/maestro/accounts/egyptian-institution-presets.yaml`
- [x] T061 [P] Add manual-only validation notes for registry audit sources, logo
      source review, and wallet availability decisions in
      `specs/027-egyptian-institution-presets/registry-audit.md`
- [x] T062 [P] Update `docs/business/business-decisions.md` after implementation
      to reflect the final schema, provider display behavior, sender chip
      behavior, and any verified wallet availability decisions
- [x] T063 Run and fix issues from logic registry tests in
      `packages/logic/src/parsers/__tests__/egyptian-bank-registry.test.ts`
- [x] T064 Run and fix issues from mobile unit and hook tests in
      `apps/mobile/__tests__/`
- [x] T065 Run and fix issues from database generation checks in
      `packages/db/src/schema.ts`, `packages/db/src/migrations.ts`, and
      `packages/db/src/supabase-types.ts`
- [x] T066 Run and fix issues from i18n coverage in
      `apps/mobile/locales/en/accounts.json` and
      `apps/mobile/locales/ar/accounts.json`
- [ ] T067 Run and fix issues from Maestro account journeys in
      `apps/mobile/e2e/maestro/accounts/egyptian-institution-presets.yaml`
- [x] T068 Complete the PR coverage matrix mapping quickstart manual scenarios,
      90-second timing checks, automated tests, and manual-only checks in
      `specs/027-egyptian-institution-presets/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user
  stories.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on Foundational and can run alongside User
  Story 1 after shared components/contracts are agreed.
- **User Story 3 (Phase 5)**: Depends on Foundational and service/model work
  from User Story 1 where sender rows are persisted.
- **User Story 4 (Phase 6)**: Depends on User Story 1 provider section
  structure.
- **Polish (Phase 7)**: Depends on all selected user stories.

### User Story Dependencies

- **US1**: MVP. Known provider selection, persistence, logos, and shared sender
  UI.
- **US2**: Builds on the same provider section and services as US1, but remains
  independently testable through Other/manual flows.
- **US3**: Requires foundational sender rows and US1/US2 persistence paths to
  produce data for matching.
- **US4**: Requires the provider-and-senders section from US1 to host the info
  control.

### Within Each User Story

- Write tests first and confirm they fail for the intended reason.
- Implement validation/form state before UI wiring.
- Implement service writes before read-model/display integration.
- Validate each story independently before moving to the next priority.

## Parallel Opportunities

- T002 and T003 can run in parallel.
- T004, T005, T006, and T007 can run in parallel after Setup.
- US1 test tasks T016 through T020 can run in parallel.
- US2 test tasks T036 through T039 can run in parallel.
- US3 test tasks T046 through T048 can run in parallel.
- US4 test tasks T054 through T056 can run in parallel.
- Polish tasks T060, T061, and T062 can run in parallel.

## Parallel Example: User Story 1

```text
Task: "Add failing eligibility hook tests in apps/mobile/__tests__/hooks/useEgyptianInstitutionEligibility.test.ts"
Task: "Add failing provider picker component tests in apps/mobile/__tests__/components/add-account/InstitutionPicker.test.tsx"
Task: "Add failing sender chip component tests in apps/mobile/__tests__/components/add-account/SenderChipsField.test.tsx"
Task: "Add failing account form hook tests in apps/mobile/__tests__/hooks/useAccountForm.test.ts and apps/mobile/__tests__/hooks/useEditAccountForm.test.ts"
Task: "Add failing create/edit service tests in apps/mobile/__tests__/services/account-service.test.ts and apps/mobile/__tests__/services/edit-account-service.test.ts"
```

## Parallel Example: User Story 3

```text
Task: "Add failing SMS matcher tests in apps/mobile/__tests__/services/sms-account-matcher.test.ts"
Task: "Add failing card-priority matcher tests in apps/mobile/__tests__/services/sms-account-matcher-card-priority.test.ts"
Task: "Add failing live/batch deduplication regression tests in apps/mobile/__tests__/services/sms-live-detection-handler.test.ts and apps/mobile/__tests__/services/sms-sync-service.test.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 for known bank/wallet selection, internal registry sender
   matching, provider identity persistence, and account-card logos.
3. Validate US1 independently with tests and manual create/edit checks.

### Incremental Delivery

1. Foundation: registry, schema, sync, assets.
2. US1: known Egyptian provider selection.
3. US2: Other/manual fallback.
4. US3: multi-sender SMS matching.
5. US4: compact explainer and localized trust copy.
6. Polish: Maestro/manual coverage and full verification commands from
   quickstart.md.

### Final Verification Commands

```powershell
npm run test -w @monyvi/logic -- --runInBand
npm test -w @monyvi/mobile -- --runInBand
npm run typecheck -w @monyvi/logic
npm run typecheck -w @monyvi/db
npm run lint -w @monyvi/mobile
npm run i18n:check -w @monyvi/mobile
npm run db:sync-local
npm run e2e:flow:local -w @monyvi/mobile -- e2e/maestro/accounts/egyptian-institution-presets.yaml
```

## Notes

- TDD is mandatory: test tasks must fail for the expected reason before
  implementation tasks begin.
- All account writes remain local-first in WatermelonDB.
- `packages/logic` must not import mobile or DB runtime code.
- Components must receive shaped props/callbacks and must not import raw
  database access.
- Do not add InstaPay/IPN as dropdown providers or sender-registry entries.
