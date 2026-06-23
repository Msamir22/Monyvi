import { render, screen } from "@testing-library/react-native";
import type { Account } from "@monyvi/db";

import { TransferFields } from "@/components/add-transaction/TransferFields";

jest.mock("@/components/modals/AccountSelectorModal", () => ({
  AccountSelectorModal: (): null => null,
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string =>
      ({
        from_label: "From",
        to_label: "To",
        select: "Select",
      })[key] ?? key,
  }),
}));

function account(id: string, name: string): Account {
  const value: Partial<Account> = {
    id,
    name,
    currency: "EGP",
  };
  return value as Account;
}

describe("TransferFields", () => {
  it("surfaces source and destination account validation errors", () => {
    render(
      <TransferFields
        accounts={[account("acc-1", "Cash"), account("acc-2", "Bank")]}
        fromAccountId={null}
        toAccountId={null}
        onSelectFrom={jest.fn()}
        onSelectTo={jest.fn()}
        amount="100"
        targetAmount=""
        onChangeTargetAmount={jest.fn()}
        fromAccountError="Source account is required"
        toAccountError="Destination account is required"
      />
    );

    expect(screen.getByText("Source account is required")).toBeTruthy();
    expect(screen.getByText("Destination account is required")).toBeTruthy();
  });
});
