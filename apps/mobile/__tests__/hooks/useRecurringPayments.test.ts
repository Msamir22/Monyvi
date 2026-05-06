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
    sortBy: (...args: unknown[]) => ({ sortBy: args }),
    asc: "asc",
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
}));

import { useRecurringPayments } from "../../hooks/useRecurringPayments";

describe("useRecurringPayments privacy scope", () => {
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

  it("scopes recurring payment reads to the current authenticated user", () => {
    renderHook(() => useRecurringPayments());

    expect(mockQueryOwned).toHaveBeenCalledWith(
      expect.any(Object),
      "user-1",
      expect.objectContaining({ where: ["deleted", false] }),
      expect.objectContaining({ sortBy: ["next_due_date", "asc"] })
    );
  });
});
