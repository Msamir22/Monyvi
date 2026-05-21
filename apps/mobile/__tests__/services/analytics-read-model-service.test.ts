import type { Category, Transaction } from "@monyvi/db";

const mockTransactionsCollection = { table: "transactions" };
const mockCategoriesCollection = { table: "categories" };
const mockTransactionsQuery = { kind: "transactions-query" };
const mockCategoriesQuery = { kind: "categories-query" };
const mockCurrentQuery = { kind: "current-query" };
const mockPreviousQuery = { kind: "previous-query" };
const mockDatabaseGet = jest.fn((tableName: string): unknown => {
  if (tableName === "transactions") return mockTransactionsCollection;
  if (tableName === "categories") return mockCategoriesCollection;
  throw new Error(`Unexpected table: ${tableName}`);
});
const mockQueryOwned = jest.fn();
const mockQueryAccessibleCategories = jest.fn();

interface QueryCondition {
  readonly kind: "where" | "gte" | "lte" | "oneOf";
  readonly column?: string;
  readonly value: unknown;
}

jest.mock("@monyvi/db", () => ({
  database: {
    get: (tableName: string): unknown => mockDatabaseGet(tableName),
  },
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    gte: (value: unknown): QueryCondition => ({ kind: "gte", value }),
    lte: (value: unknown): QueryCondition => ({ kind: "lte", value }),
    oneOf: (value: unknown): QueryCondition => ({ kind: "oneOf", value }),
    where: (column: string, value: unknown): QueryCondition => ({
      kind: "where",
      column,
      value,
    }),
  },
}));

jest.mock("@/services/user-data-access", () => ({
  queryAccessibleCategories: (...args: readonly unknown[]): unknown =>
    mockQueryAccessibleCategories(...args),
  queryOwned: (...args: readonly unknown[]): unknown => mockQueryOwned(...args),
}));

import {
  buildCategoryBreakdown,
  buildComparison,
  buildMonthlyChartData,
  buildMonthlySummaries,
  observeCategoryBreakdownSources,
  observeComparisonTransactions,
  observeMonthlyChartTransactions,
  observeMonthlySummaryTransactions,
} from "@/services/analytics-read-model-service";

function createTransaction(
  id: string,
  amount: number,
  type: "EXPENSE" | "INCOME",
  date: Date,
  categoryId = "food"
): Transaction {
  return {
    id,
    amount,
    type,
    date,
    dateInMs: date.getTime(),
    categoryId,
  } as unknown as Transaction;
}

function createCategory(
  id: string,
  displayName: string,
  parentId: string | null = null
): Category {
  return {
    id,
    displayName,
    parentId,
    level: parentId ? 2 : 1,
    color: "#fff",
  } as unknown as Category;
}

function queryOwnedCallsIncludeAccountFilter(): boolean {
  const calls = mockQueryOwned.mock.calls as ReadonlyArray<readonly unknown[]>;

  return calls.some((call) =>
    call.some((arg: unknown) => isColumnCondition(arg, "account_id"))
  );
}

function isColumnCondition(value: unknown, column: string): boolean {
  if (typeof value !== "object" || value === null || !("column" in value)) {
    return false;
  }

  return (value as { readonly column: unknown }).column === column;
}

describe("analytics-read-model-service", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-15T12:00:00.000Z"));
    jest.clearAllMocks();
    mockQueryOwned.mockReturnValue(mockTransactionsQuery);
    mockQueryAccessibleCategories.mockReturnValue(mockCategoriesQuery);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("builds a scoped monthly chart transaction query with type and account filters", () => {
    const query = observeMonthlyChartTransactions({
      userId: "user-1",
      months: 6,
      type: "EXPENSE",
      accountIds: ["account-1", "account-2"],
    });

    expect(query).toBe(mockTransactionsQuery);
    expect(mockQueryOwned).toHaveBeenCalledWith(
      mockTransactionsCollection,
      "user-1",
      { kind: "where", column: "deleted", value: false },
      {
        kind: "where",
        column: "date",
        value: { kind: "gte", value: new Date(2025, 11, 1).getTime() },
      },
      { kind: "where", column: "type", value: "EXPENSE" },
      {
        kind: "where",
        column: "account_id",
        value: { kind: "oneOf", value: ["account-1", "account-2"] },
      }
    );
  });

  it("builds monthly chart data with the requested month window and type", () => {
    const transactions = [
      createTransaction("tx-1", 300, "EXPENSE", new Date("2026-05-01")),
      createTransaction("tx-2", 100, "INCOME", new Date("2026-05-02")),
    ];

    const result = buildMonthlyChartData(transactions, {
      months: 1,
      type: "EXPENSE",
    });

    expect(result).toEqual([{ label: "May", value: 300 }]);
  });

  it("omits account filters when monthly chart account IDs are not provided", () => {
    observeMonthlyChartTransactions({
      userId: "user-1",
      months: 6,
      type: "EXPENSE",
    });

    expect(queryOwnedCallsIncludeAccountFilter()).toBe(false);
  });

  it("builds scoped category breakdown source queries and delegates aggregation", () => {
    const sources = observeCategoryBreakdownSources({
      userId: "user-1",
      year: 2026,
      month: 5,
      accountIds: ["account-1"],
    });

    expect(sources).toEqual({
      transactionsQuery: mockTransactionsQuery,
      categoriesQuery: mockCategoriesQuery,
    });
    expect(mockQueryOwned).toHaveBeenCalledWith(
      mockTransactionsCollection,
      "user-1",
      { kind: "where", column: "deleted", value: false },
      {
        kind: "where",
        column: "date",
        value: { kind: "gte", value: new Date(2026, 4, 1).getTime() },
      },
      {
        kind: "where",
        column: "date",
        value: {
          kind: "lte",
          value: new Date(2026, 5, 0, 23, 59, 59, 999).getTime(),
        },
      },
      {
        kind: "where",
        column: "account_id",
        value: { kind: "oneOf", value: ["account-1"] },
      }
    );
    expect(mockQueryAccessibleCategories).toHaveBeenCalledWith(
      mockCategoriesCollection,
      "user-1",
      { kind: "where", column: "deleted", value: false }
    );

    const breakdown = buildCategoryBreakdown(
      [createTransaction("tx-1", 150, "EXPENSE", new Date("2026-05-01"))],
      [createCategory("food", "Food")]
    );
    expect(breakdown).toMatchObject([{ id: "food", amount: 150 }]);
  });

  it("builds comparison queries and compares expense totals", () => {
    mockQueryOwned
      .mockReturnValueOnce(mockCurrentQuery)
      .mockReturnValueOnce(mockPreviousQuery);

    const queries = observeComparisonTransactions({
      userId: "user-1",
      type: "mom",
      year: 2026,
      month: 5,
      accountIds: ["account-1"],
    });

    expect(queries).toEqual({
      currentQuery: mockCurrentQuery,
      previousQuery: mockPreviousQuery,
    });
    expect(mockQueryOwned).toHaveBeenCalledTimes(2);

    const comparison = buildComparison(
      [createTransaction("current", 200, "EXPENSE", new Date("2026-05-01"))],
      [createTransaction("previous", 100, "EXPENSE", new Date("2026-04-01"))]
    );

    expect(comparison).toMatchObject({
      currentTotal: 200,
      previousTotal: 100,
      absoluteChange: 100,
      percentageChange: 100,
      trend: "up",
    });
  });

  it("builds scoped monthly summary query and ordered summaries", () => {
    const query = observeMonthlySummaryTransactions({
      userId: "user-1",
      months: 2,
      accountIds: ["account-1"],
    });

    expect(query).toBe(mockTransactionsQuery);
    expect(mockQueryOwned).toHaveBeenCalledWith(
      mockTransactionsCollection,
      "user-1",
      { kind: "where", column: "deleted", value: false },
      {
        kind: "where",
        column: "date",
        value: { kind: "gte", value: new Date(2026, 3, 1).getTime() },
      },
      {
        kind: "where",
        column: "account_id",
        value: { kind: "oneOf", value: ["account-1"] },
      }
    );

    const summaries = buildMonthlySummaries(
      [
        createTransaction("april", 100, "EXPENSE", new Date("2026-04-15")),
        createTransaction("may", 250, "INCOME", new Date("2026-05-15")),
      ],
      { months: 2 }
    );

    expect(summaries).toEqual([
      {
        year: 2026,
        month: 4,
        totalExpenses: 100,
        totalIncome: 0,
        netChange: -100,
        transactionCount: 1,
      },
      {
        year: 2026,
        month: 5,
        totalExpenses: 0,
        totalIncome: 250,
        netChange: 250,
        transactionCount: 1,
      },
    ]);
  });

  it("omits account filters when monthly summary account IDs are not provided", () => {
    observeMonthlySummaryTransactions({
      userId: "user-1",
      months: 2,
    });

    expect(queryOwnedCallsIncludeAccountFilter()).toBe(false);
  });

  it("rejects invalid month windows before building queries or summaries", () => {
    expect(() =>
      observeMonthlyChartTransactions({
        userId: "user-1",
        months: 0,
        type: "EXPENSE",
      })
    ).toThrow("months must be a positive integer");
    expect(() =>
      observeMonthlySummaryTransactions({
        userId: "user-1",
        months: -1,
      })
    ).toThrow("months must be a positive integer");
    expect(() =>
      buildMonthlyChartData([], {
        months: 1.5,
        type: "EXPENSE",
      })
    ).toThrow("months must be a positive integer");
    expect(() => buildMonthlySummaries([], { months: 0 })).toThrow(
      "months must be a positive integer"
    );
  });
});
