import { calculateEditedTransactionBalanceProjection } from "../balance-projection";

describe("calculateEditedTransactionBalanceProjection", () => {
  it("subtracts only the additional expense amount for same-account expense edits", () => {
    const projection = calculateEditedTransactionBalanceProjection({
      currentAccountBalance: 100,
      originalAmount: 500,
      originalType: "EXPENSE",
      originalAccountId: "account-1",
      editedAmount: 600,
      editedType: "EXPENSE",
      editedAccountId: "account-1",
    });

    expect(projection).toEqual({
      projectedBalance: 0,
      shouldWarn: false,
    });
  });

  it("uses the full edited expense when the transaction moves to another account", () => {
    const projection = calculateEditedTransactionBalanceProjection({
      currentAccountBalance: 100,
      originalAmount: 500,
      originalType: "EXPENSE",
      originalAccountId: "account-1",
      editedAmount: 600,
      editedType: "EXPENSE",
      editedAccountId: "account-2",
    });

    expect(projection).toEqual({
      projectedBalance: -500,
      shouldWarn: true,
    });
  });

  it("reverts the old income before applying a smaller edited income", () => {
    const projection = calculateEditedTransactionBalanceProjection({
      currentAccountBalance: 200,
      originalAmount: 500,
      originalType: "INCOME",
      originalAccountId: "account-1",
      editedAmount: 100,
      editedType: "INCOME",
      editedAccountId: "account-1",
    });

    expect(projection).toEqual({
      projectedBalance: -200,
      shouldWarn: true,
    });
  });

  it("reverts the original expense before applying transfer debit from the same account", () => {
    const projection = calculateEditedTransactionBalanceProjection({
      currentAccountBalance: 50,
      originalAmount: 500,
      originalType: "EXPENSE",
      originalAccountId: "account-1",
      editedAmount: 600,
      editedType: "TRANSFER",
      editedAccountId: "account-1",
    });

    expect(projection).toEqual({
      projectedBalance: -50,
      shouldWarn: true,
    });
  });
});
