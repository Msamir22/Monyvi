import { render, screen } from "@testing-library/react-native";
import type { Account, MarketRate } from "@monyvi/db";

import { AccountCard } from "../../../components/accounts/AccountCard";
import { getEgyptianInstitutionAsset } from "../../../constants/egyptian-institution-assets";

let mockIsDark = false;

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

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: boolean } => ({
    isDark: mockIsDark,
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
  beforeEach(() => {
    mockIsDark = false;
  });

  it("renders manual bank provider display with the default bank logo path", () => {
    render(
      <AccountCard
        account={account({ providerDisplayName: "My Bank" })}
        latestRates={null as MarketRate | null}
        providerLabel="My Bank"
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
        providerLabel="Family Wallet"
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
        providerLabel="e& money (e& money)"
      />
    );

    expect(screen.getByText("e& money (e& money)")).toBeTruthy();
  });

  it("does not add unnecessary light-mode logo surfaces in account list cards", () => {
    render(
      <AccountCard
        account={account({
          id: "qnb-account",
          institutionId: "qnb-egypt",
          providerDisplayName: "QNB",
        })}
        latestRates={null as MarketRate | null}
        providerLabel="QNB"
        institutionLogo={getEgyptianInstitutionAsset("qnb-egypt", "bank").logo}
      />
    );

    expect(screen.getByTestId("account-provider-logo-qnb-account")).toHaveProp(
      "className",
      expect.stringContaining("bg-transparent")
    );
    expect(
      screen.getByTestId("account-provider-logo-qnb-account")
    ).not.toHaveProp("style");
  });

  it("uses the shared account list logo size for horizontal logos", () => {
    render(
      <AccountCard
        account={account({
          id: "nbe-account",
          institutionId: "nbe",
          providerDisplayName: "NBE",
        })}
        latestRates={null as MarketRate | null}
        providerLabel="NBE"
        institutionLogo={getEgyptianInstitutionAsset("nbe", "bank").logo}
      />
    );

    expect(screen.getByTestId("account-provider-logo-nbe-account")).toHaveProp(
      "className",
      expect.stringContaining("h-12 w-16")
    );
    expect(
      screen.getByTestId("account-provider-logo-nbe-account")
    ).not.toHaveProp("style");
  });

  it("uses the shared account list logo size for Vodafone Cash logos", () => {
    render(
      <AccountCard
        account={account({
          id: "vodafone-account",
          type: "DIGITAL_WALLET",
          institutionId: "vodafone-cash",
          providerDisplayName: "Vodafone Cash",
        })}
        latestRates={null as MarketRate | null}
        providerLabel="Vodafone Cash"
        institutionLogo={
          getEgyptianInstitutionAsset("vodafone-cash", "wallet").logo
        }
      />
    );

    expect(
      screen.getByTestId("account-provider-logo-vodafone-account")
    ).toHaveProp("className", expect.stringContaining("h-12 w-16"));
    expect(
      screen.getByTestId("account-provider-logo-vodafone-account")
    ).not.toHaveProp("style");
  });
});
