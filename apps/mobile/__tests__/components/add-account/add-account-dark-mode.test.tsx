import { fireEvent, render, screen } from "@testing-library/react-native";

import { AccountTypeSelector } from "../../../components/add-account/AccountTypeSelector";
import {
  getInstitutionPickerLogoTestId,
  InstitutionPicker,
} from "../../../components/add-account/InstitutionPicker";
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
  sms_sender_custom_names: "Extra senders",
  sms_sender_manual_provider_help: "Add custom senders for this bank.",
  sms_sender_names: "Sender names",
  sender_add_accessibility: "Add sender",
  sender_add_action: "Add",
  sender_add_placeholder: "Add sender",
  sender_duplicate_error: "This sender is already added",
  sender_remove_accessibility: "Remove {{sender}}",
  sender_unverified: "Unverified sender",
  type_bank: "Bank Account",
  type_cash: "Cash",
  type_digital_wallet: "Digital Wallet",
};

jest.mock("react-i18next", () => ({
  useTranslation: (): {
    readonly t: (key: string, options?: Record<string, string>) => string;
    readonly i18n: { readonly language: string };
  } => ({
    t: (key: string, options?: Record<string, string>): string =>
      (translations[key] ?? key).replace("{{sender}}", options?.sender ?? ""),
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

  it("marks manual sender aliases as unverified", () => {
    render(
      <SmsMatchingSection
        accountType="BANK"
        institutionId={null}
        senderNames={["ManualBankSMS"]}
        expanded
        onToggleExpanded={jest.fn()}
        onSenderNamesChange={jest.fn()}
      />
    );

    expect(screen.getAllByText("Unverified sender").length).toBeGreaterThan(0);
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
      screen.getByTestId(getInstitutionPickerLogoTestId("bank", "adcb-egypt"))
    ).toHaveProp("className", expect.stringContaining("bg-transparent"));
  });
});
