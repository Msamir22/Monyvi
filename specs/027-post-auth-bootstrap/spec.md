# Feature Specification: Post-Auth Bootstrap Sync

**Feature Branch**: `381-post-auth-bootstrap`  
**Created**: 2026-05-06  
**Status**: Draft  
**Input**: User description: "Improve post-auth startup so users are unblocked
by a profile bootstrap instead of a full blocking sync, remove the normal
initial sync overlay, refresh shared reference data only after authentication,
and keep custom user data protected." Tracking issue:
https://github.com/Msamir22/Monyvi/issues/603

## Clarifications

### Session 2026-05-06

- Q: Should shared market rates and categories be loaded before authentication?
  -> A: No. Pre-auth screens do not need this data, so loading it before
  sign-in/sign-up would add startup cost without user value.
- Q: Should categories become fully public? -> A: No. Only system categories are
  shared. User-created custom categories remain private and visible only to
  their owning authenticated user.
- Q: Should the blocking initial sync overlay be removed for sign-in only or
  also sign-up? -> A: Remove it for both normal sign-in and sign-up. Both flows
  should use the same model: bootstrap the profile, route, then show real
  screens with loading states while the rest of the user's data refreshes in the
  background.
- Q: What happens when the profile bootstrap cannot determine a trustworthy
  current-user profile? -> A: Do not route into onboarding by default. Show a
  recoverable state with retry and sign-out choices unless a trusted local
  onboarded profile already allows offline dashboard access.
- Q: When remote profile verification is unavailable, which local profile state
  may be trusted for routing? -> A: Only a current-user, non-deleted local
  profile with `onboarding_completed = true` may route offline to dashboard.
  Missing, foreign, deleted, or locally unfinished profiles must show recovery
  instead of onboarding.
- Q: How should the app surface background refresh failures after the user has
  already routed? -> A: Show a non-blocking sync status or error affordance on
  authenticated screens. Do not hide the screen, return to startup retry, or
  block normal local-first usage.
- Q: Which category rows are shared after authentication? -> A: Only categories
  that are both system-defined and have no owner user are shared across users.
  Any user-owned category remains private even if it is incorrectly marked as
  system.
- Q: How long should profile bootstrap wait before showing the recoverable
  startup state if no success or error arrives? -> A: 30 seconds. Immediate
  errors should show recovery sooner; the 30-second limit only handles hanging
  verification.
- Q: Which shared data should this feature refresh early? -> A: After
  authentication and profile bootstrap, refresh only market rates and ownerless
  system categories as non-blocking shared reference data. Custom categories and
  dashboard-specific user data remain authenticated/current-user scoped.
- Q: Should issue 381 ship progressive per-section dashboard hydration? -> A:
  No. The issue 381 implementation keeps the normal sync overlay removed, but
  uses a dashboard-shaped skeleton gate while the first post-bootstrap dashboard
  dependencies are hydrated. Progressive section-level hydration is tracked
  separately in GitHub issue #612.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Returning user reaches dashboard quickly (Priority: P1)

A returning user signs in after reinstalling the app, clearing app data, or
using a new device. The app restores the user's account profile first, uses it
to decide whether onboarding is already complete, and routes the user to the
dashboard without waiting for the full account history to finish loading.

**Why this priority**: This is the core user pain. A returning user who has
already completed setup should not wait behind a full data restore before the
app can decide that they belong on the dashboard.

**Independent Test**: Use an existing user whose server profile is marked as
onboarded and has stored language and currency preferences. Sign in from a clean
local state. Verify that the first post-auth destination is the dashboard, not
onboarding, and that the full blocking sync overlay is not shown.

**Acceptance Scenarios**:

1. **Given** a returning user whose account profile says onboarding is complete,
   **When** the user signs in from a clean local state, **Then** the app routes
   to the dashboard after the profile is restored, without showing the normal
   blocking sync overlay.
2. **Given** the same returning user has a large amount of historical data,
   **When** the dashboard route is selected, **Then** the normal sync overlay is
   not shown and the dashboard uses a dashboard-shaped skeleton until the first
   post-bootstrap dashboard dependencies are trustworthy.
3. **Given** the user's stored language and currency differ from app defaults,
   **When** the first post-auth screen appears, **Then** the visible experience
   reflects the stored profile preferences.
4. **Given** background refresh fails after the dashboard appears, **When** the
   user continues using the app, **Then** the dashboard remains usable and shows
   a non-blocking refresh problem indication.

---

### User Story 2 - New user starts onboarding without artificial waiting (Priority: P1)

A new user signs up and is routed to the required onboarding step as soon as the
app can trust the user's profile state. The app does not show a full-screen
data-sync overlay when there is no meaningful historical data to restore.

**Why this priority**: New-user activation should stay fast and simple. Showing
a sync overlay for an account with only a profile row adds friction without
providing value.

**Independent Test**: Create a new user with a fresh profile that has not
completed onboarding. Complete authentication. Verify that the app routes to the
required onboarding step without the normal blocking sync overlay.

**Acceptance Scenarios**:

1. **Given** a newly created user whose profile says onboarding is not complete,
   **When** authentication completes, **Then** the app routes to onboarding
   after the profile is available.
2. **Given** the new user has no historical financial data, **When** onboarding
   begins, **Then** the app does not delay behind a full-data restore message.
3. **Given** onboarding completes successfully, **When** the user reaches the
   dashboard, **Then** subsequent data refresh continues normally in the
   background.

---

### User Story 3 - Shared reference data refreshes after auth without exposing private categories (Priority: P2)

After authentication and profile bootstrap, the app may refresh shared reference
data that authenticated screens need: market rates and ownerless system
categories. The refresh must be non-blocking, must not delay pre-auth screens,
and must keep user-created custom categories private to their owning
authenticated user.

**Why this priority**: Shared data is useful after the app knows the user is
entering the authenticated experience, but loading it before sign-in/sign-up
slows the wrong part of startup and expands access requirements without benefit.

**Independent Test**: Start the app signed out and verify no market-rate or
category refresh is requested. Then sign in, complete profile bootstrap, and
verify the shared refresh fetches market rates and ownerless system categories
without requesting custom categories or dashboard-specific user data. As a
signed-in user, verify category reads include ownerless system categories plus
the current user's custom categories, and never another user's custom
categories.

**Acceptance Scenarios**:

1. **Given** the app is opened before authentication, **When** the sign-in or
   sign-up screen appears, **Then** no market-rate or category refresh is
   started.
2. **Given** authentication and profile bootstrap have succeeded, **When**
   shared reference refresh starts, **Then** market rates and ownerless system
   categories are refreshed without blocking the first authenticated screen.
3. **Given** a user has custom categories, **When** shared reference refresh
   runs, **Then** those custom categories are not fetched by the shared refresh
   path.
4. **Given** the same user is authenticated, **When** category data is observed
   through the authenticated path, **Then** the user sees both ownerless system
   categories and their own custom categories.

---

### User Story 4 - Startup failures avoid destructive wrong routing (Priority: P2)

If the app cannot verify the current user's profile during startup, it avoids
routing the user into onboarding as a fallback. The user receives a clear
recovery path instead of being asked to re-answer setup questions that could
conflict with their existing account.

**Why this priority**: The worst failure mode is silently treating a returning
user as new and allowing them to overwrite trusted preferences or create
duplicate setup data.

**Independent Test**: Simulate a startup where the current user's profile cannot
be fetched and no trustworthy local profile is available. Verify that the app
shows a recoverable state with Retry and Sign out, and does not route to
onboarding.

**Acceptance Scenarios**:

1. **Given** a returning user signs in while the profile cannot be verified,
   **When** the startup decision is needed, **Then** the app shows Retry and
   Sign out instead of onboarding.
2. **Given** the user taps Retry after the issue is resolved, **When** the
   profile becomes available, **Then** the app routes according to the restored
   profile state.
3. **Given** the user taps Sign out, **When** sign-out completes, **Then** the
   app returns to the signed-out flow without exposing prior private data.
4. **Given** profile verification hangs without success or error, **When** 30
   seconds elapse, **Then** the app shows the recoverable startup state.

---

### Edge Cases

- A signed-in returning user opens the app offline with a trusted local
  onboarded profile already present.
- A signed-in returning user opens the app offline after local data was cleared
  and no trusted local onboarded profile exists.
- A user's local profile exists but belongs to a different account from the
  current session.
- A user's local profile exists but has stale onboarding or language values
  compared with the server profile.
- A current user's local profile exists but says onboarding is unfinished while
  remote verification is unavailable.
- The profile is restored but background refresh fails or times out.
- Shared reference data is not requested before authentication.
- A category has an owner user while also being marked as system-defined.
- A user switches accounts on the same device after shared data has already been
  refreshed.
- The server contains a profile inconsistency, such as an authenticated user
  with no profile row.
- Profile verification neither succeeds nor returns an error within 30 seconds.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST restore the current user's profile before making
  the first authenticated onboarding-versus-dashboard routing decision, except
  when a trusted local onboarded profile already supports offline dashboard
  access.
- **FR-002**: The system MUST NOT require a full account-data restore before
  routing a returning onboarded user to the dashboard.
- **FR-003**: The system MUST NOT show the normal blocking initial sync overlay
  during standard sign-in or sign-up startup.
- **FR-004**: The system MUST continue refreshing the user's remaining account
  data after routing so offline completeness is restored in the background.
- **FR-005**: The system MUST avoid rendering false empty dashboard content
  while first post-bootstrap dashboard dependencies are still hydrating. For
  issue 381, this is satisfied with a dashboard-shaped skeleton gate; finer
  section-level hydration is tracked separately in GitHub issue #612.
- **FR-006**: The system MUST route an onboarded returning user to the dashboard
  when the restored profile says onboarding is complete.
- **FR-007**: The system MUST route a new or unfinished user to onboarding when
  the restored profile says onboarding is not complete.
- **FR-008**: The system MUST apply restored profile preferences before the
  first visible authenticated screen whenever those preferences are available.
- **FR-009**: The system MUST remove locally cached profile rows that do not
  belong to the current authenticated user before those rows can influence
  routing or visible profile state.
- **FR-010**: If the current user's profile cannot be verified and no
  trustworthy local onboarded profile is available, the system MUST show a
  recoverable state with Retry and Sign out, and MUST NOT route to onboarding by
  default.
- **FR-017**: When remote profile verification is unavailable, the system MUST
  treat only a current-user, non-deleted local profile with onboarding already
  complete as trustworthy for offline dashboard routing.
- **FR-018**: When remote profile verification is unavailable, the system MUST
  NOT trust missing, foreign, deleted, or locally unfinished profile states for
  onboarding routing.
- **FR-011**: The system MUST NOT request shared market-rate or category data
  before authentication.
- **FR-012**: The system MUST treat only categories that are both system-defined
  and have no owner user as shared system categories.
- **FR-013**: The system MUST keep user-created custom categories private to the
  owning authenticated user.
- **FR-021**: A user-owned category MUST remain private from other users even if
  it is incorrectly marked as system-defined.
- **FR-014**: After authentication, the system MUST make both shared system
  categories and the current user's custom categories available to that user.
- **FR-015**: The system MUST keep private financial data and user-created data
  scoped to the current user while faster routing and background refresh are in
  progress.
- **FR-016**: The system MUST provide observable startup outcomes for
  diagnostics without recording personally identifiable information.
- **FR-019**: If background account-data refresh fails after routing, the system
  MUST surface a non-blocking status or error affordance on authenticated
  screens.
- **FR-020**: Background account-data refresh failure MUST NOT hide the current
  authenticated screen, return the user to the startup retry state, or block
  local-first usage of already available data.
- **FR-022**: Profile verification MUST show the recoverable startup state after
  30 seconds without success or error.
- **FR-023**: Profile verification errors MUST show the recoverable startup
  state as soon as the error is known, without waiting for the 30-second limit.
- **FR-024**: Shared reference-data refresh in this feature MUST run only after
  authentication and profile bootstrap.
- **FR-025**: Shared reference-data refresh in this feature MUST be limited to
  market rates and ownerless system categories, and MUST NOT fetch custom
  categories or dashboard-specific user data.

### Key Entities _(include if feature involves data)_

- **User Profile**: The account-level state used for startup routing and
  preferences. Key attributes include onboarding completion, preferred language,
  preferred currency, deletion state, and owning user.
- **Startup Bootstrap State**: The short-lived startup outcome that says whether
  the app can safely route, must retry, or can continue offline from trusted
  local profile state.
- **Shared Market Rate**: Non-sensitive reference data refreshed only after
  authentication in this feature.
- **System Category**: A shared, app-defined category with no owner user that
  may be visible to authenticated users.
- **Custom Category**: A user-created category that belongs to one user and must
  never be visible to another user.
- **Background Data Refresh**: The ongoing account-data restore that continues
  after the first route decision and fills screen-level loading states.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of returning users with an onboarded profile route to the
  dashboard without seeing the normal blocking sync overlay.
- **SC-002**: 100% of new users with an unfinished profile route to onboarding
  without seeing the normal blocking sync overlay.
- **SC-003**: A returning user with a valid profile reaches the first
  authenticated screen in under 3 seconds on a Pixel-class physical Android
  device or iPhone on stable Wi-Fi, measured from local authenticated-session
  availability to first authenticated route paint and excluding external
  authentication time.
- **SC-004**: 0 verified test cases route a user into onboarding when the user's
  profile cannot be verified.
- **SC-005**: 0 pre-auth startup flows request market-rate or category data.
- **SC-006**: 100% of tested clean-local-state dashboard entries avoid false
  empty dashboard content before the first post-bootstrap refresh settles. The
  shipped issue 381 behavior may block dashboard content behind a
  dashboard-shaped skeleton; progressive non-blocking section hydration is out
  of scope and tracked in GitHub issue #612.
- **SC-007**: Internal QA can reproduce a clean reinstall for an existing user
  and observe dashboard routing, profile preferences, and background data
  refresh working in a single flow.
- **SC-008**: 100% of simulated background refresh failures after routing leave
  the current screen usable and display a non-blocking refresh problem
  indication.
- **SC-009**: 100% of simulated hanging profile-verification attempts show Retry
  and Sign out within 30 seconds.

## Assumptions

- The app remains offline-first: once trusted local data exists, user-facing
  reads come from local state, and remote refresh is background work.
- A trusted local onboarded profile means the profile belongs to the current
  authenticated user, is not deleted, and records onboarding as complete.
- The first implementation is limited to profile bootstrap, authenticated shared
  reference-data refresh, startup routing, and overlay removal. Broader
  per-screen or per-domain on-demand sync is out of scope.
- Issue 381 intentionally keeps shared reference refresh in the dashboard
  hydration path because market rates and system categories are dashboard
  dependencies. Moving those dependencies behind section-level skeletons is
  deferred to issue #612.
- Shared reference-data refresh in this feature means only market rates and
  ownerless system categories after authentication/profile bootstrap.
- Shared market rates and ownerless system categories are not sensitive user
  data, but this feature still keeps them out of pre-auth startup because
  pre-auth screens do not need them.
- User-created categories are private because category names can reveal personal
  financial habits.
- The normal blocking sync overlay may still be replaced by a different blocking
  state for exceptional operations such as account cleanup, database repair, or
  migrations.
- Background refresh failures should be recoverable and visible through
  non-blocking UI, not through forced onboarding, startup retry, or full-screen
  blocking states.
- Existing onboarding behavior after routing remains governed by the current
  onboarding specifications unless explicitly changed by this feature.

## Dependencies

- GitHub tracking issue: https://github.com/Msamir22/Monyvi/issues/603
- Existing onboarding routing behavior from
  `specs/024-skip-returning-onboarding` and `specs/026-onboarding-restructure`.
- Existing local-first privacy boundary: only current-user data should influence
  user-facing screens.
- Existing shared-data taxonomy: system categories are app-defined; custom
  categories are user-created.
