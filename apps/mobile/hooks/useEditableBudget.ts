import type { Budget } from "@monyvi/db";
import { useEffect, useState } from "react";
import { getBudgetById } from "@/services/budget-service";
import { logger } from "@/utils/logger";

type BudgetLoadErrorKey = "load_budget_error";

interface UseEditableBudgetResult {
  readonly budget: Budget | undefined;
  readonly isLoading: boolean;
  readonly loadErrorKey: BudgetLoadErrorKey | null;
}

export function useEditableBudget(
  budgetId: string | undefined
): UseEditableBudgetResult {
  const [budget, setBudget] = useState<Budget | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(Boolean(budgetId));
  const [loadErrorKey, setLoadErrorKey] = useState<BudgetLoadErrorKey | null>(
    null
  );

  useEffect(() => {
    if (!budgetId) {
      setBudget(undefined);
      setIsLoading(false);
      setLoadErrorKey(null);
      return;
    }

    let isCancelled = false;
    const currentBudgetId = budgetId;

    async function loadBudget(): Promise<void> {
      setIsLoading(true);
      setLoadErrorKey(null);

      try {
        const found = await getBudgetById(currentBudgetId);
        if (!isCancelled) {
          setBudget(found);
        }
      } catch (error: unknown) {
        if (isNotFoundError(error)) {
          if (!isCancelled) {
            setBudget(undefined);
          }
          return;
        }

        logger.error("editableBudget.load.failed", error);
        if (!isCancelled) {
          setLoadErrorKey("load_budget_error");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadBudget();

    return () => {
      isCancelled = true;
    };
  }, [budgetId]);

  return { budget, isLoading, loadErrorKey };
}

function isNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("not found") || message.includes("Could not find");
}
