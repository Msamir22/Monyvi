const mockGetCurrentUserId = jest.fn<Promise<string | null>, []>();
const mockApplyRemoteChangeSetWithoutCursor = jest.fn<
  Promise<void>,
  unknown[]
>();
const mockFrom = jest.fn<unknown, [string]>();

jest.mock("@/services/supabase", () => ({
  getCurrentUserId: (): Promise<string | null> => mockGetCurrentUserId(),
  supabase: {
    from: (table: string): unknown => mockFrom(table),
  },
}));

jest.mock("@/services/remote-apply-service", () => ({
  applyRemoteChangeSetWithoutCursor: (...args: unknown[]): Promise<void> =>
    mockApplyRemoteChangeSetWithoutCursor(...args),
}));

import { refreshSharedReferenceDataAfterAuth } from "@/services/shared-reference-refresh-service";

interface QueryCall {
  readonly method: string;
  readonly args: readonly unknown[];
}

interface QueryMock {
  readonly calls: QueryCall[];
  readonly select: jest.Mock<QueryMock, [string]>;
  readonly gt: jest.Mock<QueryMock, [string, unknown]>;
  readonly eq: jest.Mock<QueryMock, [string, unknown]>;
  readonly is: jest.Mock<QueryMock, [string, unknown]>;
  readonly order: jest.Mock<Promise<unknown>, [string, unknown]>;
}

function createQueryMock(result: unknown): QueryMock {
  const calls: QueryCall[] = [];
  const query: QueryMock = {
    calls,
    select: jest.fn((...args: [string]): QueryMock => {
      calls.push({ method: "select", args });
      return query;
    }),
    gt: jest.fn((...args: [string, unknown]): QueryMock => {
      calls.push({ method: "gt", args });
      return query;
    }),
    eq: jest.fn((...args: [string, unknown]): QueryMock => {
      calls.push({ method: "eq", args });
      return query;
    }),
    is: jest.fn((...args: [string, unknown]): QueryMock => {
      calls.push({ method: "is", args });
      return query;
    }),
    order: jest.fn((...args: [string, unknown]): Promise<unknown> => {
      calls.push({ method: "order", args });
      return Promise.resolve(result);
    }),
  };
  return query;
}

describe("refreshSharedReferenceDataAfterAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("skips without touching Supabase when no authenticated user exists", async (): Promise<void> => {
    mockGetCurrentUserId.mockResolvedValue(null);
    const database = {};

    const result = await refreshSharedReferenceDataAfterAuth(database as never);

    expect(result).toEqual({
      marketRates: "skipped",
      systemCategories: "skipped",
    });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockApplyRemoteChangeSetWithoutCursor).not.toHaveBeenCalled();
  });

  it("refreshes market rates and ownerless system categories after authentication", async (): Promise<void> => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    const marketRatesQuery = createQueryMock({
      data: [
        {
          id: "rate-1",
          created_at: "2026-05-06T08:00:00.000Z",
          usd_egp: 50,
        },
      ],
      error: null,
    });
    const categoriesQuery = createQueryMock({
      data: [
        {
          id: "cat-system",
          created_at: "2026-05-06T08:00:00.000Z",
          updated_at: "2026-05-06T08:00:00.000Z",
          is_system: true,
          user_id: null,
          deleted: false,
          sort_order: 1,
        },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "market_rates") return marketRatesQuery;
      if (table === "categories") return categoriesQuery;
      throw new Error(`Unexpected table: ${table}`);
    });

    const database = {};
    const result = await refreshSharedReferenceDataAfterAuth(database as never);

    expect(result).toEqual({
      marketRates: "applied",
      systemCategories: "applied",
    });
    expect(mockFrom.mock.calls.map(([table]) => table)).toEqual([
      "market_rates",
      "categories",
    ]);
    expect(categoriesQuery.eq).toHaveBeenCalledWith("is_system", true);
    expect(categoriesQuery.is).toHaveBeenCalledWith("user_id", null);
    expect(categoriesQuery.eq).toHaveBeenCalledWith("deleted", false);
    expect(
      categoriesQuery.calls.some(
        (call) => call.method === "eq" && call.args[0] === "user_id"
      )
    ).toBe(false);
    expect(mockApplyRemoteChangeSetWithoutCursor).toHaveBeenCalledWith(
      database,
      expect.any(Object)
    );
    const appliedChanges = mockApplyRemoteChangeSetWithoutCursor.mock
      .calls[0]?.[1] as {
      readonly market_rates?: {
        readonly created?: readonly unknown[];
        readonly deleted?: readonly unknown[];
        readonly updated?: ReadonlyArray<Record<string, unknown>>;
      };
      readonly categories?: {
        readonly created?: readonly unknown[];
        readonly deleted?: readonly unknown[];
        readonly updated?: ReadonlyArray<Record<string, unknown>>;
      };
    };

    expect(appliedChanges.market_rates?.created).toEqual([]);
    expect(appliedChanges.market_rates?.deleted).toEqual([]);
    expect(appliedChanges.market_rates?.updated).toEqual([
      expect.objectContaining({ id: "rate-1" }),
    ]);
    expect(appliedChanges.categories?.created).toEqual([]);
    expect(appliedChanges.categories?.deleted).toEqual([]);
    expect(appliedChanges.categories?.updated).toEqual([
      expect.objectContaining({ id: "cat-system" }),
    ]);
  });

  it("never requests custom categories or dashboard-specific tables", async (): Promise<void> => {
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockFrom.mockImplementation((_table: string) =>
      createQueryMock({ data: [], error: null })
    );
    const database = {};

    await refreshSharedReferenceDataAfterAuth(database as never);

    expect(mockFrom).not.toHaveBeenCalledWith("accounts");
    expect(mockFrom).not.toHaveBeenCalledWith("transactions");
    expect(mockFrom).not.toHaveBeenCalledWith("profiles");
    expect(mockFrom).not.toHaveBeenCalledWith("budgets");
  });
});
