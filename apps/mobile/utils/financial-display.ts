import type { CurrencyType, TransactionType } from "@monyvi/db";
import { formatCurrency } from "@monyvi/logic";

interface AccountBalanceInput {
  readonly balance: number;
  readonly currency: CurrencyType;
}

interface TransactionAmountInput {
  readonly amount: number;
  readonly currency: CurrencyType;
  readonly type: TransactionType;
}

export function formatAccountBalance(account: AccountBalanceInput): string {
  return formatCurrency({
    amount: account.balance,
    currency: account.currency,
  });
}

export function formatSignedTransactionAmount(
  transaction: TransactionAmountInput
): string {
  const sign = transaction.type === "EXPENSE" ? "-" : "+";
  return `${sign}${formatCurrency({
    amount: transaction.amount,
    currency: transaction.currency,
  })}`;
}
