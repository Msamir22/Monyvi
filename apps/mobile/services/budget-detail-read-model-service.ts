import {
  database,
  type Budget,
  type Category,
  type Transaction,
} from "@monyvi/db";
import { Q } from "@nozbe/watermelondb";
import {
  computeSpendingMetrics,
  filterExcludedTransactions,
  getCurrentPeriodBounds,
  getDaysElapsed,
  getDaysLeft,
  getWeeklyBuckets,
  parsePauseIntervals,
  parsePausedAtMs,
  type PauseInterval,
  type SpendingMetrics,
  type WeeklyBucket,
} from "@monyvi/logic";

import {
  getCategoryAndSubcategoryIds,
  getSpendingForBudget,
} from "@/services/budget-service";
import {
  queryAccessibleCategories,
  queryOwned,
} from "@/services/user-data-access";

export interface SubcategorySpending {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly amount: number;
  readonly percentage: number;
}

export interface WeeklySpendingData {
  readonly bucket: WeeklyBucket;
  readonly amount: number;
}

export interface BudgetDetailReadModel {
  readonly metrics: SpendingMetrics;
  readonly daysLeft: number;
  readonly daysElapsed: number;
  readonly weeklySpending: readonly WeeklySpendingData[];
  readonly subcategoryBreakdown: readonly SubcategorySpending[];
  readonly recentTransactions: readonly Transaction[];
}

interface BudgetPauseState {
  readonly pauseIntervals: readonly PauseInterval[];
  readonly pausedAtMs: number | undefined;
}

const RECENT_TRANSACTIONS_LIMIT = 6;

export async function getBudgetDetailReadModel(
  budget: Budget
): Promise<BudgetDetailReadModel> {
  const bounds = getCurrentPeriodBounds(
    budget.period,
    budget.periodStart,
    budget.periodEnd
  );
  const spent = await getSpendingForBudget(budget);
  const daysElapsed = getDaysElapsed(bounds.start);
  const daysLeft = getDaysLeft(bounds.end);
  const metrics = computeSpendingMetrics(
    spent,
    budget.amount,
    daysElapsed,
    budget.alertThreshold
  );
  const categoryIds =
    budget.isCategoryBudget && budget.categoryId
      ? await getCategoryAndSubcategoryIds(budget.categoryId)
      : null;
  const pauseState = getBudgetPauseState(budget);

  return {
    metrics,
    daysLeft,
    daysElapsed,
    weeklySpending: await getWeeklySpending(
      budget,
      categoryIds,
      bounds,
      pauseState
    ),
    subcategoryBreakdown: await getSubcategoryBreakdown(
      budget,
      spent,
      bounds,
      pauseState
    ),
    recentTransactions: await getRecentTransactions(
      budget,
      categoryIds,
      bounds,
      pauseState
    ),
  };
}

function getBudgetPauseState(budget: Budget): BudgetPauseState {
  return {
    pauseIntervals: parsePauseIntervals(String(budget.pauseIntervals ?? "[]")),
    pausedAtMs: parsePausedAtMs(budget.pausedAt),
  };
}

async function getWeeklySpending(
  budget: Budget,
  categoryIds: readonly string[] | null,
  bounds: ReturnType<typeof getCurrentPeriodBounds>,
  pauseState: BudgetPauseState
): Promise<WeeklySpendingData[]> {
  const weeklyData: WeeklySpendingData[] = [];

  for (const bucket of getWeeklyBuckets(bounds)) {
    const conditions = [
      Q.where("deleted", false),
      Q.where("type", "EXPENSE"),
      Q.where("date", Q.gte(bucket.weekStart.getTime())),
      Q.where("date", Q.lte(bucket.weekEnd.getTime())),
    ];

    if (categoryIds) {
      conditions.push(Q.where("category_id", Q.oneOf([...categoryIds])));
    }

    const weeklyTransactions = await queryOwned(
      database.get<Transaction>("transactions"),
      budget.userId,
      Q.and(...conditions)
    ).fetch();
    const activeTransactions = filterExcludedTransactions(
      weeklyTransactions,
      pauseState.pauseIntervals,
      pauseState.pausedAtMs
    );

    weeklyData.push({
      bucket,
      amount: activeTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    });
  }

  return weeklyData;
}

async function getSubcategoryBreakdown(
  budget: Budget,
  spent: number,
  bounds: ReturnType<typeof getCurrentPeriodBounds>,
  pauseState: BudgetPauseState
): Promise<SubcategorySpending[]> {
  if (!budget.isCategoryBudget || !budget.categoryId || spent <= 0) {
    return [];
  }

  const children = await queryAccessibleCategories(
    database.get<Category>("categories"),
    budget.userId,
    Q.and(Q.where("parent_id", budget.categoryId), Q.where("deleted", false))
  ).fetch();
  const breakdown: SubcategorySpending[] = [];

  for (const child of children) {
    const childCategoryIds = await getCategoryAndSubcategoryIds(child.id);
    const childTransactions = await queryOwned(
      database.get<Transaction>("transactions"),
      budget.userId,
      Q.and(
        Q.where("deleted", false),
        Q.where("type", "EXPENSE"),
        Q.where("category_id", Q.oneOf(childCategoryIds)),
        Q.where("date", Q.gte(bounds.start.getTime())),
        Q.where("date", Q.lte(bounds.end.getTime()))
      )
    ).fetch();
    const activeChildTransactions = filterExcludedTransactions(
      childTransactions,
      pauseState.pauseIntervals,
      pauseState.pausedAtMs
    );
    const childAmount = activeChildTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0
    );

    if (childAmount > 0) {
      breakdown.push({
        categoryId: child.id,
        categoryName: child.displayName,
        amount: childAmount,
        percentage: (childAmount / spent) * 100,
      });
    }
  }

  return breakdown.sort((a, b) => b.amount - a.amount);
}

async function getRecentTransactions(
  budget: Budget,
  categoryIds: readonly string[] | null,
  bounds: ReturnType<typeof getCurrentPeriodBounds>,
  pauseState: BudgetPauseState
): Promise<Transaction[]> {
  const conditions = [
    Q.where("deleted", false),
    Q.where("type", "EXPENSE"),
    Q.where("date", Q.gte(bounds.start.getTime())),
    Q.where("date", Q.lte(bounds.end.getTime())),
  ];

  if (categoryIds) {
    conditions.push(Q.where("category_id", Q.oneOf([...categoryIds])));
  }

  const recentRaw = await queryOwned(
    database.get<Transaction>("transactions"),
    budget.userId,
    ...conditions,
    Q.sortBy("date", Q.desc),
    Q.take(RECENT_TRANSACTIONS_LIMIT * 2)
  ).fetch();

  return filterExcludedTransactions(
    recentRaw,
    pauseState.pauseIntervals,
    pauseState.pausedAtMs
  ).slice(0, RECENT_TRANSACTIONS_LIMIT);
}
