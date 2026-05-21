import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { Budget } from "@monyvi/db";

const mockLoggerError = jest.fn();
const mockObserveBudgetList = jest.fn();
const mockBuildBudgetMetrics = jest.fn();
const mockBuildBudgetListReadModel = jest.fn();

let mockUserId: string | null = "user-1";
let mockIsResolvingUser = false;

interface MockObserver<TRecord> {
  readonly next: (records: TRecord[]) => void;
  readonly error: (error: unknown) => void;
}

interface MockQuery<TRecord> {
  readonly observe: jest.Mock<{
    readonly subscribe: jest.Mock<
      { readonly unsubscribe: jest.Mock },
      [MockObserver<TRecord>]
    >;
  }>;
  readonly observerRef: { current: MockObserver<TRecord> | null };
  readonly unsubscribe: jest.Mock;
}

function createQuery<TRecord>(): MockQuery<TRecord> {
  const observerRef: { current: MockObserver<TRecord> | null } = {
    current: null,
  };
  const unsubscribe = jest.fn();

  return {
    observerRef,
    unsubscribe,
    observe: jest.fn(() => ({
      subscribe: jest.fn((observer: MockObserver<TRecord>) => {
        observerRef.current = observer;
        return { unsubscribe };
      }),
    })),
  };
}

const budgetQuery = createQuery<Budget>();
const rawBudgets = [{ id: "budget-1" } as unknown as Budget];
const budgetMetrics = [
  {
    budget: rawBudgets[0],
    metrics: { spent: 100 },
    daysLeft: 10,
    daysElapsed: 5,
  },
];
const listReadModel = {
  budgets: budgetMetrics,
  globalBudget: undefined,
  categoryBudgets: budgetMetrics,
  pausedBudgets: [],
  totalCount: 1,
};

jest.mock("@/services/budget-list-read-model-service", () => ({
  buildBudgetListReadModel: (...args: readonly unknown[]): unknown =>
    mockBuildBudgetListReadModel(...args),
  buildBudgetMetrics: (...args: readonly unknown[]): unknown =>
    mockBuildBudgetMetrics(...args),
  observeBudgetList: (...args: readonly unknown[]): unknown =>
    mockObserveBudgetList(...args),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: (...args: readonly unknown[]): void => {
      mockLoggerError(...args);
    },
  },
}));

jest.mock("../../hooks/useCurrentUser", () => ({
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
  useCurrentUser: (): { userId: string | null; isResolvingUser: boolean } => ({
    userId: mockUserId,
    isResolvingUser: mockIsResolvingUser,
  }),
}));

import { useBudgets } from "@/hooks/useBudgets";

describe("useBudgets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = "user-1";
    mockIsResolvingUser = false;
    mockObserveBudgetList.mockReturnValue(budgetQuery);
    mockBuildBudgetMetrics.mockResolvedValue(budgetMetrics);
    mockBuildBudgetListReadModel.mockReturnValue(listReadModel);
  });

  it("observes budgets and delegates metric/read-model shaping to the service", async () => {
    const { result } = renderHook(() => useBudgets());

    act(() => {
      budgetQuery.observerRef.current?.next(rawBudgets);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockObserveBudgetList).toHaveBeenCalledWith("user-1");
    expect(mockBuildBudgetMetrics).toHaveBeenCalledWith(rawBudgets);
    expect(mockBuildBudgetListReadModel).toHaveBeenCalledWith(
      budgetMetrics,
      "ALL"
    );
    expect(result.current.budgets).toBe(listReadModel.budgets);
    expect(result.current.categoryBudgets).toBe(listReadModel.categoryBudgets);
    expect(result.current.totalCount).toBe(1);
  });

  it("keeps reads disabled while resolving or signed out", async () => {
    mockIsResolvingUser = true;

    const { result, rerender } = renderHook(() => useBudgets());

    expect(result.current.isLoading).toBe(true);
    expect(mockObserveBudgetList).not.toHaveBeenCalled();

    mockIsResolvingUser = false;
    mockUserId = null;
    rerender(undefined);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockObserveBudgetList).not.toHaveBeenCalled();
  });

  it("applies period filter through the read-model service", async () => {
    const { result } = renderHook(() => useBudgets());

    act(() => {
      budgetQuery.observerRef.current?.next(rawBudgets);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setPeriodFilter("WEEKLY");
    });

    expect(mockBuildBudgetListReadModel).toHaveBeenLastCalledWith(
      budgetMetrics,
      "WEEKLY"
    );
  });

  it("refreshes budget metrics without replacing the public return shape", async () => {
    const { result } = renderHook(() => useBudgets());

    act(() => {
      budgetQuery.observerRef.current?.next(rawBudgets);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    const callsBeforeRefresh = mockBuildBudgetMetrics.mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockBuildBudgetMetrics).toHaveBeenCalledTimes(
        callsBeforeRefresh + 1
      );
    });
    expect(result.current).toHaveProperty("globalBudget");
    expect(result.current).toHaveProperty("pausedBudgets");
  });

  it("logs observation failures and clears loading", async () => {
    const error = new Error("observe failed");
    const { result } = renderHook(() => useBudgets());

    act(() => {
      budgetQuery.observerRef.current?.error(error);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      "budgets.observe.failed",
      error
    );
  });

  it("logs metric calculation failures and resets computed budgets", async () => {
    const error = new Error("metrics failed");
    mockBuildBudgetMetrics.mockRejectedValue(error);

    const { result } = renderHook(() => useBudgets());

    act(() => {
      budgetQuery.observerRef.current?.next(rawBudgets);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      "budgets.readModel.failed",
      error
    );
    expect(mockBuildBudgetListReadModel).toHaveBeenLastCalledWith([], "ALL");
  });
});
