/**
 * App Entry Point — Routing Gate
 *
 * Binary gate driven by profiles.onboarding_completed (from WatermelonDB,
 * after profile bootstrap). Per-step resume lives in onboarding.tsx via
 * AsyncStorage cursor; this gate only decides dashboard-vs-onboarding.
 *
 * Priority (see utils/routing-decision.ts for the authoritative rule):
 * 1. Auth or intro-seen still loading -> splash (return null).
 * 2. Unauthenticated -> pitch (if !intro-seen) or auth.
 * 3. Bootstrap in-progress OR profile observation still loading ->
 *    account-loading screen.
 * 4. Authenticated but `profile === null`:
 *    a. bootstrap failed/timed out -> account-load recovery.
 *    b. otherwise -> account-loading screen.
 *    Never falls through to /onboarding because that can skip a returning
 *    user past their existing cloud data.
 * 5. onboarding_completed = true -> dashboard (offline-first).
 * 6. Verified onboarding_completed = false -> onboarding.
 * 7. Failed/timeout with a local unfinished profile -> account-load recovery.
 *
 * @module Index
 */

import { database } from "@monyvi/db";
import { AccountLoadingScreen } from "@/components/sync/AccountLoadingScreen";
import { AccountLoadRecoveryScreen } from "@/components/ui/AccountLoadRecoveryScreen";
import { useProfile } from "@/hooks/useProfile";
import { useIntroSeen } from "@/hooks/useIntroSeen";
import { useSync } from "@/providers/SyncProvider";
import { useAuth } from "@/context/AuthContext";
import { performLogout } from "@/services/logout-service";
import type { ProfileBootstrapReason } from "@/services/startup-bootstrap-types";
import {
  buildRoutingDecisionLog,
  getRoutingDecision,
  type RoutingOutcome,
} from "@/utils/routing-decision";
import { logger } from "@/utils/logger";
import { Redirect, type Href } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";

export default function Index(): React.ReactNode {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { isSeen: introSeen, isLoading: isIntroLoading } = useIntroSeen();
  const {
    initialSyncState,
    bootstrapRouteBasis,
    bootstrapReason,
    retryInitialSync,
  } = useSync();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const hasLoggedRef = useRef(false);

  const onboardingCompletedForRoute =
    profile === null
      ? undefined
      : deriveOnboardingCompletedForRoute(
          profile.onboardingCompleted,
          bootstrapReason
        );
  const routingInputs =
    onboardingCompletedForRoute === undefined
      ? null
      : {
          syncState: initialSyncState,
          onboardingCompleted: onboardingCompletedForRoute,
        };
  const outcome: RoutingOutcome =
    routingInputs === null ? "loading" : getRoutingDecision(routingInputs);

  // FR-014: one structured log per gate evaluation (no PII).
  //
  // Fires once the sync AND profile observation have both settled — logging
  // and the route decision has a real boolean basis.
  // The payload is rebuilt from the same primitive inputs that appear in the
  // dep array, so there is no
  // need to suppress exhaustive-deps; `hasLoggedRef` guarantees the log
  // fires at most once per session.
  useEffect(() => {
    const syncSettled = initialSyncState !== "in-progress";
    const profileSettled = !isProfileLoading;
    if (
      hasLoggedRef.current ||
      !syncSettled ||
      !profileSettled ||
      onboardingCompletedForRoute === undefined
    ) {
      return;
    }

    hasLoggedRef.current = true;
    const settledRoutingInputs = {
      syncState: initialSyncState,
      onboardingCompleted: onboardingCompletedForRoute,
    };
    logger.info("onboarding.routing.decision", {
      ...buildRoutingDecisionLog(
        settledRoutingInputs,
        getRoutingDecision(settledRoutingInputs)
      ),
      bootstrapRouteBasis,
      bootstrapReason,
    });
  }, [
    initialSyncState,
    isProfileLoading,
    onboardingCompletedForRoute,
    bootstrapRouteBasis,
    bootstrapReason,
  ]);

  /** Sign-out handler for account-load recovery — uses existing logout service. */
  const handleSignOut = useCallback((): void => {
    performLogout(database).catch((error: unknown) => {
      logger.warn(
        "onboarding.accountLoadRecovery.signOut.failed",
        error instanceof Error ? { message: error.message } : { error }
      );
    });
  }, []);

  /** Retry handler for account-load recovery — re-enters the initial sync. */
  const handleRetry = useCallback((): void => {
    retryInitialSync().catch((error: unknown) => {
      logger.warn(
        "onboarding.accountLoadRecovery.retryInitialSync.failed",
        error instanceof Error ? { message: error.message } : { error }
      );
    });
  }, [retryInitialSync]);

  // Pre-auth loading states render nothing; the native Expo splash remains
  // responsible for auth/intro resolution.
  if (isAuthLoading || isIntroLoading) {
    return null;
  }

  // Pre-auth routing: first-time visitors see pitch, returning visitors go
  // straight to auth. introSeen is device-scoped (FR-029/FR-030).
  if (!isAuthenticated) {
    if (!introSeen) return <Redirect href="/pitch" />;
    return <Redirect href="/auth" />;
  }

  // Mid-session auth -> /index transition: show destination-neutral account
  // loading until profile bootstrap and the local profile observation settle.
  if (initialSyncState === "in-progress" || isProfileLoading) {
    return <StartupLoadingView />;
  }

  // A null local profile is not an error by itself. WatermelonDB can emit an
  // empty profile result before the bootstrapped row is visible. Only an
  // explicit bootstrap failure/timeout is allowed to show recovery; all other
  // null-profile states stay on account loading and never fall through to
  // onboarding.
  if (isAuthenticated && profile === null) {
    if (initialSyncState === "failed" || initialSyncState === "timeout") {
      logger.warn("onboarding.accountLoadRecovery.rendered", {
        initialSyncState,
        bootstrapRouteBasis,
        bootstrapReason,
        hasProfile: false,
      });

      return (
        <AccountLoadRecoveryScreen
          onRetry={handleRetry}
          onSignOut={handleSignOut}
        />
      );
    }
    return <StartupLoadingView />;
  }

  switch (outcome) {
    case "dashboard":
      return <RedirectWithTransitionFallback href="/(tabs)" />;
    case "retry":
      logger.warn("onboarding.accountLoadRecovery.rendered", {
        initialSyncState,
        bootstrapRouteBasis,
        bootstrapReason,
        hasProfile: profile !== null,
        onboardingCompleted: onboardingCompletedForRoute,
      });

      return (
        <AccountLoadRecoveryScreen
          onRetry={handleRetry}
          onSignOut={handleSignOut}
        />
      );
    case "loading":
      return <StartupLoadingView />;
    default:
      // "onboarding" — resume handled by onboarding.tsx via AsyncStorage cursor
      return <RedirectWithTransitionFallback href="/onboarding" />;
  }
}

function RedirectWithTransitionFallback({
  href,
}: {
  readonly href: Href;
}): React.JSX.Element {
  return (
    <>
      <Redirect href={href} />
      <StartupLoadingView />
    </>
  );
}

function StartupLoadingView(): React.JSX.Element {
  return <AccountLoadingScreen />;
}

function deriveOnboardingCompletedForRoute(
  localOnboardingCompleted: boolean,
  bootstrapReason: ProfileBootstrapReason | null
): boolean {
  switch (bootstrapReason) {
    case "remote-profile-applied":
    case "trusted-local-onboarded-profile":
      return true;
    case "remote-profile-unfinished":
      return false;
    default:
      return localOnboardingCompleted;
  }
}
