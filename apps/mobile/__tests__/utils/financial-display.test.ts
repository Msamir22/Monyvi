import {
  formatAccountBalance,
  formatSignedTransactionAmount,
} from "@/utils/financial-display";

describe("financial display helpers", () => {
  it("formats an account balance without depending on DB model getters", () => {
    expect(
      formatAccountBalance({
        balance: 1234.5,
        currency: "EGP",
      })
    ).toBe("1,234.50 EGP");
  });

  it("formats expense transactions with a negative sign", () => {
    expect(
      formatSignedTransactionAmount({
        amount: 250,
        currency: "EGP",
        type: "EXPENSE",
      })
    ).toBe("-250 EGP");
  });

  it("formats income transactions with a positive sign", () => {
    expect(
      formatSignedTransactionAmount({
        amount: 250,
        currency: "USD",
        type: "INCOME",
      })
    ).toBe("+$250");
  });
});
