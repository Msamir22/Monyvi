/**
 * useNetWorth Hook
 * Local-first net worth calculation using WatermelonDB
 */

import {
  Account,
  Asset,
  AssetMetal,
  DailySnapshotNetWorth,
  database,
} from "@monyvi/db";
import {
  calculateAccountsTotalBalance,
  calculateNetWorth,
  calculateTotalAssets,
  convertCurrency,
  getSameDayLastMonth,
  NetWorthData,
} from "@monyvi/logic";
import { Q } from "@nozbe/watermelondb";
import { useEffect, useMemo, useState } from "react";
import { queryOwned } from "@/services/user-data-access";
import { useMarketRates } from "./useMarketRates";
import { usePreferredCurrency } from "./usePreferredCurrency";
import { useCurrentUserId } from "./useCurrentUserId";
interface UseNetWorthResult {
  readonly totalNetWorth: number | null;
  readonly totalNetWorthUsd: number | null;
  readonly totalAccounts: number | null;
  readonly totalAssets: number | null;
  readonly isLoading: boolean;
  readonly error: Error | null;
  readonly refresh: () => void;
}

/**
 * Provides reactive net worth totals and related metrics in the user's preferred currency.
 *
 * @returns An object containing:
 * - `totalNetWorth`: the total net worth expressed in the preferred currency, or `null` if not available.
 * - `totalNetWorthUsd`: the total net worth expressed in USD, or `null` if not available.
 * - `totalAccounts`: the total accounts balance in the preferred currency, or `null` if not available.
 * - `totalAssets`: the total assets value in the preferred currency, or `null` if not available.
 * - `isLoading`: `true` while local data or market rates are still loading.
 * - `error`: an `Error` instance if an observation failed, or `null` otherwise.
 * - `refresh`: a function that triggers a data refresh when called.
 */
export function useNetWorth(): UseNetWorthResult {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assetMetals, setAssetMetals] = useState<AssetMetal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [isAssetMetalsLoading, setIsAssetMetalsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { latestRates, isLoading: isRatesLoading } = useMarketRates();
  const { preferredCurrency } = usePreferredCurrency();
  const { userId, isResolvingUser } = useCurrentUserId();

  const refresh = (): void => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (isResolvingUser) {
      setAccounts([]);
      setIsLoading(true);
      setIsAccountsLoading(true);
      return;
    }

    if (!userId) {
      setAccounts([]);
      setIsLoading(false);
      setIsAccountsLoading(false);
      return;
    }

    const accountsCollection = database.get<Account>("accounts");
    const query = queryOwned(
      accountsCollection,
      userId,
      Q.where("deleted", false)
    );

    setIsAccountsLoading(true);

    // Use observeWithColumns to react to balance changes
    const subscription = query.observeWithColumns(["balance"]).subscribe({
      next: (result) => {
        setAccounts(result);
        setIsAccountsLoading(false);
      },
      error: (err: unknown) => {
        console.error("Error observing accounts:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsAccountsLoading(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [refreshKey, userId, isResolvingUser]);

  useEffect(() => {
    if (isResolvingUser) {
      setAssetMetals([]);
      setIsLoading(true);
      setIsAssetMetalsLoading(true);
      return;
    }

    if (!userId) {
      setAssetMetals([]);
      setIsLoading(false);
      setIsAssetMetalsLoading(false);
      return;
    }

    let isCancelled = false;
    const assetMetalsCollection = database.get<AssetMetal>("asset_metals");

    const run = async (): Promise<() => void> => {
      const assetIds = (
        await queryOwned(
          database.get<Asset>("assets"),
          userId,
          Q.where("deleted", false)
        ).fetch()
      ).map((asset) => asset.id);

      if (isCancelled) return () => undefined;

      if (assetIds.length === 0) {
        setAssetMetals([]);
        setIsLoading(false);
        setIsAssetMetalsLoading(false);
        return () => undefined;
      }

      const query = assetMetalsCollection.query(
        Q.where("asset_id", Q.oneOf(assetIds)),
        Q.where("deleted", false)
      );

      const subscription = query.observe().subscribe({
        next: (result) => {
          setAssetMetals(result);
          setIsLoading(false);
          setIsAssetMetalsLoading(false);
        },
        error: (err: unknown) => {
          console.error("Error observing asset metals:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
          setIsAssetMetalsLoading(false);
        },
      });

      return () => subscription.unsubscribe();
    };

    setAssetMetals([]);
    setIsAssetMetalsLoading(true);

    let unsubscribe: (() => void) | undefined;
    void run().then((nextUnsubscribe) => {
      if (isCancelled) {
        nextUnsubscribe();
        return;
      }
      unsubscribe = nextUnsubscribe;
    });

    return () => {
      isCancelled = true;
      unsubscribe?.();
    };
  }, [refreshKey, userId, isResolvingUser]);

  /** Convert a USD amount to the user's preferred currency. */
  const toPreferred = useMemo(
    () =>
      (amount: number): number =>
        convertCurrency(amount, "USD", preferredCurrency, latestRates),
    [latestRates, preferredCurrency]
  );

  // Calculate net worth when data changes
  const netWorthData = useMemo<NetWorthData | null>(() => {
    if (
      isResolvingUser ||
      isLoading ||
      isAccountsLoading ||
      isAssetMetalsLoading ||
      isRatesLoading ||
      !latestRates
    ) {
      return null;
    }

    // Calculate totals in USD (base currency)
    const totalAccountsUsd = calculateAccountsTotalBalance(
      accounts,
      latestRates
    );
    const totalAssetsUsd = calculateTotalAssets(assetMetals, latestRates);

    // Convert to preferred currency for display
    return calculateNetWorth(
      toPreferred(totalAccountsUsd),
      toPreferred(totalAssetsUsd)
    );
  }, [
    accounts,
    assetMetals,
    latestRates,
    isLoading,
    isResolvingUser,
    isAccountsLoading,
    isAssetMetalsLoading,
    isRatesLoading,
    toPreferred,
  ]);

  return {
    totalNetWorth: netWorthData?.totalNetWorth ?? null,
    totalNetWorthUsd: netWorthData
      ? convertCurrency(
          netWorthData.totalNetWorth,
          preferredCurrency,
          "USD",
          latestRates
        )
      : null,
    totalAccounts: netWorthData?.totalAccounts ?? null,
    totalAssets: netWorthData?.totalAssets ?? null,
    isLoading: isResolvingUser || isLoading || isRatesLoading,
    error,
    refresh,
  };
}

/**
 * Hook that returns month-over-month net worth percentage change.
 * Queries local daily_snapshot_net_worth (offline-first) instead of the API.
 *
 * Strategy:
 * 1. Get the most recent snapshot as "current" net worth
 * 2. Find the snapshot closest to the same day last month as "previous"
 * 3. Calculate percentage change: ((current - previous) / previous) * 100
 */
export function useMonthlyPercentageChange(): {
  monthlyPercentageChange: number | null;
  isLoading: boolean;
} {
  const [monthlyPercentageChange, setMonthlyPercentageChange] = useState<
    number | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userId, isResolvingUser } = useCurrentUserId();

  useEffect(() => {
    if (isResolvingUser) {
      setMonthlyPercentageChange(null);
      setIsLoading(true);
      return;
    }

    if (!userId) {
      setMonthlyPercentageChange(null);
      setIsLoading(false);
      return;
    }

    const collection = database.get<DailySnapshotNetWorth>(
      "daily_snapshot_net_worth"
    );

    // Observe the collection to react to sync updates
    const subscription = queryOwned(
      collection,
      userId,
      Q.sortBy("snapshot_date", Q.desc)
    )
      .observe()
      .subscribe({
        next: (snapshots) => {
          if (snapshots.length === 0) {
            setMonthlyPercentageChange(null);
            setIsLoading(false);
            return;
          }

          // Most recent snapshot = current net worth
          const currentSnapshot = snapshots[0];
          const currentNetWorth = currentSnapshot.totalNetWorth;

          // Find the snapshot closest to same-day-last-month
          const comparisonDateStr = getSameDayLastMonth();
          const comparisonDate = new Date(comparisonDateStr).getTime();

          const previousSnapshot = findClosestSnapshot(
            snapshots,
            comparisonDate
          );

          if (!previousSnapshot || previousSnapshot.totalNetWorth === 0) {
            setMonthlyPercentageChange(null);
          } else {
            const change =
              ((currentNetWorth - previousSnapshot.totalNetWorth) /
                previousSnapshot.totalNetWorth) *
              100;
            setMonthlyPercentageChange(Math.round(change * 100) / 100);
          }

          setIsLoading(false);
        },
        error: (err: unknown) => {
          console.error("Error observing net worth snapshots:", err);
          setIsLoading(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [userId, isResolvingUser]);

  return {
    monthlyPercentageChange,
    isLoading,
  };
}

/**
 * Find the snapshot closest to the target date.
 * Searches through sorted snapshots (desc by snapshot_date) and returns
 * the one with the smallest absolute date difference.
 */
function findClosestSnapshot(
  snapshots: DailySnapshotNetWorth[],
  targetDateMs: number
): DailySnapshotNetWorth | null {
  let closest: DailySnapshotNetWorth | null = null;
  let smallestDiff = Infinity;

  for (const snapshot of snapshots) {
    // snapshotDate is a Date field (decorated with @date)
    const snapshotMs = snapshot.snapshotDate.getTime();
    const diff = Math.abs(snapshotMs - targetDateMs);

    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = snapshot;
    }
  }

  return closest;
}
