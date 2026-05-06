/**
 * Sync Context and Provider
 * Provides sync status and functions to the app with smart sync intervals
 */

import { database } from "@monyvi/db";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";
import { useAuth } from "../context/AuthContext";
import { isAuthenticated as checkIsAuthenticated } from "../services/supabase";
import { completeInterruptedLogout } from "../services/logout-service";
import { bootstrapCurrentProfile } from "@/services/profile-bootstrap-service";
import { refreshSharedReferenceDataAfterAuth } from "@/services/shared-reference-refresh-service";
import { syncDatabase } from "../services/sync";
import type {
  ProfileBootstrapReason,
  ProfileBootstrapResult,
  ProfileBootstrapRouteBasis,
} from "../services/startup-bootstrap-types";
import { logger } from "@/utils/logger";

// Sync intervals in milliseconds
const SYNC_INTERVAL_ACTIVE = 15 * 60 * 1000; // 15 minutes when app is active
const SYNC_INTERVAL_BACKGROUND = 30 * 60 * 1000; // 30 minutes when backgrounded

/** Timeout for the current-profile bootstrap before declaring recovery needed. */
const PROFILE_BOOTSTRAP_TIMEOUT_MS = 30_000;

/** State machine for the initial pull-sync that gates post-sign-in routing. */
export type InitialSyncState = "in-progress" | "success" | "failed" | "timeout";

function getElapsedMs(startedAtMs: number): number {
  return Date.now() - startedAtMs;
}

interface SyncContextValue {
  isSyncing: boolean;
  isInitialSync: boolean;
  lastSyncedAt: Date | null;
  syncError: Error | null;
  sync: (forceFullSync?: boolean) => Promise<void>;
  /** Resolved after the current-profile bootstrap completes or times out. */
  readonly initialSyncState: InitialSyncState;
  /** Non-PII basis used for the first post-auth routing decision. */
  readonly bootstrapRouteBasis: ProfileBootstrapRouteBasis;
  /** Non-PII reason for the profile bootstrap outcome. */
  readonly bootstrapReason: ProfileBootstrapReason | null;
  /** True while the first account-data refresh after profile bootstrap runs. */
  readonly isPostBootstrapSyncing: boolean;
  /** Re-trigger the profile bootstrap. Returns the new state when resolved. */
  readonly retryInitialSync: () => Promise<InitialSyncState>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

interface SyncProviderProps {
  children: ReactNode;
}

function mapBootstrapResultToInitialState(
  result: ProfileBootstrapResult
): InitialSyncState {
  if (
    result.status === "ready-remote-profile" ||
    result.status === "ready-local-trusted"
  ) {
    return "success";
  }

  return result.reason === "remote-profile-timeout" ? "timeout" : "failed";
}

export function SyncProvider({ children }: SyncProviderProps): JSX.Element {
  const { isAuthenticated, user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const isInitialSync = false;
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<Error | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );
  const [initialSyncState, setInitialSyncState] =
    useState<InitialSyncState>("in-progress");
  const [hasProfileBootstrapSettled, setHasProfileBootstrapSettled] =
    useState(false);
  const [bootstrapRouteBasis, setBootstrapRouteBasis] =
    useState<ProfileBootstrapRouteBasis>("none");
  const [bootstrapReason, setBootstrapReason] =
    useState<ProfileBootstrapReason | null>(null);
  const [isPostBootstrapSyncing, setIsPostBootstrapSyncing] = useState(false);

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const profileBootstrapRunIdRef = useRef(0);

  const clearSyncInterval = useCallback((): void => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  const sync = useCallback(async (forceFullSync = false): Promise<void> => {
    const syncStartedAtMs = Date.now();
    logger.info("syncProvider.sync.start", {
      forceFullSync,
    });

    // Check if authenticated before syncing
    const authenticated = await checkIsAuthenticated();
    if (!authenticated) {
      logger.info("syncProvider.sync.skippedUnauthenticated", {
        forceFullSync,
        durationMs: getElapsedMs(syncStartedAtMs),
      });
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Concurrency guard is handled inside syncDatabase (module-level lock in sync.ts)
      await syncDatabase(database, forceFullSync);
      setLastSyncedAt(new Date());
      logger.info("syncProvider.sync.success", {
        forceFullSync,
        durationMs: getElapsedMs(syncStartedAtMs),
      });
    } catch (error) {
      const syncErr = error instanceof Error ? error : new Error("Sync failed");
      setSyncError(syncErr);
      logger.warn("syncProvider.sync.failed", {
        forceFullSync,
        durationMs: getElapsedMs(syncStartedAtMs),
        message: syncErr.message,
      });
      throw syncErr;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  /**
   * Bootstraps the current profile only. The full account sync runs later as
   * background refresh and must not gate post-auth routing.
   */
  const runInitialSync = useCallback(
    async (
      existingRunId?: number,
      onSuccessBeforeRouteUnlock?: () => void
    ): Promise<InitialSyncState> => {
      const runId = existingRunId ?? profileBootstrapRunIdRef.current + 1;
      profileBootstrapRunIdRef.current = runId;
      const isCurrentRun = (): boolean =>
        profileBootstrapRunIdRef.current === runId;

      const commit = (apply: () => void): boolean => {
        if (!isCurrentRun()) return false;
        apply();
        return true;
      };

      commit(() => {
        setHasProfileBootstrapSettled(false);
        setInitialSyncState("in-progress");
        setBootstrapRouteBasis("none");
        setBootstrapReason(null);
      });

      try {
        logger.info("syncProvider.profileBootstrap.run.start", {
          hasAuthUser: Boolean(user?.id),
        });

        const bootstrapResult = await bootstrapCurrentProfile(database, {
          timeoutMs: PROFILE_BOOTSTRAP_TIMEOUT_MS,
          userId: user?.id ?? null,
        });
        const syncResult = mapBootstrapResultToInitialState(bootstrapResult);

        logger.info("syncProvider.profileBootstrap.run.result", {
          status: bootstrapResult.status,
          reason: bootstrapResult.reason,
          routeBasis: bootstrapResult.routeBasis,
          initialSyncState: syncResult,
        });

        if (
          !commit(() => {
            if (syncResult === "success") {
              onSuccessBeforeRouteUnlock?.();
            }
            setBootstrapRouteBasis(bootstrapResult.routeBasis);
            setBootstrapReason(bootstrapResult.reason);
            setInitialSyncState(syncResult);
            setHasProfileBootstrapSettled(true);
          })
        ) {
          return "in-progress";
        }

        return syncResult;
      } catch (error: unknown) {
        logger.warn(
          "syncProvider.profileBootstrap.run.exception",
          error instanceof Error ? { message: error.message } : { error }
        );

        if (
          !commit(() => {
            setBootstrapRouteBasis("none");
            setBootstrapReason("remote-profile-error");
            setInitialSyncState("failed");
            setHasProfileBootstrapSettled(true);
          })
        ) {
          return "in-progress";
        }

        return "failed";
      }
    },
    [user?.id]
  );

  /** Re-trigger the initial sync from account-load recovery. */
  const retryInitialSync = useCallback(async (): Promise<InitialSyncState> => {
    return runInitialSync();
  }, [runInitialSync]);

  /**
   * Set up the sync interval based on app state.
   *
   * The interval callback checks authentication via an async call
   * to avoid closing over the potentially stale `isAuthenticated` prop.
   */
  const setupSyncInterval = useCallback(
    (isActive: boolean) => {
      // Clear existing interval
      clearSyncInterval();

      const interval = isActive
        ? SYNC_INTERVAL_ACTIVE
        : SYNC_INTERVAL_BACKGROUND;

      syncIntervalRef.current = setInterval(() => {
        // Use async auth check instead of closed-over isAuthenticated
        // to avoid stale closure issues
        const runSync = async (): Promise<void> => {
          try {
            const authenticated = await checkIsAuthenticated();
            if (authenticated) {
              await sync();
            }
          } catch (error: unknown) {
            logger.warn("syncProvider.intervalSync.failed", {
              message: error instanceof Error ? error.message : String(error),
            });
          }
        };
        runSync().catch((error: unknown) => {
          logger.warn("syncProvider.intervalSync.unhandled", {
            message: error instanceof Error ? error.message : String(error),
          });
        });
      }, interval);
    },
    [clearSyncInterval, sync]
  );

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus): void => {
      if (!isAuthenticated) {
        clearSyncInterval();
        setAppState(nextAppState);
        return;
      }

      const wasBackground = appState.match(/inactive|background/);
      const isNowActive = nextAppState === "active";

      // App came to foreground from background
      if (wasBackground && isNowActive) {
        // Sync immediately when returning to foreground
        sync().catch((error: unknown) => {
          logger.warn("syncProvider.foregroundSync.failed", {
            message: error instanceof Error ? error.message : String(error),
          });
        });
        setupSyncInterval(true);
      }

      // App went to background
      if (appState === "active" && nextAppState.match(/inactive|background/)) {
        setupSyncInterval(false);
      }

      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => subscription.remove();
  }, [appState, clearSyncInterval, isAuthenticated, sync, setupSyncInterval]);

  // Initial sync on mount + data cleared detection
  useEffect(() => {
    const effectRunId = profileBootstrapRunIdRef.current + 1;
    profileBootstrapRunIdRef.current = effectRunId;
    const startupStartedAtMs = Date.now();
    const isCurrentRun = (): boolean =>
      profileBootstrapRunIdRef.current === effectRunId;

    if (isAuthenticated) {
      setHasProfileBootstrapSettled(false);
      setInitialSyncState("in-progress");
      setBootstrapRouteBasis("none");
      setBootstrapReason(null);
      setIsPostBootstrapSyncing(false);
    } else {
      clearSyncInterval();
      setBootstrapRouteBasis("none");
      setBootstrapReason(null);
      setInitialSyncState("success");
      setHasProfileBootstrapSettled(false);
      setIsPostBootstrapSyncing(false);
    }

    const initialSync = async (): Promise<void> => {
      logger.info("syncProvider.postAuthStartup.start", {
        runId: effectRunId,
        isAuthenticated,
        hasAuthUser: Boolean(user?.id),
      });

      // FR-012: Complete any interrupted logout from a force-close
      const logoutRecoveryStartedAtMs = Date.now();
      await completeInterruptedLogout(database);
      logger.info("syncProvider.postAuthStartup.logoutRecovery.complete", {
        runId: effectRunId,
        durationMs: getElapsedMs(logoutRecoveryStartedAtMs),
      });
      if (!isCurrentRun()) return;

      // Check user is authenticated before syncing
      if (!isAuthenticated) {
        logger.info("syncProvider.postAuthStartup.skippedUnauthenticated", {
          runId: effectRunId,
          durationMs: getElapsedMs(startupStartedAtMs),
        });
        return;
      }

      // Authenticated launches verify only the current profile before routing.
      // The broader account pull continues after the route gate is unblocked.
      const profileBootstrapStartedAtMs = Date.now();
      const bootstrapState = await runInitialSync(effectRunId, () => {
        setIsPostBootstrapSyncing(true);
      });
      logger.info("syncProvider.postAuthStartup.profileBootstrap.complete", {
        runId: effectRunId,
        bootstrapState,
        durationMs: getElapsedMs(profileBootstrapStartedAtMs),
        totalDurationMs: getElapsedMs(startupStartedAtMs),
      });
      if (!isCurrentRun()) return;
      if (bootstrapState === "success") {
        const runPostBootstrapRefresh = async (): Promise<void> => {
          const refreshStartedAtMs = Date.now();
          logger.info("syncProvider.postBootstrapRefresh.start", {
            runId: effectRunId,
          });

          try {
            try {
              const sharedReferenceStartedAtMs = Date.now();
              const sharedReferenceResult =
                await refreshSharedReferenceDataAfterAuth(database);
              logger.info(
                "syncProvider.postBootstrapRefresh.sharedReference.complete",
                {
                  runId: effectRunId,
                  durationMs: getElapsedMs(sharedReferenceStartedAtMs),
                  marketRates: sharedReferenceResult.marketRates,
                  systemCategories: sharedReferenceResult.systemCategories,
                }
              );
            } catch (error: unknown) {
              logger.warn(
                "syncProvider.postBootstrapRefresh.sharedReference.failed",
                {
                  runId: effectRunId,
                  message:
                    error instanceof Error ? error.message : String(error),
                }
              );
            }

            const fullSyncStartedAtMs = Date.now();
            await sync(true);
            logger.info("syncProvider.postBootstrapRefresh.fullSync.complete", {
              runId: effectRunId,
              durationMs: getElapsedMs(fullSyncStartedAtMs),
            });
          } finally {
            if (isCurrentRun()) {
              setIsPostBootstrapSyncing(false);
              logger.info("syncProvider.postBootstrapRefresh.complete", {
                runId: effectRunId,
                durationMs: getElapsedMs(refreshStartedAtMs),
                totalDurationMs: getElapsedMs(startupStartedAtMs),
              });
            }
          }
        };

        runPostBootstrapRefresh().catch((error: unknown) => {
          logger.warn("syncProvider.postBootstrapRefresh.failed", {
            runId: effectRunId,
            durationMs: getElapsedMs(startupStartedAtMs),
            message: error instanceof Error ? error.message : String(error),
          });
        });
      } else {
        setIsPostBootstrapSyncing(false);
        logger.info("syncProvider.postAuthStartup.recoveryRequired", {
          runId: effectRunId,
          bootstrapState,
          durationMs: getElapsedMs(startupStartedAtMs),
        });
      }

      setupSyncInterval(AppState.currentState === "active");
    };

    initialSync().catch(() => {
      if (!isCurrentRun() || !isAuthenticated) return;
      setBootstrapRouteBasis("none");
      setBootstrapReason("remote-profile-error");
      setInitialSyncState("failed");
      setHasProfileBootstrapSettled(true);
    });

    // Cleanup interval on unmount
    return () => {
      clearSyncInterval();
    };
  }, [
    clearSyncInterval,
    isAuthenticated,
    runInitialSync,
    setupSyncInterval,
    sync,
    user?.id,
  ]);

  const exposedInitialSyncState: InitialSyncState =
    isAuthenticated && !hasProfileBootstrapSettled
      ? "in-progress"
      : initialSyncState;

  const value = useMemo<SyncContextValue>(
    () => ({
      isSyncing,
      isInitialSync,
      lastSyncedAt,
      syncError,
      sync,
      initialSyncState: exposedInitialSyncState,
      bootstrapRouteBasis,
      bootstrapReason,
      isPostBootstrapSyncing,
      retryInitialSync,
    }),
    [
      isSyncing,
      isInitialSync,
      lastSyncedAt,
      syncError,
      sync,
      exposedInitialSyncState,
      bootstrapRouteBasis,
      bootstrapReason,
      isPostBootstrapSyncing,
      retryInitialSync,
    ]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

/**
 * Hook to access sync context
 */
export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
}
