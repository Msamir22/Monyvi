import type { CurrencyType, TransactionType } from "@monyvi/db";
import { formatCurrency } from "@monyvi/logic";

interface AccountBalanceInput {
  readonly balance: number;
  readonly currency: CurrencyType;
  readonly minimumFractionDigits?: number;
  readonly maximumFractionDigits?: number;
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
    minimumFractionDigits:
      account.minimumFractionDigits ?? account.maximumFractionDigits,
    maximumFractionDigits: account.maximumFractionDigits,
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
