import { isLikelyFinancialSms } from "../sms-keyword-filter";

describe("SMS keyword filter", () => {
  it("does not treat InstaPay as a generic financial keyword", () => {
    expect(isLikelyFinancialSms("InstaPay reference 12345")).toBe(false);
  });

  it("still detects ordinary financial messages with amounts and currency", () => {
    expect(
      isLikelyFinancialSms("Purchase EGP 120.50 from card ending 1234")
    ).toBe(true);
  });
});
