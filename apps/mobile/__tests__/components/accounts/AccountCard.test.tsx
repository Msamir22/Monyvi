import { render, screen } from "@testing-library/react-native";
import type { Account, MarketRate } from "@monyvi/db";

import { AccountCard } from "../../../components/accounts/AccountCard";

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string =>
      ({
        type_bank: "Bank Account",
        type_digital_wallet: "Digital Wallet",
        type_cash: "Cash",
        default_account_badge: "Default account",
      })[key] ?? key,
  }),
}));

function account(overrides: Partial<Account>): Account {
  const accountData = {
    id: "account-1",
    name: "Main",
    balance: 100,
    currency: "EGP",
    type: "BANK",
    isDefault: false,
    institutionId: undefined,
    providerDisplayName: undefined,
    ...overrides,
  };

  return accountData as Account;
}

describe("AccountCard", () => {
  it("renders manual bank provider display with the default bank logo path", () => {
    render(
      <AccountCard
        account={account({ providerDisplayName: "My Bank" })}
        latestRates={null as MarketRate | null}
      />
    );

    expect(screen.getByText("Main")).toBeTruthy();
    expect(screen.getByText("My Bank")).toBeTruthy();
  });

  it("renders manual wallet provider display with the default wallet logo path", () => {
    render(
      <AccountCard
        account={account({
          type: "DIGITAL_WALLET",
          providerDisplayName: "Family Wallet",
        })}
        latestRates={null as MarketRate | null}
      />
    );

    expect(screen.getByText("Main")).toBeTruthy();
    expect(screen.getByText("Family Wallet")).toBeTruthy();
  });

  it("renders current registry metadata for known providers", () => {
    render(
      <AccountCard
        account={account({
          institutionId: "e-and-cash",
          providerDisplayName: "e& Cash",
          type: "DIGITAL_WALLET",
        })}
        latestRates={null as MarketRate | null}
      />
    );

    expect(screen.getByText("e& money (e& money)")).toBeTruthy();
  });
});
