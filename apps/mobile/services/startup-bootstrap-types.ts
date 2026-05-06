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

export type ProfileBootstrapRouteBasis =
  | "remote-profile"
  | "trusted-local-profile"
  | "none";

export interface ProfileBootstrapResult {
  readonly status: ProfileBootstrapStatus;
  readonly reason: ProfileBootstrapReason;
  readonly routeBasis: ProfileBootstrapRouteBasis;
}

export interface BootstrapCurrentProfileOptions {
  readonly timeoutMs: number;
  readonly userId?: string | null;
}
