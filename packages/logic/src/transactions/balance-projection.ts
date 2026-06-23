export type EditableTransactionKind = "INCOME" | "EXPENSE" | "TRANSFER";

export interface EditedTransactionBalanceProjectionInput {
  readonly currentAccountBalance: number;
  readonly originalAmount: number;
  readonly originalType: "INCOME" | "EXPENSE";
  readonly originalAccountId: string;
  readonly editedAmount: number;
  readonly editedType: EditableTransactionKind;
  readonly editedAccountId: string;
}

export interface EditedTransactionBalanceProjection {
  readonly projectedBalance: number;
  readonly shouldWarn: boolean;
}

export function calculateEditedTransactionBalanceProjection(
  input: EditedTransactionBalanceProjectionInput
): EditedTransactionBalanceProjection {
  const projectedBalance =
    input.currentAccountBalance + calculateEditedTransactionBalanceDelta(input);

  return {
    projectedBalance,
    shouldWarn: projectedBalance < 0,
  };
}

function calculateEditedTransactionBalanceDelta(
  input: EditedTransactionBalanceProjectionInput
): number {
  const revertOriginal =
    input.originalAccountId === input.editedAccountId
      ? getReverseTransactionEffect(input.originalAmount, input.originalType)
      : 0;

  return (
    revertOriginal +
    getEditedTransactionEffect(input.editedAmount, input.editedType)
  );
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
