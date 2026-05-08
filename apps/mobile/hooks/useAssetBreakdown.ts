/**
 * useAssetBreakdown Hook
 * Reactive hook for asset breakdown data from WatermelonDB
 */

import { Asset, AssetMetal, database } from "@monyvi/db";
import {
  AssetBreakdownPercentage,
  calculateAssetBreakdown,
  calculateAssetBreakdownPercentages,
} from "@monyvi/logic";
import { Q } from "@nozbe/watermelondb";
import { useEffect, useMemo, useState } from "react";
import { useAccounts } from "./useAccounts";
import { useMarketRates } from "./useMarketRates";
import { queryOwned } from "@/services/user-data-access";
import { useCurrentUserId } from "./useCurrentUserId";

interface UseAssetBreakdownResult {
  breakdown: AssetBreakdownPercentage[];
  isLoading: boolean;
}

/**
 * Hook to get asset breakdown (Bank, Cash, Metals) with percentages
 */
export function useAssetBreakdown(): UseAssetBreakdownResult {
  const { accounts, isLoading: accountsLoading } = useAccounts();
  const { latestRates, isLoading: ratesLoading } = useMarketRates();
  const [assetMetals, setAssetMetals] = useState<AssetMetal[]>([]);
  const [metalsLoading, setMetalsLoading] = useState(true);
  const { userId, isResolvingUser } = useCurrentUserId();

  // Fetch asset metals
  useEffect(() => {
    if (isResolvingUser) {
      setAssetMetals([]);
      setMetalsLoading(true);
      return;
    }

    if (!userId) {
      setAssetMetals([]);
      setMetalsLoading(false);
      return;
    }

    let isCancelled = false;
    setMetalsLoading(true);

    const metalsCollection = database.get<AssetMetal>("asset_metals");
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
        setMetalsLoading(false);
        return () => undefined;
      }

      const query = metalsCollection.query(
        Q.where("asset_id", Q.oneOf(assetIds)),
        Q.where("deleted", false)
      );

      const subscription = query.observe().subscribe({
        next: (result) => {
          setAssetMetals(result);
          setMetalsLoading(false);
        },
        error: (err: unknown) => {
          console.error("Error observing asset metals:", err);
          setMetalsLoading(false);
        },
      });

      return () => subscription.unsubscribe();
    };

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
  }, [userId, isResolvingUser]);

  const breakdown = useMemo((): AssetBreakdownPercentage[] => {
    const rawBreakdown = calculateAssetBreakdown(
      accounts,
      assetMetals,
      latestRates
    );
    return calculateAssetBreakdownPercentages(rawBreakdown);
  }, [accounts, assetMetals, latestRates]);

  const isLoading = accountsLoading || ratesLoading || metalsLoading;

  return { breakdown, isLoading };
}
