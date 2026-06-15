import { parseNotification } from "../notification-parser";

describe("notification parser", () => {
  it("does not parse IPN or InstaPay transfer notifications", () => {
    expect(
      parseNotification(
        "IPN transfer sent with amount of EGP 1235.00 from 7660 on 03/12 at 08:43 PM. Ref# 2b7c9e0e."
      )
    ).toBeNull();
  });

  it("still parses debit card purchase notifications", () => {
    expect(
      parseNotification(
        "Your Debit Card **2132 had a Successful transaction of EGP 1824.00 @KAMONA,your available bal.EGP181869.22"
      )
    ).toEqual(
      expect.objectContaining({
        amount: 1824,
        cardLast4: "2132",
        currency: "EGP",
        type: "EXPENSE",
      })
    );
  });
});
