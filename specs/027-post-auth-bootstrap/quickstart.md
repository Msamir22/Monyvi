# Quickstart: Post-Auth Bootstrap Sync

## Prerequisites

- Use Git Bash for Spec Kit scripts on this machine:
  `C:\Program Files\Git\bin\bash.exe`.
- Current feature branch: `381-post-auth-bootstrap`.
- Active spec directory: `specs/027-post-auth-bootstrap`.

## Planning Commands

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .specify/scripts/bash/setup-plan.sh --json
& 'C:\Program Files\Git\bin\bash.exe' .specify/scripts/bash/update-agent-context.sh codex
```

## Implementation Verification Checklist

1. Write failing Jest tests for the profile bootstrap result matrix: remote
   onboarded profile, remote unfinished profile, remote error with trusted local
   onboarded profile, remote error with local false/missing profile, and hanging
   verification after 30 seconds.
2. Verify profile bootstrap applies remote rows without advancing WatermelonDB's
   `lastPulledAt`.
3. Verify a clean local DB for an existing onboarded Supabase user routes to
   dashboard and applies stored language/currency preferences before first
   authenticated paint.
4. Verify a new user routes to onboarding without the normal
   `InitialSyncOverlay`.
5. Verify background full sync starts after routing and non-blocking sync error
   UI appears when it fails.
6. Verify signed-out startup does not request `market_rates` or `categories`.
7. Verify authenticated shared reference refresh returns `market_rates` and
   ownerless system categories only, without fetching custom categories through
   the shared refresh path.
8. Verify dashboard-facing hooks do not expose stale/foreign local rows when the
   device contains data from another user.
9. Verify the returning-user first authenticated route paints in under 3 seconds
   on a Pixel-class physical Android device or iPhone on stable Wi-Fi. Measure
   from local authenticated-session availability to the first authenticated
   screen paint, excluding external OAuth/email authentication time.
10. Verify the dashboard does not render false empty account/rate/category data
    while first post-bootstrap data is still hydrating. For issue 381, the
    expected behavior is the dashboard-shaped skeleton; progressive
    section-level hydration is tracked by GitHub issue #612.

## Implementation Notes

- Profile bootstrap is the only startup gate for authenticated routing. It pulls
  and applies the current user's profile without advancing WatermelonDB sync
  metadata.
- The normal sign-in/sign-up `InitialSyncOverlay` path is removed. Startup now
  keeps the native splash during the bootstrap gate. The dashboard then uses the
  dashboard-shaped skeleton while first post-bootstrap dashboard dependencies
  hydrate, instead of showing the old full-screen sync overlay.
- Shared reference data refresh is post-auth only. It requests `market_rates`
  and ownerless system categories; custom user categories are handled by the
  authenticated account sync path.
- The post-bootstrap shared-reference refresh runs before the full background
  sync to avoid concurrent local apply writes. It does not block the startup
  route decision, but dashboard content remains in the dashboard skeleton until
  the first post-bootstrap refresh settles because market rates and system
  categories are dashboard dependencies.
- Dashboard-facing local reads are scoped to the current authenticated user so
  early rendering cannot expose stale rows left by another local profile.
- Structured non-PII timing logs are emitted for profile bootstrap, shared
  reference refresh, full sync, and the overall post-bootstrap refresh window.

## RLS Verification

- Migration file:
  `supabase/migrations/046_authenticated_shared_reference_data_rls.sql`.
- Apply the local migration with `npm run db:push`.
- Regenerate local database types/schema with `npm run db:migrate`.
- As signed out/pre-auth, the mobile app does not request `public.market_rates`
  or `public.categories`.
- As authenticated user A, `select * from public.market_rates` succeeds.
- As authenticated user A, category reads include ownerless system categories
  and user A's custom categories.
- As authenticated user A, category reads do not include user B's custom
  categories.
- A row with `user_id is not null` and `is_system = true` is not visible to
  authenticated user B.

## Suggested Test Commands

```powershell
npm test -- --runInBand apps/mobile/__tests__/services/remote-apply-service.test.ts apps/mobile/__tests__/services/sync-transform.test.ts apps/mobile/__tests__/services/user-data-access.test.ts
npm test -- --runInBand apps/mobile/__tests__/services/profile-bootstrap-service.test.ts
npm test -- --runInBand apps/mobile/__tests__/services/shared-reference-refresh-service.test.ts apps/mobile/__tests__/context/CategoriesContext.test.tsx
npm test -- --runInBand apps/mobile/__tests__/providers/SyncProvider.test.tsx
npm test -- --runInBand apps/mobile/__tests__/app/index.test.tsx
npm test -- --runInBand apps/mobile/__tests__/hooks/useProfile.test.ts
npm test -- --runInBand apps/mobile/__tests__/hooks/useTransactions.test.ts apps/mobile/__tests__/hooks/usePeriodSummary.test.ts apps/mobile/__tests__/hooks/useRecurringPayments.test.ts apps/mobile/__tests__/hooks/useNetWorth.test.ts
npx tsc -p apps/mobile/tsconfig.json --noEmit --pretty false
npm run lint
```

## Manual QA Flow

1. Use an existing remote user with `onboarding_completed = true`,
   `preferred_language = ar`, and a non-default preferred currency.
2. Clear app data or reinstall.
3. Sign in.
4. Expected: dashboard appears first, not currency selection; no normal
   full-screen sync overlay appears.
5. Expected: language/currency reflect the remote profile values.
6. Expected: dashboard sections may show skeletons while account history
   refreshes. In issue 381, the whole dashboard content may remain in the
   dashboard-shaped skeleton until the first post-bootstrap refresh settles.
7. Simulate network failure after routing.
8. Expected: current screen remains usable and shows a non-blocking sync problem
   indication.
9. Sign out, then sign up with a new user.
10. Expected: onboarding appears after profile verification; no normal
    full-screen sync overlay appears.
11. Expected: retry/recovery appears instead of onboarding if profile
    verification errors, times out after 30 seconds, or produces no safe local
    fallback profile.
