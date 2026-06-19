jest.mock("@monyvi/db", () => ({
  database: {},
}));

jest.mock("@/services/user-data-access", () => ({
  queryChildrenOfOwnedParent: jest.fn(),
}));

import { normalizeAccountSmsSender } from "@/services/account-sms-sender-service";

describe("normalizeAccountSmsSender", () => {
  it("collapses cosmetic whitespace before comparing sender aliases", () => {
    expect(normalizeAccountSmsSender("  CIB   Bank\tAlerts  ")).toBe(
      "cib bank alerts"
    );
  });
});
