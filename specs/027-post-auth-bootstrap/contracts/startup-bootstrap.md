# Contract: Startup Bootstrap

## Service

`apps/mobile/services/profile-bootstrap-service.ts`

```ts
export type ProfileBootstrapStatus =
  | "ready-remote-profile"
  | "ready-local-trusted"
  | "needs-recovery";

export type ProfileBootstrapReason =
  | "remote-profile-applied"
  | "trusted-local-onboarded-profile"
  | "remote-profile-unfinished"
  | "remote-profile-missing"
  | "remote-profile-deleted"
  | "remote-profile-error"
  | "remote-profile-timeout"
  | "local-profile-missing"
  | "local-profile-foreign"
  | "local-profile-unfinished"
  | "local-profile-deleted";

export interface ProfileBootstrapResult {
  readonly status: ProfileBootstrapStatus;
  readonly reason: ProfileBootstrapReason;
  readonly routeBasis: "remote-profile" | "trusted-local-profile" | "none";
}

export interface BootstrapCurrentProfileOptions {
  readonly timeoutMs: number;
}

export function bootstrapCurrentProfile(
  database: Database,
  options: BootstrapCurrentProfileOptions
): Promise<ProfileBootstrapResult>;
```

## Behavioral Rules

- Must fetch only the current authenticated user's profile.
- Must purge local profile rows whose `user_id` does not match the current user
  before routing can observe them.
- Must apply the remote profile to WatermelonDB using remote-change semantics.
- Must not call WatermelonDB `synchronize()` for the bootstrap.
- Must not advance WatermelonDB's global `lastPulledAt`.
- Must return recovery immediately on known remote errors.
- Must return recovery after `timeoutMs` when no success or error arrives.
- Must allow offline dashboard routing only from a current-user, non-deleted,
  locally onboarded profile.

## Routing Consumers

- `SyncProvider` owns the bootstrap state and retry action.
- `AppReadyGate` waits for auth plus bootstrap/profile readiness, not full
  account sync.
- `app/index.tsx` routes dashboard/onboarding/retry from trusted local profile
  state and bootstrap result.
