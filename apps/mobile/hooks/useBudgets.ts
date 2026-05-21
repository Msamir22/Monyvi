/**
 * useBudgets Hook
 *
 * Observes all active/non-deleted budgets, computes spending per budget, and
 * supports period filtering. Lifecycle mutations, such as pausing expired
 * custom budgets, are explicit service commands invoked by containers.
 *
 * @module useBudgets
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Budget, database } from "@monyvi/db";
import { Q } from "@nozbe/watermelondb";

import { getSpendingForBudget } from "@/services/budget-service";
import { queryOwned } from "@/services/user-data-access";
import type { PeriodFilter } from "@/components/budget/PeriodFilterChips";
import {
  SpendingMetrics,
  getCurrentPeriodBounds,
  getDaysElapsed,
  getDaysLeft,
  computeSpendingMetrics,
} from "@monyvi/logic";
import { useCurrentUser } from "./useCurrentUser";

// =============================================================================
// TYPES
// =============================================================================

export interface BudgetWithMetrics {
  readonly budget: Budget;
  readonly metrics: SpendingMetrics;
  readonly daysLeft: number;
  readonly daysElapsed: number;
}

interface UseBudgetsResult {
  /** All budgets with computed metrics, filtered by period */
  readonly budgets: readonly BudgetWithMetrics[];
  /** The global budget (if any) */
  readonly globalBudget: BudgetWithMetrics | undefined;
  /** Category budgets only (active) */
  readonly categoryBudgets: readonly BudgetWithMetrics[];
  /** Paused budgets */
  readonly pausedBudgets: readonly BudgetWithMetrics[];
  /** Whether data is loading */
  readonly isLoading: boolean;
  /** Total unfiltered budget count (for distinguishing empty vs filtered-empty) */
  readonly totalCount: number;
  /** Selected period filter */
  readonly periodFilter: PeriodFilter;
  /** Update the period filter */
  readonly setPeriodFilter: (filter: PeriodFilter) => void;
  /** Force refresh spending calculations */
  readonly refresh: () => void;
  /** Changes when budget fields relevant to lifecycle auto-pause change */
  readonly autoPauseCheckKey: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useBudgets(): UseBudgetsResult {
  const [rawBudgets, setRawBudgets] = useState<Budget[]>([]);
  const [budgetsWithMetrics, setBudgetsWithMetrics] = useState<
    BudgetWithMetrics[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("ALL");
  const [refreshCounter, setRefreshCounter] = useState(0);
  const { userId, isResolvingUser } = useCurrentUser();

  useEffect(() => {
    if (isResolvingUser) {
      setRawBudgets([]);
      setIsLoading(true);
      return;
    }

    if (!userId) {
      setRawBudgets([]);
      setIsLoading(false);
      return;
    }

    const subscription = queryOwned(
      database.get<Budget>("budgets"),
      userId,
      Q.and(
        Q.where("deleted", false),
        Q.where("status", Q.oneOf(["ACTIVE", "PAUSED"]))
      )
    )
      .observe()
      .subscribe((budgets) => {
        setRawBudgets(budgets);
      });

    return () => subscription.unsubscribe();
  }, [userId, isResolvingUser]);

  useEffect(() => {
    let cancelled = false;

    async function computeAll(): Promise<void> {
      setIsLoading(true);

      const results: BudgetWithMetrics[] = [];

      for (const budget of rawBudgets) {
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

      if (!cancelled) {
        setBudgetsWithMetrics(results);
        setIsLoading(false);
      }
    }

    void computeAll();

    return () => {
      cancelled = true;
    };
  }, [rawBudgets, refreshCounter]);

  const filteredBudgets = useMemo(() => {
    if (periodFilter === "ALL") return budgetsWithMetrics;
    return budgetsWithMetrics.filter((bm) => bm.budget.period === periodFilter);
  }, [budgetsWithMetrics, periodFilter]);

  const globalBudget = useMemo(
    () => filteredBudgets.find((bm) => bm.budget.isGlobal),
    [filteredBudgets]
  );

  const categoryBudgets = useMemo(
    () =>
      filteredBudgets.filter(
        (bm) => bm.budget.isCategoryBudget && bm.budget.status === "ACTIVE"
      ),
    [filteredBudgets]
  );

  const pausedBudgets = useMemo(
    () => filteredBudgets.filter((bm) => bm.budget.status === "PAUSED"),
    [filteredBudgets]
  );

  const autoPauseCheckKey = useMemo(
    () =>
      rawBudgets
        .map((budget) =>
          [
            budget.id,
            budget.status,
            budget.period,
            budget.periodEnd?.getTime() ?? "none",
          ].join(":")
        )
        .join("|"),
    [rawBudgets]
  );

  const refresh = useCallback(() => {
    setRefreshCounter((c) => c + 1);
  }, []);

  return {
    budgets: filteredBudgets,
    globalBudget,
    categoryBudgets,
    pausedBudgets,
    isLoading,
    totalCount: budgetsWithMetrics.length,
    periodFilter,
    setPeriodFilter,
    refresh,
    autoPauseCheckKey,
  };
}
