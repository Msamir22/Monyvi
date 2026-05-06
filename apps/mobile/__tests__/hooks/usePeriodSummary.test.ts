import { renderHook } from "@testing-library/react-native";

const mockObserve = jest.fn();
const mockSubscribe = jest.fn();
const mockQueryOwned = jest.fn<unknown, unknown[]>();
const mockUseCurrentUserId = jest.fn();

jest.mock("@monyvi/db", () => ({
  database: {
    get: jest.fn(() => ({})),
  },
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: (...args: unknown[]) => ({ where: args }),
    oneOf: (items: readonly string[]) => ({ oneOf: items }),
    gte: (value: unknown) => ({ gte: value }),
    lte: (value: unknown) => ({ lte: value }),
  },
}));

jest.mock("@/services/user-data-access", () => ({
  queryOwned: (...args: unknown[]): unknown => mockQueryOwned(...args),
}));

jest.mock("../../hooks/useCurrentUserId", () => ({
  useCurrentUserId: (): unknown => mockUseCurrentUserId(),
}));

jest.mock("../../hooks/useMarketRates", () => ({
  useMarketRates: () => ({ latestRates: {}, isLoading: false }),
}));

jest.mock("../../hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: () => ({ preferredCurrency: "EGP" }),
}));

jest.mock("@monyvi/logic", () => ({
  convertCurrency: (amount: number) => amount,
  getYearMonthBoundaries: () => ({ startDate: 1, endDate: 2 }),
}));

import { usePeriodSummary } from "../../hooks/usePeriodSummary";

describe("usePeriodSummary privacy scope", () => {
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

  it("scopes period aggregation transactions to the current authenticated user", () => {
    renderHook(() => usePeriodSummary("this_month", ["account-1"]));

    expect(mockQueryOwned).toHaveBeenCalledWith(
      expect.any(Object),
      "user-1",
      expect.objectContaining({ where: ["deleted", false] }),
      expect.objectContaining({ where: ["date", expect.any(Object)] }),
      expect.objectContaining({ where: ["date", expect.any(Object)] }),
      expect.objectContaining({
        where: ["account_id", { oneOf: ["account-1"] }],
      })
    );
  });
});
