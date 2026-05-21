const mockGetCurrentUserId = jest.fn();
const mockFrom = jest.fn();

interface SupabaseResult {
  readonly data: ReadonlyArray<Record<string, unknown>> | null;
  readonly error: { readonly message: string } | null;
}

interface SelectChain {
  readonly select: jest.Mock;
  readonly eq: jest.Mock;
  readonly gt: jest.Mock;
  readonly or: jest.Mock;
  readonly in: jest.Mock;
  readonly order: jest.Mock;
  readonly then: (
    resolve: (value: SupabaseResult) => unknown,
    reject?: (reason: unknown) => unknown
  ) => Promise<unknown>;
}

const tableChains = new Map<string, SelectChain[]>();

jest.mock("@monyvi/db", () => ({
  schema: {
    tables: {
      market_rates: {},
      daily_snapshot_balance: {},
      categories: {},
      asset_metals: {},
      profiles: {},
    },
  },
}));

jest.mock("@/services/supabase", () => ({
  getCurrentUserId: (): Promise<string | null> =>
    mockGetCurrentUserId() as Promise<string | null>,
  supabase: {
    from: (table: string): unknown => mockFrom(table),
  },
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

import { pullChanges } from "../../services/sync/pull-strategies";

function makeSelectChain(
  result: SupabaseResult = { data: [], error: null }
): SelectChain {
  const chain: SelectChain = {
    select: jest.fn((): SelectChain => chain),
    eq: jest.fn((): SelectChain => chain),
    gt: jest.fn((): SelectChain => chain),
    or: jest.fn((): SelectChain => chain),
    in: jest.fn((): SelectChain => chain),
    order: jest.fn((): SelectChain => chain),
    then: (
      resolve: (value: SupabaseResult) => unknown,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject),
  };

  return chain;
}

function getFirstChain(table: string): SelectChain {
  const chains = tableChains.get(table);
  if (!chains || chains.length === 0) {
    throw new Error(`Missing Supabase chain for ${table}`);
  }

  return chains[0];
}

beforeEach(() => {
  jest.clearAllMocks();
  tableChains.clear();
  mockGetCurrentUserId.mockResolvedValue("current-user");
  mockFrom.mockImplementation((table: string) => {
    const result =
      table === "assets"
        ? { data: [{ id: "asset-1" }], error: null }
        : { data: [], error: null };
    const chain = makeSelectChain(result);
    const chains = tableChains.get(table) ?? [];
    chains.push(chain);
    tableChains.set(table, chains);

    return chain;
  });
});

describe("pullChanges", () => {
  it("dispatches each syncable table through its scoped pull strategy", async () => {
    await pullChanges(Date.UTC(2026, 4, 18, 8));

    expect(getFirstChain("market_rates").select).toHaveBeenCalledWith("*");
    expect(getFirstChain("market_rates").gt).toHaveBeenCalledWith(
      "created_at",
      expect.any(String)
    );
    expect(getFirstChain("market_rates").order).toHaveBeenCalledWith(
      "created_at",
      { ascending: false }
    );

    expect(getFirstChain("daily_snapshot_balance").eq).toHaveBeenCalledWith(
      "user_id",
      "current-user"
    );
    expect(getFirstChain("daily_snapshot_balance").gt).toHaveBeenCalledWith(
      "created_at",
      "2026-05-18T08:00:00.000Z"
    );

    expect(getFirstChain("categories").or).toHaveBeenCalledWith(
      "user_id.eq.current-user,user_id.is.null"
    );
    expect(getFirstChain("categories").gt).toHaveBeenCalledWith(
      "updated_at",
      "2026-05-18T08:00:00.000Z"
    );

    expect(getFirstChain("assets").eq).toHaveBeenCalledWith(
      "user_id",
      "current-user"
    );
    expect(getFirstChain("asset_metals").in).toHaveBeenCalledWith("asset_id", [
      "asset-1",
    ]);
    expect(getFirstChain("asset_metals").gt).toHaveBeenCalledWith(
      "updated_at",
      "2026-05-18T08:00:00.000Z"
    );

    expect(getFirstChain("profiles").eq).toHaveBeenCalledWith(
      "user_id",
      "current-user"
    );
    expect(getFirstChain("profiles").gt).toHaveBeenCalledWith(
      "updated_at",
      "2026-05-18T08:00:00.000Z"
    );
  });

  it("returns an empty changeset without querying Supabase when unauthenticated", async () => {
    mockGetCurrentUserId.mockResolvedValue(null);

    const result = await pullChanges(null);

    if (!("changes" in result)) {
      throw new Error("Expected WatermelonDB changes result");
    }
    expect(result.changes).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
