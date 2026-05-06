import { renderHook } from "@testing-library/react-native";

const mockQuery = jest.fn<unknown, unknown[]>();
const mockObserve = jest.fn();
const mockSubscribe = jest.fn();
const mockQueryOwned = jest.fn<unknown, unknown[]>();
const mockUseCurrentUserId = jest.fn();

jest.mock("@monyvi/db", () => ({
  database: {
    get: jest.fn(() => ({
      query: (...clauses: unknown[]): unknown => mockQuery(...clauses),
    })),
  },
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: (...args: unknown[]) => ({ where: args }),
    sortBy: (...args: unknown[]) => ({ sortBy: args }),
    take: (limit: number) => ({ take: limit }),
    gte: (value: unknown) => ({ gte: value }),
    lte: (value: unknown) => ({ lte: value }),
    desc: "desc",
  },
}));

jest.mock("@/services/user-data-access", () => ({
  queryOwned: (...args: unknown[]): unknown => mockQueryOwned(...args),
}));

jest.mock("../../hooks/useCurrentUserId", () => ({
  useCurrentUserId: (): unknown => mockUseCurrentUserId(),
}));

jest.mock("@monyvi/logic", () => ({
  getMonthBoundaries: () => ({ startDate: 1, endDate: 2 }),
}));

import {
  useMonthlyTransactions,
  useRecentTransactions,
} from "../../hooks/useTransactions";

describe("useTransactions privacy scope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentUserId.mockReturnValue({
      userId: "user-1",
      isResolvingUser: false,
    });
    mockObserve.mockReturnValue({
      subscribe: mockSubscribe.mockReturnValue({ unsubscribe: jest.fn() }),
    });
    mockQueryOwned.mockReturnValue({ observe: mockObserve });
  });

  it("scopes recent transactions to the current authenticated user", () => {
    renderHook(() => useRecentTransactions(5));

    expect(mockQueryOwned).toHaveBeenCalledWith(
      expect.any(Object),
      "user-1",
      expect.objectContaining({ where: ["deleted", false] }),
      expect.objectContaining({ sortBy: ["date", "desc"] }),
      { take: 5 }
    );
  });

  it("scopes monthly transactions to the current authenticated user", () => {
    renderHook(() => useMonthlyTransactions(2026, 5));

    expect(mockQueryOwned).toHaveBeenCalledWith(
      expect.any(Object),
      "user-1",
      expect.objectContaining({ where: ["deleted", false] }),
      expect.objectContaining({ where: ["date", { gte: 1 }] }),
      expect.objectContaining({ where: ["date", { lte: 2 }] }),
      expect.objectContaining({ sortBy: ["date", "desc"] })
    );
  });
});
