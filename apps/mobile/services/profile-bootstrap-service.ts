import { Profile, type SupabaseDatabase } from "@monyvi/db";
import { Q, type Database } from "@nozbe/watermelondb";
import type { SyncDatabaseChangeSet } from "@nozbe/watermelondb/sync";
import { applyRemoteChangeSetWithoutCursor } from "./remote-apply-service";
import {
  type BootstrapCurrentProfileOptions,
  type ProfileBootstrapResult,
} from "./startup-bootstrap-types";
import { getCurrentUserId, supabase } from "./supabase";
import { transformFromSupabase } from "./sync-transform";
import { logger } from "@/utils/logger";

const REMOTE_PROFILE_TIMEOUT_CODE = "remote-profile-timeout";

type RemoteProfileRow = SupabaseDatabase["public"]["Tables"]["profiles"]["Row"];

function getElapsedMs(startedAtMs: number): number {
  return Date.now() - startedAtMs;
}

type FetchCurrentProfileResult =
  | { readonly status: "success"; readonly profile: RemoteProfileRow | null }
  | { readonly status: "error" }
  | { readonly status: "timeout" };

export async function bootstrapCurrentProfile(
  database: Database,
  options: BootstrapCurrentProfileOptions
): Promise<ProfileBootstrapResult> {
  const bootstrapStartedAtMs = Date.now();
  const userId = options.userId ?? (await getCurrentUserId());
  if (!userId) {
    logger.warn("profileBootstrap.noAuthenticatedUser");
    return needsRecovery("remote-profile-error");
  }

  logger.info("profileBootstrap.start", {
    hasProvidedUserId: Boolean(options.userId),
    timeoutMs: options.timeoutMs,
  });

  const purgeStartedAtMs = Date.now();
  await purgeForeignProfiles(database, userId);
  logger.info("profileBootstrap.purgeForeignProfiles.complete", {
    durationMs: getElapsedMs(purgeStartedAtMs),
  });

  const remoteFetchStartedAtMs = Date.now();
  const remoteResult = await fetchCurrentUserProfile(userId, options.timeoutMs);
  logger.info("profileBootstrap.remoteResult", {
    status: remoteResult.status,
    hasProfile:
      remoteResult.status === "success" ? remoteResult.profile !== null : false,
    durationMs: getElapsedMs(remoteFetchStartedAtMs),
  });

  if (remoteResult.status === "timeout") {
    return evaluateLocalFallback(database, userId, "remote-profile-timeout");
  }

  if (remoteResult.status === "error") {
    return evaluateLocalFallback(database, userId, "remote-profile-error");
  }

  if (!remoteResult.profile) {
    logger.warn("profileBootstrap.remoteProfileMissing");
    return needsRecovery("remote-profile-missing");
  }

  if (remoteResult.profile.deleted) {
    logger.warn("profileBootstrap.remoteProfileDeleted");
    return needsRecovery("remote-profile-deleted");
  }

  logger.info("profileBootstrap.applyRemoteProfile.start", {
    onboardingCompleted: remoteResult.profile.onboarding_completed,
    hasNotificationSettings:
      remoteResult.profile.notification_settings !== null,
    hasOnboardingFlags: remoteResult.profile.onboarding_flags !== null,
  });

  const applyStartedAtMs = Date.now();
  await applyRemoteProfile(database, remoteResult.profile);

  logger.info("profileBootstrap.applyRemoteProfile.success", {
    onboardingCompleted: remoteResult.profile.onboarding_completed,
    durationMs: getElapsedMs(applyStartedAtMs),
    totalDurationMs: getElapsedMs(bootstrapStartedAtMs),
  });

  return {
    status: "ready-remote-profile",
    reason: remoteResult.profile.onboarding_completed
      ? "remote-profile-applied"
      : "remote-profile-unfinished",
    routeBasis: "remote-profile",
  };
}

export async function purgeForeignProfiles(
  db: Database,
  userId: string
): Promise<void> {
  const foreignProfiles = await db
    .get<Profile>("profiles")
    .query(Q.where("user_id", Q.notEq(userId)))
    .fetch();

  if (foreignProfiles.length === 0) {
    return;
  }

  await db.write(async () => {
    for (const profile of foreignProfiles) {
      await profile.destroyPermanently();
    }
  });
}

async function fetchCurrentUserProfile(
  userId: string,
  timeoutMs: number
): Promise<FetchCurrentProfileResult> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    const profilePromise = queryCurrentUserProfile(userId);
    const result = await Promise.race([
      profilePromise,
      createTimeoutPromise(timeoutMs, (handle) => {
        timeoutHandle = handle;
      }),
    ]);

    if (result.status !== "success") {
      return result;
    }

    return result;
  } catch {
    logger.warn("profileBootstrap.fetchCurrentUserProfile.exception");
    return { status: "error" };
  } finally {
    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }
  }
}

async function queryCurrentUserProfile(
  userId: string
): Promise<Exclude<FetchCurrentProfileResult, { readonly status: "timeout" }>> {
  const query = supabase.from("profiles");
  const { data, error } = await query
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logger.warn("profileBootstrap.queryCurrentUserProfile.error", {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return { status: "error" };
  }

  logger.info("profileBootstrap.queryCurrentUserProfile.success", {
    hasProfile: data !== null,
  });

  return { status: "success", profile: data };
}

function createTimeoutPromise(
  timeoutMs: number,
  onHandle: (handle: ReturnType<typeof setTimeout>) => void
): Promise<{ readonly status: "timeout" }> {
  return new Promise((resolve) => {
    const handle = setTimeout(() => {
      resolve({ status: "timeout" });
    }, timeoutMs);
    onHandle(handle);
  });
}

async function applyRemoteProfile(
  database: Database,
  profile: RemoteProfileRow
): Promise<void> {
  const changes: SyncDatabaseChangeSet = {
    profiles: {
      created: [],
      updated: [transformFromSupabase(profile)],
      deleted: [],
    },
  };

  await applyRemoteChangeSetWithoutCursor(database, changes);
}

async function evaluateLocalFallback(
  database: Database,
  userId: string,
  remoteFailureReason: "remote-profile-error" | "remote-profile-timeout"
): Promise<ProfileBootstrapResult> {
  const currentProfiles = await database
    .get<Profile>("profiles")
    .query(Q.where("user_id", userId))
    .fetch();
  const currentProfile = currentProfiles[0];

  if (!currentProfile) {
    logger.warn("profileBootstrap.localFallback.missing", {
      remoteFailureReason,
    });
    return needsRecovery(remoteFailureReason);
  }

  if (currentProfile.deleted) {
    logger.warn("profileBootstrap.localFallback.deleted", {
      remoteFailureReason,
    });
    return needsRecovery("local-profile-deleted");
  }

  if (!currentProfile.onboardingCompleted) {
    logger.warn("profileBootstrap.localFallback.unfinished", {
      remoteFailureReason,
    });
    return needsRecovery("local-profile-unfinished");
  }

  logger.info("profileBootstrap.localFallback.trustedOnboarded", {
    remoteFailureReason,
  });

  return {
    status: "ready-local-trusted",
    reason: "trusted-local-onboarded-profile",
    routeBasis: "trusted-local-profile",
  };
}

function needsRecovery(
  reason: ProfileBootstrapResult["reason"]
): ProfileBootstrapResult {
  return {
    status: "needs-recovery",
    reason,
    routeBasis: "none",
  };
}

export { REMOTE_PROFILE_TIMEOUT_CODE };
