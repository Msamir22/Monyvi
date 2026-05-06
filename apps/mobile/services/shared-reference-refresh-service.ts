import type { Database } from "@nozbe/watermelondb";
import type { SyncDatabaseChangeSet } from "@nozbe/watermelondb/sync";
import { applyRemoteChangeSetWithoutCursor } from "./remote-apply-service";
import { getCurrentUserId, supabase } from "./supabase";
import { transformFromSupabase } from "./sync-transform";
import { logger } from "@/utils/logger";

export type SharedReferenceRefreshStatus = "applied" | "skipped" | "failed";

export interface SharedReferenceRefreshResult {
  readonly marketRates: SharedReferenceRefreshStatus;
  readonly systemCategories: SharedReferenceRefreshStatus;
}

interface SharedPullResult<TChanges> {
  readonly status: SharedReferenceRefreshStatus;
  readonly changes: TChanges;
}

const MARKET_RATES_RETENTION_DAYS = 7;

type MarketRatesChanges = NonNullable<SyncDatabaseChangeSet["market_rates"]>;
type CategoriesChanges = NonNullable<SyncDatabaseChangeSet["categories"]>;

function getElapsedMs(startedAtMs: number): number {
  return Date.now() - startedAtMs;
}

function emptyMarketRateChanges(): MarketRatesChanges {
  return { created: [], updated: [], deleted: [] };
}

function emptyCategoryChanges(): CategoriesChanges {
  return { created: [], updated: [], deleted: [] };
}

function toUpdatedChanges(rows: readonly object[]): {
  readonly created: never[];
  readonly updated: Array<Record<string, unknown>>;
  readonly deleted: never[];
} {
  return {
    created: [],
    updated: rows.map((record) => transformFromSupabase({ ...record })),
    deleted: [],
  };
}

async function pullMarketRates(): Promise<
  SharedPullResult<MarketRatesChanges>
> {
  const startedAtMs = Date.now();
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MARKET_RATES_RETENTION_DAYS);

    const { data, error } = await supabase
      .from("market_rates")
      .select("*")
      .gt("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      logger.warn("sharedReferenceRefresh.marketRates.failed", {
        durationMs: getElapsedMs(startedAtMs),
        message: error.message,
      });
      return { status: "failed", changes: emptyMarketRateChanges() };
    }

    if (!data || data.length === 0) {
      logger.info("sharedReferenceRefresh.marketRates.skipped", {
        durationMs: getElapsedMs(startedAtMs),
      });
      return { status: "skipped", changes: emptyMarketRateChanges() };
    }

    logger.info("sharedReferenceRefresh.marketRates.pulled", {
      durationMs: getElapsedMs(startedAtMs),
      rowCount: data.length,
    });

    return {
      status: "applied",
      changes: toUpdatedChanges(data),
    };
  } catch (error: unknown) {
    logger.warn("sharedReferenceRefresh.marketRates.exception", {
      durationMs: getElapsedMs(startedAtMs),
      message: error instanceof Error ? error.message : String(error),
    });
    return { status: "failed", changes: emptyMarketRateChanges() };
  }
}

async function pullOwnerlessSystemCategories(): Promise<
  SharedPullResult<CategoriesChanges>
> {
  const startedAtMs = Date.now();
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_system", true)
      .is("user_id", null)
      .eq("deleted", false)
      .order("sort_order", { ascending: true });

    if (error) {
      logger.warn("sharedReferenceRefresh.systemCategories.failed", {
        durationMs: getElapsedMs(startedAtMs),
        message: error.message,
      });
      return { status: "failed", changes: emptyCategoryChanges() };
    }

    if (!data || data.length === 0) {
      logger.info("sharedReferenceRefresh.systemCategories.skipped", {
        durationMs: getElapsedMs(startedAtMs),
      });
      return { status: "skipped", changes: emptyCategoryChanges() };
    }

    logger.info("sharedReferenceRefresh.systemCategories.pulled", {
      durationMs: getElapsedMs(startedAtMs),
      rowCount: data.length,
    });

    return {
      status: "applied",
      changes: toUpdatedChanges(data),
    };
  } catch (error: unknown) {
    logger.warn("sharedReferenceRefresh.systemCategories.exception", {
      durationMs: getElapsedMs(startedAtMs),
      message: error instanceof Error ? error.message : String(error),
    });
    return { status: "failed", changes: emptyCategoryChanges() };
  }
}

export async function refreshSharedReferenceDataAfterAuth(
  database: Database
): Promise<SharedReferenceRefreshResult> {
  const startedAtMs = Date.now();
  const currentUserId = await getCurrentUserId();

  if (!currentUserId) {
    logger.info("sharedReferenceRefresh.skippedUnauthenticated", {
      durationMs: getElapsedMs(startedAtMs),
    });
    return {
      marketRates: "skipped",
      systemCategories: "skipped",
    };
  }

  const [marketRates, systemCategories] = await Promise.all([
    pullMarketRates(),
    pullOwnerlessSystemCategories(),
  ]);

  const changes: SyncDatabaseChangeSet = {
    market_rates: marketRates.changes,
    categories: systemCategories.changes,
  };

  const hasChanges =
    marketRates.changes.updated.length > 0 ||
    systemCategories.changes.updated.length > 0;

  if (hasChanges) {
    const applyStartedAtMs = Date.now();
    await applyRemoteChangeSetWithoutCursor(database, changes);
    logger.info("sharedReferenceRefresh.apply.complete", {
      durationMs: getElapsedMs(applyStartedAtMs),
      marketRateRows: marketRates.changes.updated.length,
      systemCategoryRows: systemCategories.changes.updated.length,
    });
  }

  logger.info("sharedReferenceRefresh.complete", {
    durationMs: getElapsedMs(startedAtMs),
    marketRates: marketRates.status,
    marketRateRows: marketRates.changes.updated.length,
    systemCategories: systemCategories.status,
    systemCategoryRows: systemCategories.changes.updated.length,
    appliedChanges: hasChanges,
  });

  return {
    marketRates: marketRates.status,
    systemCategories: systemCategories.status,
  };
}
