import { renderHook } from "@testing-library/react-native";

interface MockObserver<T> {
  readonly next: (result: readonly T[]) => void;
  readonly error: (err: unknown) => void;
}

interface MockObservable<T> {
  readonly subscribe: jest.Mock<{ unsubscribe: jest.Mock }, [MockObserver<T>]>;
}

const mockAccountsObserveWithColumns = jest.fn();
const mockAssetsObserve = jest.fn();
const mockAssetMetalsObserve = jest.fn();
const mockSnapshotsObserve = jest.fn();
const mockAccountsQuery = {
  observeWithColumns: mockAccountsObserveWithColumns,
};
const mockAssetsQuery = {
  observe: mockAssetsObserve,
};
const mockAssetMetalsQuery = {
  observe: mockAssetMetalsObserve,
};
const mockSnapshotsQuery = {
  observe: mockSnapshotsObserve,
};
const mockAccountsCollection = {
  query: jest.fn(() => mockAccountsQuery),
};
const mockAssetsCollection = {
  query: jest.fn(() => mockAssetsQuery),
};
const mockAssetMetalsCollection = {
  query: jest.fn(() => mockAssetMetalsQuery),
};
const mockSnapshotsCollection = {
  query: jest.fn(() => mockSnapshotsQuery),
};
const mockDatabaseGet = jest.fn((collectionName: string) => {
  if (collectionName === "accounts") return mockAccountsCollection;
  if (collectionName === "assets") return mockAssetsCollection;
  if (collectionName === "asset_metals") return mockAssetMetalsCollection;
  if (collectionName === "daily_snapshot_net_worth")
    return mockSnapshotsCollection;
  throw new Error(`Unexpected collection: ${collectionName}`);
});
const mockQueryOwned = jest.fn<unknown, unknown[]>((collection) => {
  if (collection === mockAccountsCollection) return mockAccountsQuery;
  if (collection === mockAssetsCollection) return mockAssetsQuery;
  if (collection === mockSnapshotsCollection) return mockSnapshotsQuery;
  return mockAccountsQuery;
});

jest.mock("@monyvi/db", () => ({
  database: {
    get: (collectionName: string): unknown => mockDatabaseGet(collectionName),
  },
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: (...args: readonly unknown[]) => ({ kind: "where", args }),
    oneOf: (items: readonly string[]) => ({ kind: "oneOf", items }),
    sortBy: (...args: readonly unknown[]) => ({ kind: "sortBy", args }),
    desc: "desc",
  },
}));

jest.mock("@/services/user-data-access", () => ({
  queryOwned: (...args: readonly unknown[]): unknown => mockQueryOwned(...args),
}));

jest.mock("@monyvi/logic", () => ({
  calculateAccountsTotalBalance: jest.fn(() => 0),
  calculateNetWorth: jest.fn((totalAccounts: number, totalAssets: number) => ({
    totalAccounts,
    totalAssets,
    totalNetWorth: totalAccounts + totalAssets,
  })),
  calculateTotalAssets: jest.fn(() => 0),
  convertCurrency: jest.fn((amount: number) => amount),
  getSameDayLastMonth: jest.fn(() => new Date("2025-12-01T00:00:00Z")),
}));

jest.mock("../../hooks/useMarketRates", () => ({
  useMarketRates: (): { latestRates: object; isLoading: boolean } => ({
    latestRates: {},
    isLoading: false,
  }),
}));

jest.mock("../../hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): { preferredCurrency: "USD" } => ({
    preferredCurrency: "USD",
  }),
}));

jest.mock("../../hooks/useCurrentUserId", () => ({
  useCurrentUserId: (): { userId: string; isResolvingUser: boolean } => ({
    userId: "user-1",
    isResolvingUser: false,
  }),
}));

// eslint-disable-next-line import/first
import {
  useMonthlyPercentageChange,
  useNetWorth,
} from "../../hooks/useNetWorth";

function buildObservable<T>(): MockObservable<T> {
  return {
    subscribe: jest.fn((observer: MockObserver<T>) => {
      void observer;
      return { unsubscribe: jest.fn() };
    }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAccountsObserveWithColumns.mockReturnValue(buildObservable());
  mockAssetsObserve.mockReturnValue(buildObservable());
  mockAssetMetalsObserve.mockReturnValue(buildObservable());
  mockSnapshotsObserve.mockReturnValue(buildObservable());
});

describe("useNetWorth", () => {
  it("scopes account reads to the current user", () => {
    const { unmount } = renderHook(() => useNetWorth());

    expect(mockQueryOwned).toHaveBeenCalledWith(
      mockAccountsCollection,
      "user-1",
      { kind: "where", args: ["deleted", false] }
    );

    unmount();
  });

  it("scopes asset parent reads before asset metals can be observed", () => {
    const { unmount } = renderHook(() => useNetWorth());

    expect(mockQueryOwned).toHaveBeenCalledWith(
      mockAssetsCollection,
      "user-1",
      { kind: "where", args: ["deleted", false] }
    );

    unmount();
  });

  it("scopes net worth snapshot reads to the current user", () => {
    const { unmount } = renderHook(() => useMonthlyPercentageChange());

    expect(mockQueryOwned).toHaveBeenCalledWith(
      mockSnapshotsCollection,
      "user-1",
      { kind: "sortBy", args: ["snapshot_date", "desc"] }
    );

    unmount();
  });
});
