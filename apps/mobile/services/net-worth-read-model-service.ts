import {
  Account,
  Asset,
  AssetMetal,
  DailySnapshotNetWorth,
  database,
  type CurrencyType,
  type MarketRate,
} from "@monyvi/db";
import { Q, type Query } from "@nozbe/watermelondb";
import {
  calculateAccountsTotalBalance,
  calculateNetWorth,
  calculateTotalAssets,
  convertCurrency,
  getSameDayLastMonth,
} from "@monyvi/logic";

import {
  queryChildrenOfOwnedParents,
  queryOwned,
} from "@/services/user-data-access";

export interface ObserveNetWorthAssetMetalsInput {
  readonly userId: string;
  readonly assets: readonly Asset[];
}

export interface BuildNetWorthReadModelInput {
  readonly accounts: readonly Account[];
  readonly assetMetals: readonly AssetMetal[];
  readonly latestRates: MarketRate | null;
  readonly preferredCurrency: CurrencyType;
}

export interface NetWorthReadModel {
  readonly totalNetWorth: number;
  readonly totalNetWorthUsd: number;
  readonly totalAccounts: number;
  readonly totalAssets: number;
}

export function observeNetWorthAccounts(userId: string): Query<Account> {
  return queryOwned(
    database.get<Account>("accounts"),
    userId,
    Q.where("deleted", false)
  );
}

export function observeNetWorthAssets(userId: string): Query<Asset> {
  return queryOwned(
    database.get<Asset>("assets"),
    userId,
    Q.where("deleted", false)
  );
}

export function observeNetWorthAssetMetals(
  input: ObserveNetWorthAssetMetalsInput
): Query<AssetMetal> | null {
  if (input.assets.length === 0) {
    return null;
  }

  return queryChildrenOfOwnedParents(
    database.get<AssetMetal>("asset_metals"),
    input.assets,
    input.userId,
    "asset_id",
    Q.where("deleted", false)
  );
}

export function observeNetWorthSnapshots(
  userId: string
): Query<DailySnapshotNetWorth> {
  return queryOwned(
    database.get<DailySnapshotNetWorth>("daily_snapshot_net_worth"),
    userId,
    Q.sortBy("snapshot_date", Q.desc)
  );
}

export function buildNetWorthReadModel(
  input: BuildNetWorthReadModelInput
): NetWorthReadModel | null {
  if (!input.latestRates) {
    return null;
  }

  const totalAccountsUsd = calculateAccountsTotalBalance(
    [...input.accounts],
    input.latestRates
  );
  const totalAssetsUsd = calculateTotalAssets(
    [...input.assetMetals],
    input.latestRates
  );
  const totalAccounts = convertCurrency(
    totalAccountsUsd,
    "USD",
    input.preferredCurrency,
    input.latestRates
  );
  const totalAssets = convertCurrency(
    totalAssetsUsd,
    "USD",
    input.preferredCurrency,
    input.latestRates
  );
  const preferredNetWorth = calculateNetWorth(totalAccounts, totalAssets);

  return {
    totalNetWorth: preferredNetWorth.totalNetWorth,
    totalNetWorthUsd: convertCurrency(
      preferredNetWorth.totalNetWorth,
      input.preferredCurrency,
      "USD",
      input.latestRates
    ),
    totalAccounts: preferredNetWorth.totalAccounts,
    totalAssets: preferredNetWorth.totalAssets,
  };
}

export function buildMonthlyPercentageChange(
  snapshots: readonly DailySnapshotNetWorth[]
): number | null {
  if (snapshots.length === 0) {
    return null;
  }

  const currentSnapshot = snapshots[0];
  const previousSnapshot = findClosestSnapshot(
    snapshots,
    new Date(getSameDayLastMonth()).getTime()
  );

  if (!previousSnapshot || previousSnapshot.totalNetWorth === 0) {
    return null;
  }

  const change =
    ((currentSnapshot.totalNetWorth - previousSnapshot.totalNetWorth) /
      previousSnapshot.totalNetWorth) *
    100;

  return Math.round(change * 100) / 100;
}

function findClosestSnapshot(
  snapshots: readonly DailySnapshotNetWorth[],
  targetDateMs: number
): DailySnapshotNetWorth | null {
  let closest: DailySnapshotNetWorth | null = null;
  let smallestDiff = Infinity;

  for (const snapshot of snapshots) {
    const diff = Math.abs(snapshot.snapshotDate.getTime() - targetDateMs);

    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = snapshot;
    }
  }

  return closest;
}
