import { Budget, database, type BudgetPeriod } from "@monyvi/db";
import { Q } from "@nozbe/watermelondb";
import type Query from "@nozbe/watermelondb/Query";
import {
  computeSpendingMetrics,
  getCurrentPeriodBounds,
  getDaysElapsed,
  getDaysLeft,
  type SpendingMetrics,
} from "@monyvi/logic";

import { getSpendingForBudget } from "@/services/budget-service";
import { queryOwned } from "@/services/user-data-access";

export type BudgetPeriodFilter = "ALL" | BudgetPeriod;

export interface BudgetWithMetrics {
  readonly budget: Budget;
  readonly metrics: SpendingMetrics;
  readonly daysLeft: number;
  readonly daysElapsed: number;
}

export interface BudgetListReadModel {
  readonly budgets: readonly BudgetWithMetrics[];
  readonly globalBudget: BudgetWithMetrics | undefined;
  readonly categoryBudgets: readonly BudgetWithMetrics[];
  readonly pausedBudgets: readonly BudgetWithMetrics[];
  readonly totalCount: number;
}

export function observeBudgetList(userId: string): Query<Budget> {
  return queryOwned(
    database.get<Budget>("budgets"),
    userId,
    Q.and(
      Q.where("deleted", false),
      Q.where("status", Q.oneOf(["ACTIVE", "PAUSED"]))
    )
  );
}

export async function buildBudgetMetrics(
  budgets: readonly Budget[]
): Promise<BudgetWithMetrics[]> {
  const results: BudgetWithMetrics[] = [];

  for (const budget of budgets) {
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

    results.push({ budget, metrics, daysLeft, daysElapsed });
  }

  return results;
}

export function buildBudgetListReadModel(
  budgetsWithMetrics: readonly BudgetWithMetrics[],
  periodFilter: BudgetPeriodFilter
): BudgetListReadModel {
  const filteredBudgets =
    periodFilter === "ALL"
      ? budgetsWithMetrics
      : budgetsWithMetrics.filter(
          (item) => item.budget.period === periodFilter
        );

  return {
    budgets: filteredBudgets,
    globalBudget: filteredBudgets.find((item) => item.budget.isGlobal),
    categoryBudgets: filteredBudgets.filter(
      (item) => item.budget.isCategoryBudget && item.budget.status === "ACTIVE"
    ),
    pausedBudgets: filteredBudgets.filter(
      (item) => item.budget.status === "PAUSED"
    ),
    totalCount: budgetsWithMetrics.length,
  };
}
