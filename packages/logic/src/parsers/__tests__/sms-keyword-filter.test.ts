import { isLikelyFinancialSms } from "../sms-keyword-filter";

describe("SMS keyword filter", () => {
  it("does not treat InstaPay as a generic financial keyword", () => {
    expect(isLikelyFinancialSms("InstaPay reference 12345")).toBe(false);
  });

  it("does not treat standalone IPN or InstaPay transfers as financial SMS", () => {
    expect(
      isLikelyFinancialSms(
        "IPN transfer sent with amount of EGP 1235.00 from 7660 on 03/12 at 08:43 PM. Ref# 2b7c9e0e."
      )
    ).toBe(false);
    expect(
      isLikelyFinancialSms(
        "InstaPay transfer sent with amount of EGP 1235.00 from 7660 on 03/12 at 08:43 PM. Ref# 2b7c9e0e."
      )
    ).toBe(false);
  });

  it("still detects ordinary financial messages with amounts and currency", () => {
    expect(
      isLikelyFinancialSms("Purchase EGP 120.50 from card ending 1234")
    ).toBe(true);
  });

  it("still detects bank messages that mention InstaPay transfer details", () => {
    expect(
      isLikelyFinancialSms(
        "Your account was debited by EGP 1235.00 for an InstaPay transfer. Balance EGP 5000.00"
      )
    ).toBe(true);
  });
});
