# Data Model: Post-Auth Bootstrap Sync

## User Profile

Existing syncable entity in `profiles`.

**Fields used by this feature**:

- `id`: Watermelon/Supabase row id.
- `user_id`: authenticated owner. Must match the current Supabase user id.
- `onboarding_completed`: routes dashboard when true.
- `preferred_language`: applied before the first authenticated screen when
  available.
- `preferred_currency`: used by dashboard/account flows after routing.
- `deleted`: deleted profiles are never trusted for routing.
- `updated_at`: remote conflict/sync ordering for normal full sync.

**Validation rules**:

- Bootstrap remote query must select only `user_id = currentUserId`.
- Local routing may trust only a current-user, non-deleted profile.
- Offline routing may route to dashboard only when that trusted local profile
  has `onboarding_completed = true`.
- Missing, foreign, deleted, or locally unfinished profiles require remote
  verification or recovery; they do not route to onboarding by fallback.

## Startup Bootstrap State

Short-lived app state owned by the sync/startup layer.

**States**:

- `idle`: no authenticated bootstrap currently required.
- `checking`: profile bootstrap is in progress.
- `ready-remote-profile`: remote profile was fetched and applied locally.
- `ready-local-trusted`: remote verification unavailable, but trusted local
  onboarded profile permits offline dashboard routing.
- `needs-recovery`: no trustworthy profile decision can be made.

**Result fields**:

- `status`: one of the state values above.
- `reason`: stable diagnostic code, no PII.
- `canRoute`: true only for ready states.
- `routeBasis`: `remote-profile`, `trusted-local-profile`, or `none`.
- `profileId`: internal-only; do not log.

**Transitions**:

```text
idle -> checking
checking -> ready-remote-profile
checking -> ready-local-trusted
checking -> needs-recovery
needs-recovery -> checking
ready-remote-profile -> idle on sign-out
ready-local-trusted -> idle on sign-out
```

## Shared Market Rate

Existing read-only shared entity in `market_rates`.

**Rules**:

- Read by the mobile app only after authentication in this feature.
- Remains pull-only from the mobile app.
- May be refreshed after profile bootstrap without blocking the first
  authenticated screen.
- Must not require a user id.

## System Category

Existing category row that is app-defined and ownerless.

**Shared authenticated visibility rule**:

- `is_system = true`
- `user_id IS NULL`
- `deleted = false`

Only rows matching all three conditions are shared across authenticated users.

## Custom Category

Existing category row created by a user.

**Privacy rule**:

- Any row with `user_id IS NOT NULL` is private to the owning authenticated
  user, even when `is_system = true`.
- Authenticated category reads include ownerless system categories plus the
  current user's custom categories.
- Signed-out startup must not request categories in this feature.

## Background Data Refresh

Existing full sync process after routing.

**Rules**:

- Runs after bootstrap without blocking the first authenticated route.
- Uses normal `syncDatabase()` / WatermelonDB `synchronize()` semantics.
- Advances WatermelonDB's global sync cursor only after a full pull result is
  applied.
- Failure after routing is non-blocking and visible through authenticated-screen
  sync status.
