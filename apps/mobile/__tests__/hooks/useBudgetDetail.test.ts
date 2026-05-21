import { renderHook, waitFor } from "@testing-library/react-native";
import type { Budget } from "@monyvi/db";

const mockDatabaseGet = jest.fn((tableName: string): string => tableName);
const mockObserveOwnedById = jest.fn();
const mockGetBudgetDetailReadModel = jest.fn<Promise<unknown>, [Budget]>();
const mockLoggerError = jest.fn();
const mockUnsubscribe = jest.fn();

interface MockObserver<TRecord> {
  readonly next: (record: TRecord) => void;
  readonly error: (error: unknown) => void;
}

const budget = {
  id: "budget-1",
  userId: "user-1",
  isCategoryBudget: false,
} as unknown as Budget;

const detailReadModel = {
  metrics: {
    spent: 250,
    limit: 1000,
    remaining: 750,
    percentage: 25,
    dailyAverage: 25,
    status: "safe",
  },
  daysLeft: 10,
  daysElapsed: 5,
  weeklySpending: [
    {
      bucket: { label: "May 1", weekStart: new Date(), weekEnd: new Date() },
      amount: 250,
    },
  ],
  subcategoryBreakdown: [],
  recentTransactions: [],
};

jest.mock("@monyvi/db", () => ({
  database: {
    get: (tableName: string): string => mockDatabaseGet(tableName),
  },
}));

jest.mock("@/services/user-data-access", () => ({
  observeOwnedById: (...args: readonly unknown[]): unknown =>
    mockObserveOwnedById(...args),
}));

jest.mock("@/services/budget-detail-read-model-service", () => ({
  getBudgetDetailReadModel: (input: Budget): Promise<unknown> =>
    mockGetBudgetDetailReadModel(input),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: (...args: readonly unknown[]): void => {
      mockLoggerError(...args);
    },
  },
}));

jest.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: (): { userId: string; isResolvingUser: boolean } => ({
    userId: "user-1",
    isResolvingUser: false,
  }),
  runUserScopedEffect: ({
    userId,
    isResolvingUser,
    onResolving,
    onSignedOut,
    onAuthenticated,
  }: {
    readonly userId: string | null;
    readonly isResolvingUser: boolean;
    readonly onResolving: () => void;
    readonly onSignedOut: () => void;
    readonly onAuthenticated: (userId: string) => void | (() => void);
  }): void | (() => void) => {
    if (isResolvingUser) {
      onResolving();
      return;
    }
    if (!userId) {
      onSignedOut();
      return;
    }
    return onAuthenticated(userId);
  },
}));

import { useBudgetDetail } from "@/hooks/useBudgetDetail";

describe("useBudgetDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObserveOwnedById.mockReturnValue({
      subscribe: (
        observer: MockObserver<Budget>
      ): { unsubscribe: jest.Mock } => {
        observer.next(budget);
        return { unsubscribe: mockUnsubscribe };
      },
    });
    mockGetBudgetDetailReadModel.mockResolvedValue(detailReadModel);
  });

  it("observes the scoped budget and delegates detail computation to the read model", async () => {
    const { result, unmount } = renderHook(() => useBudgetDetail("budget-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockObserveOwnedById).toHaveBeenCalledWith(
      "budgets",
      "budget-1",
      "user-1"
    );
    expect(mockGetBudgetDetailReadModel).toHaveBeenCalledWith(budget);
    expect(result.current.budget).toBe(budget);
    expect(result.current.metrics).toBe(detailReadModel.metrics);
    expect(result.current.weeklySpending).toBe(detailReadModel.weeklySpending);

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it("logs service failures and resets derived detail state", async () => {
    const error = new Error("read model failed");
    mockGetBudgetDetailReadModel.mockRejectedValue(error);

    const { result } = renderHook(() => useBudgetDetail("budget-1"));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.budget).toBe(budget);
    expect(result.current.metrics).toBeNull();
    expect(result.current.weeklySpending).toEqual([]);
    expect(result.current.subcategoryBreakdown).toEqual([]);
    expect(result.current.recentTransactions).toEqual([]);
    expect(mockLoggerError).toHaveBeenCalledWith(
      "budgetDetail.compute.failed",
      error
    );
  });
});
