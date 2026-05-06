# Implementation Plan: Post-Auth Bootstrap Sync

**Branch**: `381-post-auth-bootstrap` | **Date**: 2026-05-06 | **Spec**:
[`./spec.md`](./spec.md)  
**Input**: Feature specification from `specs/027-post-auth-bootstrap/spec.md`

**Note**: The `/speckit-plan` setup script was run through Git Bash because the
Windows `bash.exe` on this machine launches WSL, and WSL has no `/bin/bash`. The
Spec Kit helper was patched so a broken `python3` shim falls back to the safe
JSON grep parser when resolving `.specify/feature.json`.

## Summary

Replace the current post-auth blocking full sync gate with a small, trusted
profile bootstrap. After sign-in or sign-up, the app restores only the current
user's profile, applies the profile into WatermelonDB without advancing
WatermelonDB's global sync cursor, routes from the local profile, and then
hydrates the first dashboard dependencies with a dashboard-shaped skeleton
fallback while the normal account-data sync continues. The feature also
refreshes non-sensitive shared data (`market_rates` and ownerless system
categories) only after authentication/profile bootstrap, keeps user-owned
categories private, removes the normal `InitialSyncOverlay` from sign-in/sign-up
startup, and adds a local-read privacy audit so faster routing cannot expose
stale or foreign cached data.

**Implementation adjustment**: Progressive section-level dashboard hydration was
deferred to GitHub issue #612. The shipped issue 381 path keeps the normal sync
overlay removed, but holds dashboard content behind the existing
`DashboardSkeleton` until the first post-bootstrap dashboard dependency refresh
settles. This prevents WatermelonDB's initial empty emissions from looking like
real empty dashboard data.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode across the monorepo  
**Primary Dependencies**: React Native + Expo managed workflow, Expo Router,
WatermelonDB, Supabase JS, NativeWind v4, Jest + React Native Testing Library  
**Storage**: WatermelonDB/SQLite as local source of truth; Supabase PostgreSQL
as remote sync target; Expo SecureStore for auth session persistence  
**Testing**: Jest unit/integration tests in `apps/mobile/__tests__/`; SQL/RLS
verification through local Supabase migrations and role-based read checks  
**Target Platform**: iOS and Android Expo app  
**Project Type**: Mobile monorepo feature with mobile app, local DB sync, and
Supabase RLS migration changes  
**Performance Goals**: Returning onboarded users reach the first authenticated
screen in under 3 seconds on a Pixel-class physical Android device or iPhone on
stable Wi-Fi, measured from local authenticated-session availability to the
first authenticated route paint and excluding external authentication time; no
full-screen sync overlay in normal sign-in or sign-up  
**Constraints**: Offline-first; user-facing reads remain local; profile
bootstrap must not advance the WatermelonDB global `lastPulledAt`; private data
must stay current-user scoped while background refresh is incomplete; profile
verification hangs show recovery after 30 seconds  
**Scale/Scope**: One startup/sync flow, two shared-data table policies, current
user profile bootstrap, sync status UI, and a targeted audit of dashboard-facing
local reads. Broader per-domain on-demand sync remains out of scope.

## Constitution Check

_GATE: Re-checked post-design (Phase 1). All principles pass._

| Principle                             | Status | Notes                                                                                                                                                                                                                                                                   |
| ------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Offline-First Data Architecture    | PASS   | Profile bootstrap writes the remote profile into WatermelonDB first, then routing reads from WatermelonDB. Full cloud sync remains non-blocking background work. Partial bootstrap does not call `synchronize()` and must not update WatermelonDB's global sync cursor. |
| II. Documented Business Logic         | PASS   | Startup routing/privacy decisions and shared reference-data visibility are finalized business rules. `docs/business/business-decisions.md` must be updated before product-code implementation begins.                                                                   |
| III. Type Safety                      | PASS   | New service contracts use explicit interfaces, zod validation for Supabase profile/shared-data responses, no `any`, explicit return types.                                                                                                                              |
| IV. Service-Layer Separation          | PASS   | Profile bootstrap, authenticated shared-data refresh, sync orchestration, and local cleanup live in mobile services/providers. Hooks observe lifecycle/state only. Components render retry/status/loading affordances.                                                  |
| V. Premium UI with Consistent Theming | PASS   | Removing `InitialSyncOverlay` shifts loading to existing screens/skeletons. Any new retry/status affordance uses NativeWind and the existing `<Skeleton>` pattern for content loading.                                                                                  |
| VI. Monorepo Package Boundaries       | PASS   | Changes stay in `apps/mobile/`, `supabase/migrations/`, and tests. `packages/db` changes are not expected unless generated types change after RLS migration tooling. No reverse imports.                                                                                |
| VII. Local-First Migrations           | PASS   | RLS/grant changes are implemented as a local SQL migration in `supabase/migrations/`, then verified. No Supabase dashboard or MCP DDL changes.                                                                                                                          |

**No constitutional violations. No complexity exception required.**

## Project Structure

### Documentation (this feature)

```text
specs/027-post-auth-bootstrap/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- startup-bootstrap.md
|   |-- sync-services.md
|   `-- rls-shared-data.md
|-- spec.md
`-- checklists/
    `-- requirements.md
```

### Source Code (repository root)

```text
apps/mobile/
|-- app/
|   |-- _layout.tsx                         # Remove normal InitialSyncOverlay rendering once bootstrap state replaces it
|   `-- index.tsx                           # Route from bootstrap/profile trust state; retry on unsafe unknowns
|-- components/
|   |-- AppReadyGate.tsx                    # Wait for auth + bootstrap/profile decision, not full account sync
|   `-- ui/
|       `-- AccountLoadRecoveryScreen.tsx   # Profile bootstrap recovery UI
|-- context/
|   `-- CategoriesContext.tsx               # Scope category observations to ownerless system + current user custom rows
|-- hooks/
|   |-- useProfile.ts                       # Current-user-only profile observation
|   |-- useTransactions.ts                  # Audit/add current-user scope before faster routing ships
|   |-- usePeriodSummary.ts                 # Audit/add current-user scope
|   |-- useRecurringPayments.ts             # Audit/add current-user scope
|   `-- useNetWorth.ts                      # Audit child/snapshot ownership paths
|-- providers/
|   `-- SyncProvider.tsx                    # Own bootstrap state and background sync status
|-- services/
|   |-- profile-bootstrap-service.ts        # New: fetch/apply current user profile without cursor advancement
|   |-- shared-reference-refresh-service.ts # New: post-auth market rates + ownerless system categories only
|   |-- sync.ts                             # Extract reusable transformers/apply helpers; keep full sync global
|   `-- user-data-access.ts                 # Extend query helpers for scoped hooks
`-- __tests__/
    |-- services/
    |   |-- profile-bootstrap-service.test.ts
    |   |-- shared-reference-refresh-service.test.ts
    |   `-- sync.test.ts
    |-- providers/
    |   `-- SyncProvider.test.tsx
    |-- app/
    |   `-- index.test.tsx
    `-- hooks/
        |-- useProfile.test.ts
        |-- useTransactions.test.ts
        |-- usePeriodSummary.test.ts
        |-- useRecurringPayments.test.ts
        `-- useNetWorth.test.ts

supabase/
`-- migrations/
    `-- 046_authenticated_shared_reference_data_rls.sql
```

**Structure Decision**: Mobile-first implementation with one local Supabase SQL
migration. No new backend service, no local schema changes expected, and no new
shared logic package.

## Implementation Strategy

1. Write failing tests first for profile bootstrap, startup routing, overlay
   removal, RLS expectations, authenticated shared-data refresh scope, and
   user-scoped local reads.
2. Extract reusable Supabase-to-Watermelon transformation from `sync.ts` so the
   bootstrap service and full sync use the same conversion rules.
3. Add `profile-bootstrap-service.ts` that fetches
   `profiles.user_id = currentUserId`, validates the row, purges foreign local
   profiles, applies the profile via WatermelonDB remote-change semantics, and
   returns a typed bootstrap result within the 30-second hang guard.
4. Refactor `SyncProvider` from "initial full sync gates routing" to "profile
   bootstrap gates routing; full sync refreshes in background". Keep existing
   periodic sync and module-level sync lock.
5. Update `AppReadyGate` and `app/index.tsx` to wait for bootstrap/profile trust
   state instead of full sync. Trusted offline dashboard routing requires a
   current-user, non-deleted, locally onboarded profile.
6. Remove the normal sign-in/sign-up `InitialSyncOverlay` path. Background sync
   failures surface through a non-blocking authenticated-screen status/error
   affordance, while the dashboard uses a dashboard-shaped skeleton during the
   first post-bootstrap dependency refresh.
7. Add authenticated shared reference-data refresh for only `market_rates` and
   ownerless system categories after profile bootstrap. Do not request shared
   data before authentication, and do not fetch custom categories or dashboard
   data through this shared refresh path.
8. Add a local-read privacy audit and scope any dashboard-facing hooks that can
   currently observe unowned local rows before faster routing is released.
9. Add SQL migration for authenticated shared reference reads: `market_rates`
   readable by `authenticated`; categories readable to authenticated users when
   `is_system = true`, `user_id IS NULL`, and not deleted; current user custom
   category policy remains authenticated and owner-scoped. Do not add new `anon`
   shared-data access for this feature.
10. Verify with unit/integration tests, migration/RLS checks, and a clean
    reinstall manual QA flow using an existing onboarded account.
11. Keep structured, non-PII timing logs around profile bootstrap, shared
    reference refresh, and full sync so startup-delay regressions can be
    diagnosed from device logs.

## Complexity Tracking

No justified constitution violations.
