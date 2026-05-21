import { BaseBudget } from "./base/base-budget";
import type { AlertFiredLevel } from "../types";

export class Budget extends BaseBudget {
  /**
   * Typed accessor for alertFiredLevel.
   * The base model stores this as `string | undefined`, but valid values
   * are constrained by the DB CHECK to NULL | 'WARNING' | 'DANGER'.
   */
  get typedAlertFiredLevel(): AlertFiredLevel | undefined {
    return this.alertFiredLevel;
  }

  get isActive(): boolean {
    return this.status === "ACTIVE";
  }

  get isPaused(): boolean {
    return this.status === "PAUSED";
  }

  get isGlobal(): boolean {
    return this.type === "GLOBAL";
  }

  get isCategoryBudget(): boolean {
    return this.type === "CATEGORY";
  }

  get isCustomPeriod(): boolean {
    return this.period === "CUSTOM";
  }

  /**
   * Check if spending has hit the alert threshold (warning level).
   * @param spent - Amount spent in this budget period
   * @returns true if spending >= alert_threshold percentage
   */
  shouldWarn(spent: number): boolean {
    if (this.amount === 0) return false;
    const percentage = (spent / this.amount) * 100;
    return percentage >= this.alertThreshold;
  }

  /**
   * Check if spending has exceeded the budget limit (danger level).
   * @param spent - Amount spent in this budget period
   * @returns true if spending >= 100% of budget
   */
  isOverBudget(spent: number): boolean {
    return spent >= this.amount;
  }

  /**
   * Calculate remaining budget.
   * @param spent - Amount spent in this budget period
   * @returns Remaining amount (clamped to 0)
   */
  remaining(spent: number): number {
    return Math.max(0, this.amount - spent);
  }

  /**
   * Calculate spent percentage.
   * @param spent - Amount spent in this budget period
   * @returns Percentage (0-100+)
   */
  spentPercentage(spent: number): number {
    if (this.amount === 0) return 0;
    return (spent / this.amount) * 100;
  }
}
