import { fireEvent, render, screen } from "@testing-library/react-native";

import { AccountTypeSelector } from "../../../components/add-account/AccountTypeSelector";
import { InstitutionPicker } from "../../../components/add-account/InstitutionPicker";
import { SmsMatchingSection } from "../../../components/add-account/SmsMatchingSection";

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: boolean } => ({ isDark: true }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): {
    top: number;
    right: number;
    bottom: number;
    left: number;
  } => ({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
}));

const translations: Record<string, string> = {
  account_type: "Account Type",
  selected: "selected",
  institution_bank_dropdown_accessibility: "Choose bank",
  institution_bank_dropdown_close: "Close bank list",
  institution_bank_dropdown_placeholder: "Choose a bank",
  institution_bank_label: "Bank",
  institution_other: "Other",
  institution_search_placeholder: "Search",
  sms_matching_help: "Match SMS messages to this account.",
  sms_matching_optional: "Message detection",
  type_bank: "Bank Account",
  type_cash: "Cash",
  type_digital_wallet: "Digital Wallet",
};

jest.mock("react-i18next", () => ({
  useTranslation: (): {
    readonly t: (key: string) => string;
    readonly i18n: { readonly language: string };
  } => ({
    t: (key: string): string => translations[key] ?? key,
    i18n: { language: "en" },
  }),
}));

describe("add account dark mode", () => {
  it("keeps account type labels readable in dark mode", () => {
    render(<AccountTypeSelector value="BANK" onChange={jest.fn()} />);

    expect(screen.getByText("Bank Account")).toHaveProp(
      "className",
      expect.stringContaining("dark:text-text-primary-dark")
    );
    expect(screen.getByText("Cash")).toHaveProp(
      "className",
      expect.stringContaining("dark:text-text-primary-dark")
    );
  });

  it("keeps message detection copy readable in dark mode", () => {
    render(
      <SmsMatchingSection
        accountType="BANK"
        institutionId={null}
        senderNames={[]}
        expanded={false}
        onToggleExpanded={jest.fn()}
        onSenderNamesChange={jest.fn()}
      />
    );

    expect(screen.getByText("Message detection")).toHaveProp(
      "className",
      expect.stringContaining("dark:text-text-primary-dark")
    );
    expect(screen.getByText("Match SMS messages to this account.")).toHaveProp(
      "className",
      expect.stringContaining("dark:text-text-secondary-dark")
    );
  });

  it("keeps the bank picker modal readable in dark mode", () => {
    render(
      <InstitutionPicker
        type="bank"
        selectedInstitutionId={null}
        onSelectInstitution={jest.fn()}
        onSelectOther={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose bank"));

    expect(screen.getByText("Bank")).toHaveProp(
      "className",
      expect.stringContaining("dark:text-text-primary-dark")
    );
    expect(screen.getByPlaceholderText("Search")).toHaveProp(
      "className",
      expect.stringContaining("dark:bg-slate-800")
    );
    expect(
      screen.getByText("ADCB (Abu Dhabi Commercial Bank Egypt)")
    ).toHaveProp(
      "className",
      expect.stringContaining("dark:text-text-primary-dark")
    );
    expect(screen.getByText("Other")).toHaveProp(
      "className",
      expect.stringContaining("dark:text-text-primary-dark")
    );
    expect(
      screen.getByTestId("ADCB (Abu Dhabi Commercial Bank Egypt) logo")
    ).toHaveProp("className", expect.stringContaining("bg-transparent"));
  });
});
