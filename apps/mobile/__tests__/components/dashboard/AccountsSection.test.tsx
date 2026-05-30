import { render, screen } from "@testing-library/react-native";
import type { Account } from "@monyvi/db";

import { AccountsSection } from "../../../components/dashboard/AccountsSection";
import { getEgyptianInstitutionAsset } from "../../../constants/egyptian-institution-assets";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string =>
      ({
        accounts: "Accounts",
        see_all: "See All",
        no_accounts_title: "No accounts",
        tap_to_add: "Tap to add",
      })[key] ?? key,
  }),
}));

function account(overrides: Partial<Account>): Account {
  const testAccount = {
    id: "account-1",
    name: "Main wallet",
    balance: 0,
    currency: "EGP",
    type: "DIGITAL_WALLET",
    institutionId: "vodafone-cash",
    providerDisplayName: "Vodafone Cash",
    ...overrides,
  };

  return testAccount as Account;
}

describe("AccountsSection", () => {
  it("renders known provider logos on dashboard account cards", () => {
    const institutionLogosByAccountId = new Map([
      [
        "account-1",
        getEgyptianInstitutionAsset("vodafone-cash", "wallet").logo,
      ],
    ]);

    render(
      <AccountsSection
        accounts={[account({})]}
        isLoading={false}
        institutionLogosByAccountId={institutionLogosByAccountId}
      />
    );

    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-1")
    ).toBeTruthy();
  });
});
