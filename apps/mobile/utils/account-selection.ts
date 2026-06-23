interface SelectableAccount {
  readonly id: string;
  readonly isDefault: boolean;
}

interface InitialTransactionAccountSelection {
  readonly selectedAccountId: string | null;
  readonly toAccountId: string | null;
}

export function resolveInitialTransactionAccountSelection(
  accounts: readonly SelectableAccount[]
): InitialTransactionAccountSelection {
  const selectedAccount = accounts.find((account) => account.isDefault);
  if (!selectedAccount) {
    return { selectedAccountId: null, toAccountId: null };
  }

  const toAccount = accounts.find(
    (account) => account.id !== selectedAccount.id
  );

  return {
    selectedAccountId: selectedAccount.id,
    toAccountId: toAccount?.id ?? null,
  };
}
