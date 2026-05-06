# Tasks: Post-Auth Bootstrap Sync

**Input**: Design documents from `specs/027-post-auth-bootstrap/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md),
[research.md](./research.md), [data-model.md](./data-model.md),
[contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Required. Project rules mandate TDD and this feature changes core
sync/routing/privacy behavior.

**Organization**: Tasks are grouped by user story so each story can be
implemented and tested independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other `[P]` tasks in the same phase because
  it touches different files and does not depend on incomplete tasks.
- **[Story]**: User story label (`US1`, `US2`, `US3`, `US4`) for story phases
  only.
- All tasks include exact repository paths.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare the branch and preserve existing behavior before changing
startup sync.

- [x] T001 Update startup sync and shared reference-data decisions in
      `docs/business/business-decisions.md`
- [x] T002 Review the dirty working tree before product-code edits and run
      focused baseline tests with
      `npm test -- --runInBand apps/mobile/__tests__/hooks/useProfile.test.ts apps/mobile/__tests__/providers/SyncProvider.test.tsx`
- [x] T003 [P] Inspect current category and market-rate RLS policy names in
      `supabase/migrations/008_update_rls_policies_to_authenticated.sql`
- [x] T004 [P] Inspect current startup routing comments and state dependencies
      in `apps/mobile/app/index.tsx`
- [x] T005 [P] Inspect current splash gate dependencies in
      `apps/mobile/components/AppReadyGate.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core adapters, types, and safe query helpers that all user stories
rely on.

**Critical**: No user story work can begin until this phase is complete.

- [x] T006 [P] Add failing remote-apply adapter tests for no cursor advancement
      and clean sync status in
      `apps/mobile/__tests__/services/remote-apply-service.test.ts`
- [x] T007 [P] Add failing Supabase transform tests for profile, category,
      market-rate, timestamp, and date-only columns in
      `apps/mobile/__tests__/services/sync-transform.test.ts`
- [x] T008 [P] Add failing user-scoped query helper tests for direct user-owned
      rows and shared categories in
      `apps/mobile/__tests__/services/user-data-access.test.ts`
- [x] T009 Extract `transformFromSupabase` and related date-column constants
      from `apps/mobile/services/sync.ts` into
      `apps/mobile/services/sync-transform.ts`
- [x] T010 Update `apps/mobile/services/sync.ts` to import and use
      `transformFromSupabase` from `apps/mobile/services/sync-transform.ts`
- [x] T011 Implement `applyRemoteChangeSetWithoutCursor` in
      `apps/mobile/services/remote-apply-service.ts`
- [x] T012 Extend current-user query helpers for observable user-owned queries
      and accessible category queries in
      `apps/mobile/services/user-data-access.ts`
- [x] T013 Export stable bootstrap and sync status codes from
      `apps/mobile/services/startup-bootstrap-types.ts`
- [x] T014 Run foundational service tests with
      `npm test -- --runInBand apps/mobile/__tests__/services/remote-apply-service.test.ts apps/mobile/__tests__/services/sync-transform.test.ts apps/mobile/__tests__/services/user-data-access.test.ts`

**Checkpoint**: Remote rows can be applied locally without advancing
WatermelonDB sync metadata, and shared query helpers exist for safe local reads.

---

## Phase 3: User Story 1 - Returning User Reaches Dashboard Quickly (Priority: P1) MVP

**Goal**: An existing onboarded user signs in from a clean local state, the app
restores the profile first, applies preferences, routes to dashboard, and starts
full sync in the background without the normal blocking overlay.

**Independent Test**: Use a clean local DB and a mocked remote profile with
`onboarding_completed = true`, `preferred_language = ar`, and non-default
currency. Verify dashboard routing, preference application, no
`InitialSyncOverlay`, and background full sync invocation.

### Tests for User Story 1

- [x] T015 [P] [US1] Add failing bootstrap success tests for remote onboarded
      profile application in
      `apps/mobile/__tests__/services/profile-bootstrap-service.test.ts`
- [x] T016 [P] [US1] Add failing tests proving profile bootstrap does not call
      `syncDatabase` or advance `lastPulledAt` in
      `apps/mobile/__tests__/services/profile-bootstrap-service.test.ts`
- [x] T017 [P] [US1] Add failing `SyncProvider` tests for bootstrap-gated
      routing and post-route background full sync in
      `apps/mobile/__tests__/providers/SyncProvider.test.tsx`
- [x] T018 [P] [US1] Add failing routing tests for returning onboarded users in
      `apps/mobile/__tests__/app/index.test.tsx`
- [x] T019 [P] [US1] Add failing splash/language readiness tests for
      bootstrapped profile preferences in
      `apps/mobile/__tests__/components/AppReadyGate.test.tsx`
- [x] T020 [P] [US1] Add failing overlay removal test for authenticated startup
      in `apps/mobile/__tests__/app/_layout.test.tsx`

### Implementation for User Story 1

- [x] T021 [US1] Implement `bootstrapCurrentProfile` remote onboarded success
      path in `apps/mobile/services/profile-bootstrap-service.ts`
- [x] T022 [US1] Move foreign profile purge from `apps/mobile/services/sync.ts`
      into a reusable exported service path in
      `apps/mobile/services/profile-bootstrap-service.ts`
- [x] T023 [US1] Refactor `apps/mobile/providers/SyncProvider.tsx` to expose
      profile bootstrap state, retry action, and background refresh status
- [x] T024 [US1] Update `apps/mobile/components/AppReadyGate.tsx` to wait for
      auth plus profile bootstrap/profile observation instead of initial full
      sync
- [x] T025 [US1] Update `apps/mobile/app/index.tsx` to route onboarded returning
      users from trusted local profile state after bootstrap
- [x] T026 [US1] Remove normal authenticated-startup rendering of
      `InitialSyncOverlay` from `apps/mobile/app/_layout.tsx`
- [x] T027 [US1] Keep full account sync running after dashboard routing by
      invoking `syncDatabase(database, true)` as background refresh in
      `apps/mobile/providers/SyncProvider.tsx`
- [x] T028 [US1] Update structured non-PII startup diagnostics for bootstrap
      route basis in `apps/mobile/app/index.tsx`
- [x] T029 [US1] Run US1 tests with
      `npm test -- --runInBand apps/mobile/__tests__/services/profile-bootstrap-service.test.ts apps/mobile/__tests__/providers/SyncProvider.test.tsx apps/mobile/__tests__/app/index.test.tsx apps/mobile/__tests__/components/AppReadyGate.test.tsx apps/mobile/__tests__/app/_layout.test.tsx`

**Checkpoint**: Returning onboarded user can reach the dashboard from a clean
local DB without a blocking full-sync overlay.

---

## Phase 4: User Story 2 - New User Starts Onboarding Without Artificial Waiting (Priority: P1)

**Goal**: A new or unfinished user routes to onboarding as soon as the profile
is verified, without waiting for a full account-data restore.

**Independent Test**: Mock a remote current-user profile with
`onboarding_completed = false`. Verify the app routes to onboarding only after
verified profile bootstrap succeeds, without showing the normal sync overlay.

### Tests for User Story 2

- [x] T030 [P] [US2] Add failing bootstrap tests for remote unfinished profile
      routing basis in
      `apps/mobile/__tests__/services/profile-bootstrap-service.test.ts`
- [x] T031 [P] [US2] Add failing routing tests for verified unfinished users in
      `apps/mobile/__tests__/app/index.test.tsx`
- [x] T032 [P] [US2] Add failing `SyncProvider` tests proving new-user startup
      does not wait for full sync completion in
      `apps/mobile/__tests__/providers/SyncProvider.test.tsx`
- [x] T033 [P] [US2] Add failing overlay absence test for sign-up startup in
      `apps/mobile/__tests__/app/_layout.test.tsx`

### Implementation for User Story 2

- [x] T034 [US2] Implement `remote-profile-unfinished` result handling in
      `apps/mobile/services/profile-bootstrap-service.ts`
- [x] T035 [US2] Update `apps/mobile/app/index.tsx` to route to `/onboarding`
      only when a verified current-user profile says onboarding is incomplete
- [x] T036 [US2] Update `apps/mobile/providers/SyncProvider.tsx` so background
      full sync starts after verified onboarding route without setting
      `isInitialSync`
- [x] T037 [US2] Remove or deprecate stale `isInitialSync` overlay semantics
      from `apps/mobile/providers/SyncProvider.tsx`
- [x] T038 [US2] Run US2 tests with
      `npm test -- --runInBand apps/mobile/__tests__/services/profile-bootstrap-service.test.ts apps/mobile/__tests__/app/index.test.tsx apps/mobile/__tests__/providers/SyncProvider.test.tsx apps/mobile/__tests__/app/_layout.test.tsx`

**Checkpoint**: New users enter onboarding from verified profile state without
artificial full-data waiting.

---

## Phase 5: User Story 3 - Shared Reference Data Refreshes After Auth Without Exposing Private Categories (Priority: P2)

**Goal**: Market rates and ownerless system categories refresh only after
authentication/profile bootstrap, without blocking the first authenticated
screen, while custom user categories remain private.

**Independent Test**: As unauthenticated, verify no market-rate or category
refresh is requested. After authenticated profile bootstrap, verify the shared
refresh requests only market rates and ownerless system categories. As
authenticated, verify current user's custom categories are available and other
users' custom categories are not.

### Tests for User Story 3

- [x] T039 [P] [US3] Add failing shared-reference refresh tests for post-auth
      market rates and ownerless system categories in
      `apps/mobile/__tests__/services/shared-reference-refresh-service.test.ts`
- [x] T040 [P] [US3] Add failing test that shared-reference refresh does not run
      pre-auth and never requests custom categories or dashboard user data in
      `apps/mobile/__tests__/services/shared-reference-refresh-service.test.ts`
- [x] T041 [P] [US3] Add failing category context tests for ownerless system
      plus current-user custom visibility in
      `apps/mobile/__tests__/context/CategoriesContext.test.tsx`
- [x] T042 [P] [US3] Add SQL verification notes for authenticated category and
      market-rate reads in `specs/027-post-auth-bootstrap/quickstart.md`

### Implementation for User Story 3

- [x] T043 [US3] Create local SQL migration for authenticated market-rate and
      category read policies in
      `supabase/migrations/046_authenticated_shared_reference_data_rls.sql`
- [x] T044 [US3] Implement `refreshSharedReferenceDataAfterAuth` in
      `apps/mobile/services/shared-reference-refresh-service.ts`
- [x] T045 [US3] Wire non-blocking shared-reference refresh after successful
      profile bootstrap in `apps/mobile/providers/SyncProvider.tsx`
- [x] T046 [US3] Update `apps/mobile/context/CategoriesContext.tsx` to observe
      only ownerless system categories plus current-user custom categories
- [x] T047 [US3] Update `apps/mobile/services/sync.ts` category pull filters to
      preserve owner-scoped soft-delete sync while still pulling ownerless
      system categories
- [x] T048 [US3] Run US3 tests with
      `npm test -- --runInBand apps/mobile/__tests__/services/shared-reference-refresh-service.test.ts apps/mobile/__tests__/context/CategoriesContext.test.tsx`
- [ ] T049 [US3] Verify Supabase migration policy behavior with authenticated
      role-based SQL checks documented in
      `specs/027-post-auth-bootstrap/quickstart.md` (manual SQL role checks
      remain)

**Checkpoint**: Shared data refreshes only after auth/profile bootstrap, and
user-owned categories remain private.

---

## Phase 6: User Story 4 - Startup Failures Avoid Destructive Wrong Routing (Priority: P2)

**Goal**: When profile verification fails or hangs, the app never routes into
onboarding by default. It either routes dashboard from a trusted local onboarded
profile or shows Retry and Sign out.

**Independent Test**: Simulate remote errors, missing profile, deleted profile,
timeout, local false profile, foreign profile, and trusted local onboarded
profile. Verify only trusted local onboarded profile can route offline to
dashboard; all unsafe states show recovery.

### Tests for User Story 4

- [x] T050 [P] [US4] Add failing bootstrap tests for remote error, missing
      profile, deleted profile, and timeout in
      `apps/mobile/__tests__/services/profile-bootstrap-service.test.ts`
- [x] T051 [P] [US4] Add failing bootstrap tests for trusted local onboarded
      profile and unsafe local false/foreign/deleted profiles in
      `apps/mobile/__tests__/services/profile-bootstrap-service.test.ts`
- [x] T052 [P] [US4] Add failing routing tests for Retry and Sign out recovery
      states in `apps/mobile/__tests__/app/index.test.tsx`
- [x] T053 [P] [US4] Add failing non-blocking background sync error tests after
      route success in `apps/mobile/__tests__/providers/SyncProvider.test.tsx`
- [x] T054 [P] [US4] Add failing authenticated-screen sync status affordance
      tests in `apps/mobile/__tests__/components/sync/SyncStatusBanner.test.tsx`

### Implementation for User Story 4

- [x] T055 [US4] Implement timeout and immediate-error recovery handling in
      `apps/mobile/services/profile-bootstrap-service.ts`
- [x] T056 [US4] Implement trusted local onboarded profile fallback and unsafe
      local profile rejection in
      `apps/mobile/services/profile-bootstrap-service.ts`
- [x] T057 [US4] Update `apps/mobile/app/index.tsx` to show recovery for unsafe
      bootstrap outcomes and never default to onboarding
- [x] T058 [US4] Reuse or adapt Retry and Sign out actions in
      `apps/mobile/components/ui/AccountLoadRecoveryScreen.tsx`
- [x] T059 [US4] Add non-blocking authenticated sync status affordance in
      `apps/mobile/components/sync/SyncStatusBanner.tsx`
- [x] T060 [US4] Render the authenticated sync status affordance from
      `apps/mobile/app/(tabs)/_layout.tsx`
- [x] T061 [US4] Run US4 tests with
      `npm test -- --runInBand apps/mobile/__tests__/services/profile-bootstrap-service.test.ts apps/mobile/__tests__/app/index.test.tsx apps/mobile/__tests__/providers/SyncProvider.test.tsx apps/mobile/__tests__/components/sync/SyncStatusBanner.test.tsx`

**Checkpoint**: Profile verification failures cannot incorrectly send returning
users to onboarding.

---

## Phase 7: Local Read Privacy Audit (Required Before Release)

**Purpose**: Faster routing means screens render sooner from local SQLite. These
tasks ensure current-user boundaries are enforced on dashboard-facing reads.

- [x] T062 [P] Add failing current-user scoping tests for recent and monthly
      transactions in `apps/mobile/__tests__/hooks/useTransactions.test.ts`
- [x] T063 [P] Add failing current-user scoping tests for period summary
      aggregation in `apps/mobile/__tests__/hooks/usePeriodSummary.test.ts`
- [x] T064 [P] Add failing current-user scoping tests for recurring payments in
      `apps/mobile/__tests__/hooks/useRecurringPayments.test.ts`
- [x] T065 [P] Add failing child/snapshot ownership tests for net worth reads in
      `apps/mobile/__tests__/hooks/useNetWorth.test.ts`
- [x] T066 Scope transaction observations to the current authenticated user in
      `apps/mobile/hooks/useTransactions.ts`
- [x] T067 Scope period summary transaction observations to the current
      authenticated user in `apps/mobile/hooks/usePeriodSummary.ts`
- [x] T068 Scope recurring payment observations to the current authenticated
      user in `apps/mobile/hooks/useRecurringPayments.ts`
- [x] T069 Scope net worth child and snapshot reads through current-user-owned
      parents in `apps/mobile/hooks/useNetWorth.ts`
- [x] T070 Run local read privacy tests with
      `npm test -- --runInBand apps/mobile/__tests__/hooks/useTransactions.test.ts apps/mobile/__tests__/hooks/usePeriodSummary.test.ts apps/mobile/__tests__/hooks/useRecurringPayments.test.ts apps/mobile/__tests__/hooks/useNetWorth.test.ts`

**Checkpoint**: Early-rendered authenticated screens cannot expose stale or
foreign local rows.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, generated types, verification, and cleanup after
story implementation.

- [x] T071 Audit dashboard loading behavior while background data refresh is
      incomplete and add the temporary dashboard-shaped skeleton gate in
      `apps/mobile/app/(tabs)/index.tsx`
- [x] T072 Update issue implementation notes and manual QA steps in
      `specs/027-post-auth-bootstrap/quickstart.md`
- [x] T073 Run Supabase migration workflow for the RLS migration with
      `npm run db:push` followed by `npm run db:migrate`
- [x] T074 Review generated database/type changes in
      `packages/db/src/supabase-types.ts`
- [x] T075 Run full affected mobile test suite with
      `npm test -- --runInBand apps/mobile/__tests__/services/profile-bootstrap-service.test.ts apps/mobile/__tests__/services/shared-reference-refresh-service.test.ts apps/mobile/__tests__/providers/SyncProvider.test.tsx apps/mobile/__tests__/app/index.test.tsx`
- [x] T076 Run TypeScript verification with
      `npx tsc -p apps/mobile/tsconfig.json --noEmit --pretty false`
      (`npm run typecheck` is not defined)
- [x] T077 Run lint verification with `npm run lint`
- [ ] T078 Manually QA clean reinstall for an existing onboarded account,
      including under-3-second route timing, using
      `specs/027-post-auth-bootstrap/quickstart.md`
- [ ] T079 Manually QA new-user sign-up onboarding route using
      `specs/027-post-auth-bootstrap/quickstart.md`
- [x] T080 Remove obsolete `InitialSyncOverlay` code if no longer referenced in
      `apps/mobile/components/ui/InitialSyncOverlay.tsx`
- [x] T081 Add regression coverage for the dashboard-shaped post-bootstrap
      loading gate in `apps/mobile/__tests__/app/tabs-index.test.tsx`
- [x] T082 Add structured, non-PII timing diagnostics around profile bootstrap,
      shared reference refresh, full sync, and post-bootstrap dashboard
      hydration in `apps/mobile/providers/SyncProvider.tsx`,
      `apps/mobile/services/profile-bootstrap-service.ts`,
      `apps/mobile/services/shared-reference-refresh-service.ts`, and
      `apps/mobile/services/sync.ts`
- [x] T083 Document that progressive section-level dashboard hydration is
      deferred to GitHub issue #612 in `specs/027-post-auth-bootstrap/spec.md`,
      `specs/027-post-auth-bootstrap/plan.md`,
      `specs/027-post-auth-bootstrap/quickstart.md`, and
      `specs/027-post-auth-bootstrap/contracts/sync-services.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 Setup**: No dependencies.
- **Phase 2 Foundational**: Depends on Phase 1 and blocks all user stories.
- **US1 and US2 (P1)**: Depend on Phase 2. US1 should be completed first because
  it owns the profile bootstrap/dashboard path used by the provider refactor.
- **US3 (P2)**: Depends on Phase 2. Can run in parallel with US4 after shared
  adapters exist, but migration verification is independent from routing.
- **US4 (P2)**: Depends on Phase 2 and is safest after US1/US2 route states
  exist.
- **Phase 7 Privacy Audit**: Depends on Phase 2 and must complete before
  release. It can run in parallel with US3/US4 after shared query helpers exist.
- **Phase 8 Polish**: Depends on selected story phases and the privacy audit.

### User Story Dependencies

- **US1 Returning dashboard path**: MVP and first implementation target.
- **US2 New onboarding path**: Depends on the same bootstrap provider shape as
  US1 but has independent routing assertions.
- **US3 Shared reference data**: Independent from profile routing after the
  remote-apply adapter exists.
- **US4 Failure recovery**: Depends on bootstrap result states from US1/US2 and
  completes the unsafe-state matrix.

### Within Each User Story

- Write tests first and confirm they fail.
- Implement services before providers.
- Implement providers before route/splash consumers.
- Route and UI changes follow service/provider state.
- Run the story-specific test command before moving to the next story.

### Parallel Opportunities

- T003, T004, and T005 can run in parallel during setup.
- T006, T007, and T008 can run in parallel during foundation.
- T015 through T020 can be written in parallel because they target different
  test files.
- T030 through T033 can be written in parallel because they target different
  behavior slices.
- T039 through T042 can be written in parallel because SQL notes, shared-refresh
  tests, and category context tests are separate.
- T050 through T054 can be written in parallel because they target service,
  route, provider, and component behavior separately.
- T062 through T065 can be written in parallel because each hook has its own
  test file.

---

## Parallel Example: User Story 1

```text
Task: "T015 [P] [US1] Add failing bootstrap success tests for remote onboarded profile application in apps/mobile/__tests__/services/profile-bootstrap-service.test.ts"
Task: "T017 [P] [US1] Add failing SyncProvider tests for bootstrap-gated routing and post-route background full sync in apps/mobile/__tests__/providers/SyncProvider.test.tsx"
Task: "T018 [P] [US1] Add failing routing tests for returning onboarded users in apps/mobile/__tests__/app/index.test.tsx"
Task: "T019 [P] [US1] Add failing splash/language readiness tests for bootstrapped profile preferences in apps/mobile/__tests__/components/AppReadyGate.test.tsx"
```

## Parallel Example: User Story 3

```text
Task: "T039 [P] [US3] Add failing shared-reference refresh tests for post-auth market rates and ownerless system categories in apps/mobile/__tests__/services/shared-reference-refresh-service.test.ts"
Task: "T041 [P] [US3] Add failing category context tests for ownerless system plus current-user custom visibility in apps/mobile/__tests__/context/CategoriesContext.test.tsx"
Task: "T042 [P] [US3] Add SQL verification notes for authenticated category and market-rate reads in specs/027-post-auth-bootstrap/quickstart.md"
```

## Implementation Strategy

### MVP First

1. Complete Phase 1.
2. Complete Phase 2.
3. Complete Phase 3 (US1).
4. Stop and validate the returning-user clean reinstall flow.

### Incremental Delivery

1. Ship US1 only after tests and manual QA prove returning users route to
   dashboard without the overlay.
2. Add US2 to prove new users route to onboarding without full-data blocking.
3. Add US3 to safely refresh shared reference data after authentication/profile
   bootstrap.
4. Add US4 to finish recovery and timeout behavior.
5. Complete Phase 7 before release so faster rendering does not expose stale
   local data.

### Risk Notes

- Do not use WatermelonDB `synchronize()` for profile bootstrap.
- Do not add `deleted = false` to authenticated owner-scoped category SELECT
  policies used by sync.
- Do not request market rates, categories, custom categories, or dashboard user
  data before authentication.
- Do not route to onboarding when profile verification is unavailable and local
  profile is missing, foreign, deleted, or unfinished.
