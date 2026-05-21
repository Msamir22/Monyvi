import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { Category, Transaction } from "@monyvi/db";

const mockLoggerError = jest.fn();
const mockObserveMonthlyChartTransactions = jest.fn();
const mockObserveCategoryBreakdownSources = jest.fn();
const mockObserveComparisonTransactions = jest.fn();
const mockObserveMonthlySummaryTransactions = jest.fn();
const mockBuildMonthlyChartData = jest.fn();
const mockBuildCategoryBreakdown = jest.fn();
const mockBuildComparison = jest.fn();
const mockBuildMonthlySummaries = jest.fn();

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

function resetQuery<TRecord>(query: MockQuery<TRecord>): void {
  query.observerRef.current = null;
  query.observe.mockClear();
  query.unsubscribe.mockClear();
}

const monthlyChartQuery = createQuery<Transaction>();
const categoryTransactionsQuery = createQuery<Transaction>();
const categoriesQuery = createQuery<Category>();
const currentComparisonQuery = createQuery<Transaction>();
const previousComparisonQuery = createQuery<Transaction>();
const monthlySummaryQuery = createQuery<Transaction>();

const monthlyChartData = [{ label: "May", value: 100 }];
const categoryBreakdown = [
  { id: "food", name: "Food", level: 1, amount: 100, percentage: 100 },
];
const comparisonData = {
  currentTotal: 200,
  previousTotal: 100,
  absoluteChange: 100,
  percentageChange: 100,
  trend: "up",
};
const monthlySummaries = [
  {
    year: 2026,
    month: 5,
    totalExpenses: 100,
    totalIncome: 200,
    netChange: 100,
    transactionCount: 2,
  },
];

jest.mock("@/services/analytics-read-model-service", () => ({
  buildCategoryBreakdown: (...args: readonly unknown[]): unknown =>
    mockBuildCategoryBreakdown(...args),
  buildComparison: (...args: readonly unknown[]): unknown =>
    mockBuildComparison(...args),
  buildMonthlyChartData: (...args: readonly unknown[]): unknown =>
    mockBuildMonthlyChartData(...args),
  buildMonthlySummaries: (...args: readonly unknown[]): unknown =>
    mockBuildMonthlySummaries(...args),
  observeCategoryBreakdownSources: (...args: readonly unknown[]): unknown =>
    mockObserveCategoryBreakdownSources(...args),
  observeComparisonTransactions: (...args: readonly unknown[]): unknown =>
    mockObserveComparisonTransactions(...args),
  observeMonthlyChartTransactions: (...args: readonly unknown[]): unknown =>
    mockObserveMonthlyChartTransactions(...args),
  observeMonthlySummaryTransactions: (...args: readonly unknown[]): unknown =>
    mockObserveMonthlySummaryTransactions(...args),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: (...args: readonly unknown[]): void => {
      mockLoggerError(...args);
    },
  },
}));

jest.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: (): { userId: string | null; isResolvingUser: boolean } => ({
    userId: mockUserId,
    isResolvingUser: mockIsResolvingUser,
  }),
}));

import {
  useCategoryBreakdown,
  useComparison,
  useMonthlyChartData,
  useMonthlySummaries,
} from "@/hooks/useAnalytics";

describe("useAnalytics", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockUserId = "user-1";
    mockIsResolvingUser = false;
    resetQuery(monthlyChartQuery);
    resetQuery(categoryTransactionsQuery);
    resetQuery(categoriesQuery);
    resetQuery(currentComparisonQuery);
    resetQuery(previousComparisonQuery);
    resetQuery(monthlySummaryQuery);

    mockObserveMonthlyChartTransactions.mockReturnValue(monthlyChartQuery);
    mockObserveCategoryBreakdownSources.mockReturnValue({
      transactionsQuery: categoryTransactionsQuery,
      categoriesQuery,
    });
    mockObserveComparisonTransactions.mockReturnValue({
      currentQuery: currentComparisonQuery,
      previousQuery: previousComparisonQuery,
    });
    mockObserveMonthlySummaryTransactions.mockReturnValue(monthlySummaryQuery);
    mockBuildMonthlyChartData.mockReturnValue(monthlyChartData);
    mockBuildCategoryBreakdown.mockReturnValue(categoryBreakdown);
    mockBuildComparison.mockReturnValue(comparisonData);
    mockBuildMonthlySummaries.mockReturnValue(monthlySummaries);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("subscribes monthly chart data through the analytics read model", async () => {
    const { result } = renderHook(() =>
      useMonthlyChartData(6, ["account-1"], "EXPENSE")
    );

    act(() => {
      monthlyChartQuery.observerRef.current?.next([
        { id: "tx-1" } as unknown as Transaction,
      ]);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockObserveMonthlyChartTransactions).toHaveBeenCalledWith({
      userId: "user-1",
      months: 6,
      type: "EXPENSE",
      accountIds: ["account-1"],
    });
    expect(mockBuildMonthlyChartData).toHaveBeenCalledWith([{ id: "tx-1" }], {
      months: 6,
      type: "EXPENSE",
    });
    expect(result.current.data).toBe(monthlyChartData);
  });

  it("keeps monthly chart reads disabled while resolving or signed out", async () => {
    mockIsResolvingUser = true;

    const { result, rerender } = renderHook(() => useMonthlyChartData());

    expect(result.current.isLoading).toBe(true);
    expect(mockObserveMonthlyChartTransactions).not.toHaveBeenCalled();

    mockIsResolvingUser = false;
    mockUserId = null;
    rerender(undefined);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(mockObserveMonthlyChartTransactions).not.toHaveBeenCalled();
  });

  it("logs monthly chart observation failures and exposes the error", async () => {
    const error = new Error("monthly chart failed");

    const { result } = renderHook(() => useMonthlyChartData());

    act(() => {
      monthlyChartQuery.observerRef.current?.error(error);
    });

    await waitFor(() => {
      expect(result.current.error).toBe(error);
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      "analytics.monthlyChart.observe.failed",
      error
    );
  });

  it("refetches monthly chart data by resubscribing", () => {
    const { result } = renderHook(() => useMonthlyChartData());

    act(() => {
      result.current.refetch();
    });

    expect(mockObserveMonthlyChartTransactions).toHaveBeenCalledTimes(2);
  });

  it("subscribes category breakdown sources through the analytics read model", async () => {
    const { result } = renderHook(() =>
      useCategoryBreakdown(2026, 5, ["account-1"])
    );

    act(() => {
      categoryTransactionsQuery.observerRef.current?.next([
        { id: "tx-1" } as unknown as Transaction,
      ]);
      categoriesQuery.observerRef.current?.next([
        { id: "food" } as unknown as Category,
      ]);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockObserveCategoryBreakdownSources).toHaveBeenCalledWith({
      userId: "user-1",
      year: 2026,
      month: 5,
      accountIds: ["account-1"],
    });
    expect(mockBuildCategoryBreakdown).toHaveBeenCalledWith(
      [{ id: "tx-1" }],
      [{ id: "food" }]
    );
    expect(result.current.data).toBe(categoryBreakdown);
  });

  it("keeps non-monthly analytics reads disabled while signed out", async () => {
    mockUserId = null;

    const category = renderHook(() => useCategoryBreakdown(2026, 5));
    const comparison = renderHook(() => useComparison("mom", 2026, 5));
    const summaries = renderHook(() => useMonthlySummaries());

    await waitFor(() => {
      expect(category.result.current.isLoading).toBe(false);
      expect(comparison.result.current.isLoading).toBe(false);
      expect(summaries.result.current.isLoading).toBe(false);
    });

    expect(mockObserveCategoryBreakdownSources).not.toHaveBeenCalled();
    expect(mockObserveComparisonTransactions).not.toHaveBeenCalled();
    expect(mockObserveMonthlySummaryTransactions).not.toHaveBeenCalled();
  });

  it("logs category transaction observation failures and stops loading", async () => {
    const error = new Error("category transactions failed");
    const { result } = renderHook(() => useCategoryBreakdown(2026, 5));

    act(() => {
      categoryTransactionsQuery.observerRef.current?.error(error);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error);
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      "analytics.categoryTransactions.observe.failed",
      error
    );
  });

  it("refetches category breakdown without rebuilding unchanged data", () => {
    const { result } = renderHook(() => useCategoryBreakdown(2026, 5));
    mockBuildCategoryBreakdown.mockClear();

    act(() => {
      result.current.refetch();
    });

    expect(mockObserveCategoryBreakdownSources).toHaveBeenCalledTimes(2);
    expect(mockBuildCategoryBreakdown).not.toHaveBeenCalled();
  });

  it("subscribes comparison sources through the analytics read model", async () => {
    const { result } = renderHook(() =>
      useComparison("mom", 2026, 5, ["account-1"])
    );

    act(() => {
      currentComparisonQuery.observerRef.current?.next([
        { id: "current" } as unknown as Transaction,
      ]);
      previousComparisonQuery.observerRef.current?.next([
        { id: "previous" } as unknown as Transaction,
      ]);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockObserveComparisonTransactions).toHaveBeenCalledWith({
      userId: "user-1",
      type: "mom",
      year: 2026,
      month: 5,
      accountIds: ["account-1"],
    });
    expect(mockBuildComparison).toHaveBeenCalledWith(
      [{ id: "current" }],
      [{ id: "previous" }]
    );
    expect(result.current.data).toBe(comparisonData);
  });

  it("logs comparison observation failures and stops loading", async () => {
    const error = new Error("current comparison failed");
    const { result } = renderHook(() => useComparison("mom", 2026, 5));

    act(() => {
      currentComparisonQuery.observerRef.current?.error(error);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error);
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      "analytics.currentPeriod.observe.failed",
      error
    );
  });

  it("refetches comparison without rebuilding unchanged data", () => {
    const { result } = renderHook(() => useComparison("mom", 2026, 5));
    mockBuildComparison.mockClear();

    act(() => {
      result.current.refetch();
    });

    expect(mockObserveComparisonTransactions).toHaveBeenCalledTimes(2);
    expect(mockBuildComparison).not.toHaveBeenCalled();
  });

  it("resubscribes default comparison sources when the local month changes", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 31, 23, 59, 59, 900));

    renderHook(() => useComparison("mom"));

    expect(mockObserveComparisonTransactions).toHaveBeenLastCalledWith({
      userId: "user-1",
      type: "mom",
      year: 2026,
      month: 5,
      accountIds: [],
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(mockObserveComparisonTransactions).toHaveBeenLastCalledWith({
      userId: "user-1",
      type: "mom",
      year: 2026,
      month: 6,
      accountIds: [],
    });
  });

  it("refreshes the default comparison period when explicit filters are cleared", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 4, 31, 23, 59, 59, 900));

    const { rerender } = renderHook(
      ({ year, month }: { readonly year?: number; readonly month?: number }) =>
        useComparison("mom", year, month),
      { initialProps: { year: 2026, month: 5 } }
    );

    jest.setSystemTime(new Date(2026, 5, 1, 0, 0, 0, 100));

    rerender({ year: undefined, month: undefined });

    await waitFor(() => {
      expect(mockObserveComparisonTransactions).toHaveBeenLastCalledWith({
        userId: "user-1",
        type: "mom",
        year: 2026,
        month: 6,
        accountIds: [],
      });
    });
  });

  it("subscribes monthly summaries through the analytics read model", async () => {
    const { result } = renderHook(() => useMonthlySummaries(3, ["account-1"]));

    act(() => {
      monthlySummaryQuery.observerRef.current?.next([
        { id: "summary" } as unknown as Transaction,
      ]);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockObserveMonthlySummaryTransactions).toHaveBeenCalledWith({
      userId: "user-1",
      months: 3,
      accountIds: ["account-1"],
    });
    expect(mockBuildMonthlySummaries).toHaveBeenCalledWith(
      [{ id: "summary" }],
      { months: 3 }
    );
    expect(result.current.data).toBe(monthlySummaries);
  });

  it("logs monthly summary observation failures and exposes the error", async () => {
    const error = new Error("monthly summaries failed");
    const { result } = renderHook(() => useMonthlySummaries());

    act(() => {
      monthlySummaryQuery.observerRef.current?.error(error);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(error);
    });
    expect(mockLoggerError).toHaveBeenCalledWith(
      "analytics.monthlySummaries.observe.failed",
      error
    );
  });

  it("refetches monthly summaries without rebuilding unchanged data", () => {
    const { result } = renderHook(() => useMonthlySummaries());
    mockBuildMonthlySummaries.mockClear();

    act(() => {
      result.current.refetch();
    });

    expect(mockObserveMonthlySummaryTransactions).toHaveBeenCalledTimes(2);
    expect(mockBuildMonthlySummaries).not.toHaveBeenCalled();
  });
});
