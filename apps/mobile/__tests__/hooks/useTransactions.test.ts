import { act, renderHook, waitFor } from "@testing-library/react-native";

interface MockSubscription {
  readonly unsubscribe: jest.Mock;
}

interface MockObserver<T> {
  readonly next: (result: readonly T[]) => void;
  readonly error: (err: unknown) => void;
}

interface MockObservable<T> {
  readonly subscribe: jest.Mock<MockSubscription, [MockObserver<T>]>;
}

interface MockQuery<T> {
  readonly observe: jest.Mock<MockObservable<T>, []>;
  readonly observeWithColumns: jest.Mock<
    MockObservable<T>,
    [readonly string[]]
  >;
}

interface MockTransaction {
  readonly id: string;
  readonly categoryId: string;
}

const mockObservers: Array<MockObserver<MockTransaction>> = [];
const mockObserve = jest.fn<MockObservable<MockTransaction>, []>();
const mockObserveWithColumns = jest.fn<
  MockObservable<MockTransaction>,
  [readonly string[]]
>();
const mockQueryOwned = jest.fn();
const mockDatabaseGet = jest.fn();

const mockQuery: MockQuery<MockTransaction> = {
  observe: mockObserve,
  observeWithColumns: mockObserveWithColumns,
};

function buildObservable(): MockObservable<MockTransaction> {
  return {
    subscribe: jest.fn((observer: MockObserver<MockTransaction>) => {
      mockObservers.push(observer);
      return { unsubscribe: jest.fn() };
    }),
  };
}

jest.mock("@monyvi/db", () => ({
  database: {
    get: (collectionName: string): unknown => mockDatabaseGet(collectionName),
  },
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    desc: "desc",
    sortBy: (...args: readonly unknown[]) => ({ kind: "sortBy", args }),
    take: (...args: readonly unknown[]) => ({ kind: "take", args }),
    where: (...args: readonly unknown[]) => ({ kind: "where", args }),
  },
}));

jest.mock("@/services/user-data-access", () => ({
  queryOwned: (...args: readonly unknown[]): unknown => mockQueryOwned(...args),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: (): {
    readonly userId: string;
    readonly isResolvingUser: false;
  } => ({
    userId: "user-1",
    isResolvingUser: false,
  }),
  runUserScopedEffect: ({
    onAuthenticated,
  }: {
    readonly onAuthenticated: (userId: string) => () => void;
  }): (() => void) => onAuthenticated("user-1"),
}));

import { useRecentTransactions } from "../../hooks/useTransactions";

describe("useRecentTransactions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObservers.length = 0;
    mockDatabaseGet.mockReturnValue({ table: "transactions" });
    mockQueryOwned.mockReturnValue(mockQuery);
    mockObserve.mockReturnValue(buildObservable());
    mockObserveWithColumns.mockReturnValue(buildObservable());
  });

  it("observes category_id changes so dashboard recent rows refresh after edit", async () => {
    const { result } = renderHook(() => useRecentTransactions(3));

    await waitFor(() => {
      expect(mockObserveWithColumns).toHaveBeenCalledWith(
        expect.arrayContaining(["category_id"])
      );
    });

    expect(mockObserve).not.toHaveBeenCalled();

    act(() => {
      mockObservers[0].next([{ id: "tx-1", categoryId: "cat-new" }]);
    });

    await waitFor(() => {
      expect(result.current.transactions).toEqual([
        { id: "tx-1", categoryId: "cat-new" },
      ]);
      expect(result.current.isLoading).toBe(false);
    });
  });
});
