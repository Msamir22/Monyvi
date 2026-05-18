jest.mock("@monyvi/db", () => ({
  database: { get: jest.fn() },
  Transaction: class Transaction {},
}));
jest.mock("@/hooks/useMarketRates", () => ({
  useMarketRates: () => ({ latestRates: null }),
}));
jest.mock("@/hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: () => ({ preferredCurrency: "EGP" }),
}));
jest.mock("@/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ userId: "user-1", isResolvingUser: false }),
}));
jest.mock("@/services/user-data-access", () => ({
  queryOwned: jest.fn(),
}));
jest.mock("@/utils/logger", () => ({
  logger: { error: jest.fn() },
}));

import { PERIOD_LABELS, getPeriodDateRange } from "@/hooks/usePeriodSummary";

describe("getPeriodDateRange", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-18T10:30:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("supports the dashboard 3M range from the first day two months ago through today", () => {
    const range = getPeriodDateRange("three_months");

    expect(range.startDate).toBe(new Date(2026, 2, 1).getTime());
    expect(range.endDate).toBe(
      new Date(2026, 4, 18, 23, 59, 59, 999).getTime()
    );
    expect(PERIOD_LABELS.three_months).toBe("3 Months");
  });
});
