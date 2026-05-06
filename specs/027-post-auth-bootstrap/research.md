# Research: Post-Auth Bootstrap Sync

## Decision: Do not use `synchronize()` for profile bootstrap

**Rationale**: WatermelonDB's `synchronize()` reads the global `lastPulledAt`,
applies remote changes, then calls `setLastPulledAt()` after applying the pull.
Using it for a partial profile-only pull would mark the whole database as pulled
at the new timestamp even though other tables were intentionally omitted. That
would risk missed remote rows on the next normal sync.

**Implementation implication**: The bootstrap service should use the same
remote-apply behavior WatermelonDB uses internally, but without cursor writes.
The local package exposes `applyRemoteChanges` under
`@nozbe/watermelondb/sync/impl/applyRemote`. Wrap that import in one local
adapter so usage is isolated and testable.

**Alternatives considered**:

- Full `syncDatabase(database, true)` before routing: correct but preserves the
  slow blocking startup this feature removes.
- `synchronize()` with only the profile table: rejected because it advances the
  global cursor.
- Plain `profile.update()`: rejected for remote bootstrap because it marks the
  profile locally dirty and may push server-origin values back as local changes.

## Decision: Keep one background full sync after routing

**Rationale**: WatermelonDB sync state is global. A selective startup pull
should only unblock routing; it should not become a second independent sync
protocol. After bootstrap succeeds or a trusted offline profile permits
dashboard access, the existing `syncDatabase()` remains the path that restores
the full local database and advances sync metadata consistently.

**Alternatives considered**:

- Per-table on-demand sync with independent cursors: useful long-term, but it
  would require custom cursor storage, conflict rules, and table dependency
  ordering. Too risky for this bug fix.
- Continue full force sync before routing: safe but fails the performance goal.

## Decision: Keep shared reference reads authenticated-only for this feature

**Rationale**: Pre-auth screens do not need market rates or categories. Loading
shared reference data before sign-in/sign-up would spend network and local write
time before the app knows the user will enter the authenticated experience.
Keeping the refresh after authentication preserves the startup performance goal
without expanding `anon` access.

Supabase's docs say grants determine which roles can reach a table through the
Data API, and RLS policies determine which rows those roles can access. This
feature should therefore keep shared reference policies explicit for the
`authenticated` role and avoid introducing new `anon` shared-data reads.

**Policy shape**:

- `market_rates`: `SELECT` grant/policy for `authenticated`.
- `categories`: shared authenticated `SELECT` policy using
  `is_system = true AND user_id IS NULL AND deleted = false`.
- `categories`: authenticated current-user custom category policies remain
  `user_id = (select auth.uid())`. Do not add `deleted = false` to the
  authenticated sync policy because WatermelonDB must pull soft-deleted rows to
  delete local records.
- A user-owned category stays private even if `is_system = true`.
- The mobile app must not request `market_rates` or `categories` before
  authentication as part of this feature.

**Sources**:

- Supabase RLS role docs:
  https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Data API security docs:
  https://supabase.com/docs/guides/api/securing-your-api

**Alternatives considered**:

- Allow `anon` reads for market rates and ownerless system categories: rejected
  because signed-out screens do not use the data, so this would add startup work
  and policy surface without current user value.
- Make all categories public: rejected because custom category names are private
  user-created data.
- Use a view for shared categories: unnecessary for this feature and adds a
  view/RLS security surface. Direct table policy is simpler.

## Decision: Bootstrap recovery appears after 30 seconds only for hangs

**Rationale**: The user expects profile verification to wait when the network is
merely slow, but a no-result hang cannot trap the startup forever. Immediate
known errors should show recovery immediately. Only the "no success and no
error" case waits 30 seconds.

**Alternatives considered**:

- Wait forever: rejected because it can deadlock startup.
- Fail immediately on slow network: rejected because it would show avoidable
  recovery for a request that may complete shortly.

## Decision: Trusted offline routing is dashboard-only

**Rationale**: When remote verification is unavailable, routing into onboarding
from a local false/missing profile can overwrite or conflict with a returning
user's server profile. The only safe offline shortcut is a current-user,
non-deleted local profile that already says onboarding is complete.

**Alternatives considered**:

- Trust local `onboarding_completed = false`: rejected because the reported bug
  is exactly stale local false data overriding a remote true profile.
- Trust any local profile row: rejected because stale/foreign rows previously
  leaked into local profiles.

## Decision: Faster routing requires local-read privacy hardening

**Rationale**: Removing the blocking sync means screens can render sooner from
whatever is already in SQLite. That is only safe if user-facing hooks prove row
ownership. Current code already has user-data access helpers, but several
dashboard-facing hooks and global category observations need explicit current
user scoping or ownerless-system filtering before this ships.

**Known audit targets from code dive**:

- `apps/mobile/context/CategoriesContext.tsx`
- `apps/mobile/hooks/useTransactions.ts`
- `apps/mobile/hooks/usePeriodSummary.ts`
- `apps/mobile/hooks/useRecurringPayments.ts`
- `apps/mobile/hooks/useNetWorth.ts`
- any child-table reads whose ownership is only knowable through parent tables

**Alternatives considered**:

- Rely on logout reset and Supabase RLS only: rejected because the bug already
  showed local rows can be stale or leaked.
- Delay all screens until full sync: rejected because it preserves the current
  performance problem.
