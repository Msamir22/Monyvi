import { calculateEditedTransactionBalanceProjection } from "../balance-projection";

describe("calculateEditedTransactionBalanceProjection", () => {
  it("subtracts only the additional expense amount for same-account expense edits", () => {
    const projection = calculateEditedTransactionBalanceProjection({
      currentAccountBalances: [{ accountId: "account-1", balance: 100 }],
      originalAmount: 500,
      originalType: "EXPENSE",
      originalAccountId: "account-1",
      editedAmount: 600,
      editedType: "EXPENSE",
      editedAccountId: "account-1",
    });

    expect(projection).toEqual({
      affectedAccountProjections: [
        { accountId: "account-1", projectedBalance: 0 },
      ],
      warningAccountProjection: null,
      projectedBalance: 0,
      shouldWarn: false,
    });
  });

  it("uses the full edited expense when the transaction moves to another account", () => {
    const projection = calculateEditedTransactionBalanceProjection({
      currentAccountBalances: [
        { accountId: "account-1", balance: 0 },
        { accountId: "account-2", balance: 100 },
      ],
      originalAmount: 500,
      originalType: "EXPENSE",
      originalAccountId: "account-1",
      editedAmount: 600,
      editedType: "EXPENSE",
      editedAccountId: "account-2",
    });

    expect(projection).toEqual({
      affectedAccountProjections: [
        { accountId: "account-1", projectedBalance: 500 },
        { accountId: "account-2", projectedBalance: -500 },
      ],
      warningAccountProjection: {
        accountId: "account-2",
        projectedBalance: -500,
      },
      projectedBalance: -500,
      shouldWarn: true,
    });
  });

  it("reverts the old income before applying a smaller edited income", () => {
    const projection = calculateEditedTransactionBalanceProjection({
      currentAccountBalances: [{ accountId: "account-1", balance: 200 }],
      originalAmount: 500,
      originalType: "INCOME",
      originalAccountId: "account-1",
      editedAmount: 100,
      editedType: "INCOME",
      editedAccountId: "account-1",
    });

    expect(projection).toEqual({
      affectedAccountProjections: [
        { accountId: "account-1", projectedBalance: -200 },
      ],
      warningAccountProjection: {
        accountId: "account-1",
        projectedBalance: -200,
      },
      projectedBalance: -200,
      shouldWarn: true,
    });
  });

  it("checks the original account when an income moves to another account", () => {
    const projection = calculateEditedTransactionBalanceProjection({
      currentAccountBalances: [
        { accountId: "account-1", balance: 100 },
        { accountId: "account-2", balance: 1000 },
      ],
      originalAmount: 500,
      originalType: "INCOME",
      originalAccountId: "account-1",
      editedAmount: 600,
      editedType: "EXPENSE",
      editedAccountId: "account-2",
    });

    expect(projection).toEqual({
      affectedAccountProjections: [
        { accountId: "account-1", projectedBalance: -400 },
        { accountId: "account-2", projectedBalance: 400 },
      ],
      warningAccountProjection: {
        accountId: "account-1",
        projectedBalance: -400,
      },
      projectedBalance: -400,
      shouldWarn: true,
    });
  });

  it("matches transaction-to-transfer conversion when save uses the original source amount", () => {
    const projection = calculateEditedTransactionBalanceProjection({
      currentAccountBalances: [{ accountId: "account-1", balance: 50 }],
      originalAmount: 500,
      originalType: "EXPENSE",
      originalAccountId: "account-1",
      editedAmount: 500,
      editedType: "TRANSFER",
      editedAccountId: "account-1",
    });

    expect(projection).toEqual({
      affectedAccountProjections: [
        { accountId: "account-1", projectedBalance: 50 },
      ],
      warningAccountProjection: null,
      projectedBalance: 50,
      shouldWarn: false,
    });
  });

  it("rounds projected balances before checking the warning threshold", () => {
    const projection = calculateEditedTransactionBalanceProjection({
      currentAccountBalances: [{ accountId: "account-1", balance: 0.3 }],
      originalAmount: 0.6,
      originalType: "EXPENSE",
      originalAccountId: "account-1",
      editedAmount: 0.9,
      editedType: "EXPENSE",
      editedAccountId: "account-1",
    });

    expect(projection).toEqual({
      affectedAccountProjections: [
        { accountId: "account-1", projectedBalance: 0 },
      ],
      warningAccountProjection: null,
      projectedBalance: 0,
      shouldWarn: false,
    });
  });
});
