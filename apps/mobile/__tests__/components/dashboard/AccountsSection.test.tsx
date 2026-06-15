import { render, screen } from "@testing-library/react-native";
import type { Account } from "@monyvi/db";
import { processColor } from "react-native";

import { AccountsSection } from "../../../components/dashboard/AccountsSection";
import { palette } from "../../../constants/colors";
import { getEgyptianInstitutionAsset } from "../../../constants/egyptian-institution-assets";

let mockIsDark = false;

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
        dashboard_type_bank: "Bank",
        dashboard_type_cash: "Cash",
        dashboard_type_digital_wallet: "Wallet",
      })[key] ?? key,
  }),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: boolean } => ({
    isDark: mockIsDark,
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
  beforeEach(() => {
    mockIsDark = false;
  });

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

  it("uses a colored-card contrast surface only when the provider asks for it", () => {
    const institutionLogosByAccountId = new Map([
      ["account-1", getEgyptianInstitutionAsset("nbe", "bank").logo],
    ]);

    render(
      <AccountsSection
        accounts={[
          account({
            type: "BANK",
            institutionId: "nbe",
            providerDisplayName: "NBE",
          }),
        ]}
        isLoading={false}
        institutionLogosByAccountId={institutionLogosByAccountId}
      />
    );

    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-1")
    ).toHaveStyle({
      backgroundColor: palette.slate[25],
      borderColor: palette.slate[300],
    });
  });

  it.each([
    ["arab-international-bank", palette.gold[800], true],
    ["attijariwafa-bank-egypt", palette.gold[800], false],
    ["banque-du-caire", palette.orange[600], false],
  ] as const)(
    "renders %s with its curated dashboard card presentation",
    (institutionId, expectedAccentColor, expectsContrastSurface) => {
      const institutionLogosByAccountId = new Map([
        ["account-1", getEgyptianInstitutionAsset(institutionId, "bank").logo],
      ]);

      render(
        <AccountsSection
          accounts={[
            account({
              type: "BANK",
              institutionId,
              providerDisplayName: institutionId,
            }),
          ]}
          isLoading={false}
          institutionLogosByAccountId={institutionLogosByAccountId}
        />
      );

      if (expectsContrastSurface) {
        expect(
          screen.getByTestId("dashboard-account-provider-logo-account-1")
        ).toHaveStyle({
          backgroundColor: palette.slate[25],
          borderColor: palette.slate[300],
        });
      } else {
        expect(
          screen.getByTestId("dashboard-account-provider-logo-account-1")
        ).not.toHaveProp("style");
      }
      expect(screen.getByTestId("dashboard-account-card-account-1")).toHaveProp(
        "colors",
        expect.arrayContaining([
          processColor(expectedAccentColor),
          processColor(palette.slate[800]),
        ])
      );
    }
  );

  it("keeps dashboard fallback icons on a transparent surface", () => {
    render(
      <AccountsSection
        accounts={[account({ type: "BANK" })]}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("dashboard-account-card-account-1")).toBeTruthy();
    expect(
      screen.queryByTestId("dashboard-account-provider-logo-account-1")
    ).toBeNull();
  });

  it("uses the shared dashboard logo size for bank and wallet logos", () => {
    const institutionLogosByAccountId = new Map([
      [
        "account-1",
        getEgyptianInstitutionAsset("vodafone-cash", "wallet").logo,
      ],
      ["account-2", getEgyptianInstitutionAsset("qnb-egypt", "bank").logo],
      ["account-3", getEgyptianInstitutionAsset("e-and-cash", "wallet").logo],
    ]);

    render(
      <AccountsSection
        accounts={[
          account({}),
          account({
            id: "account-2",
            name: "QNB Current",
            type: "BANK",
            institutionId: "qnb-egypt",
            providerDisplayName: "QNB",
          }),
          account({
            id: "account-3",
            name: "e& money",
            institutionId: "e-and-cash",
            providerDisplayName: "e& money",
          }),
        ]}
        isLoading={false}
        institutionLogosByAccountId={institutionLogosByAccountId}
      />
    );

    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-1")
    ).toHaveProp("className", expect.stringContaining("h-9 w-12"));
    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-1")
    ).toHaveProp("className", expect.stringContaining("overflow-hidden"));
    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-1")
    ).toHaveStyle({
      backgroundColor: palette.slate[25],
      borderColor: palette.slate[300],
    });
    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-2")
    ).toHaveProp("className", expect.stringContaining("h-9 w-12"));
    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-2 image")
    ).toHaveProp("className", expect.stringContaining("h-8 w-11"));
    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-3")
    ).toHaveProp("className", expect.stringContaining("h-9 w-12"));
    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-3 image")
    ).toHaveProp("className", expect.stringContaining("h-9 w-9"));
  });

  it("uses wallet dashboard viewport presets based on logo shape", () => {
    const institutionLogosByAccountId = new Map([
      [
        "account-1",
        getEgyptianInstitutionAsset("vodafone-cash", "wallet").logo,
      ],
      ["account-2", getEgyptianInstitutionAsset("orange-cash", "wallet").logo],
      ["account-3", getEgyptianInstitutionAsset("we-pay", "wallet").logo],
    ]);

    render(
      <AccountsSection
        accounts={[
          account({ id: "account-1", name: "Vodafone wallet" }),
          account({ id: "account-2", name: "Orange wallet" }),
          account({ id: "account-3", name: "WE Pay" }),
        ]}
        isLoading={false}
        institutionLogosByAccountId={institutionLogosByAccountId}
      />
    );

    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-2")
    ).toHaveProp("className", expect.stringContaining("h-9 w-12"));
    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-2")
    ).toHaveStyle({
      backgroundColor: palette.slate[25],
      borderColor: palette.slate[300],
    });
    expect(
      screen.getByTestId("dashboard-account-provider-logo-account-3 image")
    ).toHaveProp("className", expect.stringContaining("h-9 w-9"));
  });

  it("uses curated compact app logos for replaced providers", () => {
    const replacedProviderIds = [
      "adcb-egypt",
      "adib-egypt",
      "arab-bank",
      "nbe",
      "standard-chartered",
    ] as const;

    for (const providerId of replacedProviderIds) {
      const logo = getEgyptianInstitutionAsset(providerId, "bank").logo;

      expect(logo.appSource).toBeTruthy();
    }
  });

  it("keeps fallback compact variants only for providers without curated logos", () => {
    const logo = getEgyptianInstitutionAsset(
      "credit-agricole-egypt",
      "bank"
    ).logo;

    expect(logo.format).toBe("svg");
    expect(logo.appSource).toBeTruthy();
  });

  it("renders every account in a free horizontal dashboard list", () => {
    render(
      <AccountsSection
        accounts={[
          account({ id: "account-1", name: "Wallet one" }),
          account({ id: "account-2", name: "Wallet two" }),
          account({ id: "account-3", name: "Wallet three" }),
          account({ id: "account-4", name: "Wallet four" }),
        ]}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("dashboard-accounts-scroll")).toBeTruthy();
    expect(screen.getByTestId("dashboard-accounts-scroll")).toHaveProp(
      "scrollEnabled",
      true
    );
    expect(
      screen.queryByTestId("dashboard-accounts-scroll-indicator")
    ).toBeNull();
    expect(
      screen.queryByTestId("dashboard-accounts-page-indicator")
    ).toBeNull();
    expect(screen.queryByTestId("dashboard-accounts-page-dot-0")).toBeNull();
    expect(screen.getByText("Wallet four")).toBeTruthy();
  });

  it("uses one compact treatment for dashboard type labels", () => {
    render(
      <AccountsSection
        accounts={[
          account({
            id: "account-1",
            name: "Wallet one",
            type: "DIGITAL_WALLET",
          }),
          account({
            id: "account-2",
            name: "Bank one",
            type: "BANK",
          }),
          account({
            id: "account-3",
            name: "Cash one",
            type: "CASH",
          }),
        ]}
        isLoading={false}
      />
    );

    for (const label of ["Wallet", "Bank", "Cash"]) {
      expect(screen.getByText(label)).not.toHaveProp("adjustsFontSizeToFit");
      expect(screen.getByText(label)).not.toHaveProp("minimumFontScale");
      expect(screen.getByText(label)).toHaveProp(
        "className",
        expect.stringContaining("text-[9px]")
      );
    }
  });

  it("does not show scroll cues when the dashboard has one page of accounts", () => {
    render(
      <AccountsSection
        accounts={[
          account({ id: "account-1", name: "Wallet one" }),
          account({ id: "account-2", name: "Wallet two" }),
          account({ id: "account-3", name: "Wallet three" }),
        ]}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("dashboard-accounts-scroll")).toHaveProp(
      "scrollEnabled",
      false
    );
    expect(
      screen.queryByTestId("dashboard-accounts-scroll-indicator")
    ).toBeNull();
    expect(
      screen.queryByTestId("dashboard-accounts-page-indicator")
    ).toBeNull();
  });

  it("keeps the horizontal account list free-scrolling without page dots", () => {
    render(
      <AccountsSection
        accounts={Array.from({ length: 7 }, (_, index) =>
          account({
            id: `account-${index + 1}`,
            name: `Wallet ${index + 1}`,
          })
        )}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("dashboard-accounts-scroll")).toHaveProp(
      "scrollEnabled",
      true
    );
    expect(
      screen.queryByTestId("dashboard-accounts-page-indicator")
    ).toBeNull();
    expect(screen.queryByTestId("dashboard-accounts-page-dot-0")).toBeNull();
  });

  it("uses the light-mode institution dominant color for dashboard card background and label", () => {
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

    expect(screen.getByTestId("dashboard-account-card-account-1")).toHaveProp(
      "colors",
      expect.arrayContaining([
        processColor(palette.red[600]),
        processColor(palette.slate[800]),
      ])
    );
    expect(screen.getByText("Wallet")).toHaveStyle({
      color: palette.red[600],
    });
  });

  it("uses the dark-mode institution accent for dashboard card background and label", () => {
    mockIsDark = true;
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

    expect(screen.getByTestId("dashboard-account-card-account-1")).toHaveProp(
      "colors",
      expect.arrayContaining([
        processColor(palette.red[500]),
        processColor(palette.slate[950]),
      ])
    );
    expect(screen.getByText("Wallet")).toHaveStyle({
      color: palette.red[500],
    });
  });
});
