import { render, screen } from "@testing-library/react-native";

import { AccountPreviewCard } from "../../../components/add-account/AccountPreviewCard";
import { palette } from "../../../constants/colors";
jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: boolean } => ({ isDark: false }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string =>
      ({
        account_preview: "New account",
        account_type_bank: "Bank Account",
      })[key] ?? key,
  }),
}));

describe("AccountPreviewCard", () => {
  it("uses colored-card contrast surfaces in the add/edit account preview", () => {
    render(
      <AccountPreviewCard
        accountType="BANK"
        accountName="QNB Savings"
        balance="3200"
        currency="EGP"
        institutionId="qnb-egypt"
        providerDisplayName="QNB"
      />
    );

    expect(screen.getByTestId("account-preview-institution-logo")).toHaveProp(
      "className",
      expect.stringContaining("bg-transparent")
    );
    expect(screen.getByTestId("account-preview-institution-logo")).toHaveStyle({
      backgroundColor: palette.slate[25],
      borderColor: palette.slate[300],
    });
  });

  it("keeps compact marks clean when the preview logo does not need a surface", () => {
    render(
      <AccountPreviewCard
        accountType="BANK"
        accountName="Attijariwafa"
        balance="3200"
        currency="EGP"
        institutionId="attijariwafa-bank-egypt"
        providerDisplayName="Attijariwafa"
      />
    );

    expect(
      screen.getByTestId("account-preview-institution-logo")
    ).not.toHaveProp("style");
  });
});
