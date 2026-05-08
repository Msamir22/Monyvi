/**
 * useSmsImportStats Hook
 *
 * Observes the count of SMS-sourced transactions for the current month.
 * Used by the SmsImportStatusCard on the dashboard.
 *
 * @module useSmsImportStats
 */

import { Transaction, database } from "@monyvi/db";
import { getMonthBoundaries } from "@monyvi/logic";
import { Q } from "@nozbe/watermelondb";
import { useEffect, useState } from "react";
import { queryOwned } from "@/services/user-data-access";
import { useCurrentUserId } from "./useCurrentUserId";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseSmsImportStatsResult {
  /** Number of SMS-sourced transactions this month */
  readonly importedThisMonth: number;
  /** Whether data is loading */
  readonly isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSmsImportStats(): UseSmsImportStatsResult {
  const [importedThisMonth, setImportedThisMonth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { userId, isResolvingUser } = useCurrentUserId();

  useEffect(() => {
    if (isResolvingUser) {
      setImportedThisMonth(0);
      setIsLoading(true);
      return;
    }

    if (!userId) {
      setImportedThisMonth(0);
      setIsLoading(false);
      return;
    }

    const now = new Date();
    const { startDate, endDate } = getMonthBoundaries(
      now.getFullYear(),
      now.getMonth() + 1
    );

    const subscription = queryOwned(
      database.get<Transaction>("transactions"),
      userId,
      Q.and(
        Q.where("deleted", false),
        Q.where("source", "SMS"),
        Q.where("date", Q.gte(startDate)),
        Q.where("date", Q.lte(endDate))
      )
    )
      .observeCount()
      .subscribe((count) => {
        setImportedThisMonth(count);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [userId, isResolvingUser]);

  return { importedThisMonth, isLoading };
}
