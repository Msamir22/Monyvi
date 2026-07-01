export type EditableTransactionKind = "INCOME" | "EXPENSE" | "TRANSFER";

export interface EditedTransactionAccountBalance {
  readonly accountId: string;
  readonly balance: number;
}

export interface EditedTransactionBalanceProjectionInput {
  readonly currentAccountBalances: readonly EditedTransactionAccountBalance[];
  readonly originalAmount: number;
  readonly originalType: "INCOME" | "EXPENSE";
  readonly originalAccountId: string;
  readonly editedAmount: number;
  readonly editedType: EditableTransactionKind;
  readonly editedAccountId: string;
}

export interface EditedTransactionAccountProjection {
  readonly accountId: string;
  readonly projectedBalance: number;
}

export interface EditedTransactionBalanceProjection {
  readonly affectedAccountProjections: readonly EditedTransactionAccountProjection[];
  readonly warningAccountProjection: EditedTransactionAccountProjection | null;
  readonly projectedBalance: number;
  readonly shouldWarn: boolean;
}

export function calculateEditedTransactionBalanceProjection(
  input: EditedTransactionBalanceProjectionInput
): EditedTransactionBalanceProjection {
  const balanceByAccountId = new Map(
    input.currentAccountBalances.map((account) => [
      account.accountId,
      account.balance,
    ])
  );
  const balanceDeltas = calculateEditedTransactionBalanceDeltas(input);
  const affectedAccountProjections = Array.from(balanceDeltas.entries()).flatMap(
    ([accountId, delta]): EditedTransactionAccountProjection[] => {
      const currentBalance = balanceByAccountId.get(accountId);
      if (currentBalance === undefined) {
        return [];
      }

      return [
        {
          accountId,
          projectedBalance: roundToCurrencyPrecision(currentBalance + delta),
        },
      ];
    }
  );
  const warningAccountProjection =
    affectedAccountProjections.find(
      (projection) => projection.projectedBalance < 0
    ) ?? null;
  const editedAccountProjection = affectedAccountProjections.find(
    (projection) => projection.accountId === input.editedAccountId
  );
  const projectedBalance =
    warningAccountProjection?.projectedBalance ??
    editedAccountProjection?.projectedBalance ??
    0;

  return {
    affectedAccountProjections,
    warningAccountProjection,
    projectedBalance,
    shouldWarn: warningAccountProjection !== null,
  };
}

function calculateEditedTransactionBalanceDeltas(
  input: EditedTransactionBalanceProjectionInput
): Map<string, number> {
  const deltas = new Map<string, number>();
  accumulateBalanceDelta(
    deltas,
    input.originalAccountId,
    getReverseTransactionEffect(input.originalAmount, input.originalType)
  );
  accumulateBalanceDelta(
    deltas,
    input.editedAccountId,
    getEditedTransactionEffect(input.editedAmount, input.editedType)
  );

  return deltas;
}

function getReverseTransactionEffect(
  amount: number,
  type: "INCOME" | "EXPENSE"
): number {
  return type === "EXPENSE" ? amount : -amount;
}

function getEditedTransactionEffect(
  amount: number,
  type: EditableTransactionKind
): number {
  return type === "INCOME" ? amount : -amount;
}

function accumulateBalanceDelta(
  deltas: Map<string, number>,
  accountId: string,
  delta: number
): void {
  deltas.set(accountId, (deltas.get(accountId) ?? 0) + delta);
}

function roundToCurrencyPrecision(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}
