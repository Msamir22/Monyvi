import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { InstitutionProviderSection } from "../../../components/add-account/InstitutionProviderSection";

const translations: Record<string, string> = {
  provider_details_section: "Provider Details",
  provider_details_help:
    "Choose the bank or wallet so SMS transactions can be matched to the right account.",
  provider_details_info: "Why provider details matter",
  institution_bank_label: "Bank",
  institution_wallet_label: "Wallet",
  institution_bank_help:
    "Choose the bank so SMS transactions can be matched to the right account.",
  institution_wallet_help:
    "Choose the wallet so SMS transactions can be matched to the right account.",
  institution_dropdown_accessibility: "Choose provider",
  institution_dropdown_close: "Close provider list",
  institution_dropdown_placeholder: "Choose a provider",
  provider_name: "Provider name",
  provider_name_placeholder_bank: "e.g., CIB, NBE, HSBC",
  provider_name_placeholder_wallet: "e.g., Vodafone Cash",
  institution_search_placeholder: "Search",
  institution_other: "Other",
  sms_sender_names: "SMS Sender Names",
  sms_sender_help:
    "The name shown as the SMS sender for this bank or wallet. This helps Monyvi match messages to this account.",
  sender_add_placeholder: "Add sender",
  sender_add_accessibility: "Add sender",
  sender_add_action: "Add",
  sender_duplicate_error: "This sender is already added",
  sender_unverified: "Unverified sender",
  why_provider_details_title: "Better SMS matching",
  why_provider_details_body:
    "Bank or wallet details help match SMS to this account.",
  got_it: "Got it",
};

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string => translations[key] ?? key,
  }),
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

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

describe("InstitutionProviderSection", () => {
  it("shows the bank picker for eligible bank accounts and forwards known provider selection", () => {
    const onSelectKnownInstitution = jest.fn();

    render(
      <InstitutionProviderSection
        accountType="BANK"
        isKnownProviderEligible={true}
        institutionId={null}
        providerDisplayName=""
        senderNames={[]}
        onSelectKnownInstitution={onSelectKnownInstitution}
        onSelectOtherInstitution={jest.fn()}
        onProviderDisplayNameChange={jest.fn()}
        onSenderNamesChange={jest.fn()}
      />
    );

    expect(screen.getByText("Bank")).toBeTruthy();
    expect(
      screen.getByText(
        "Choose the bank so SMS transactions can be matched to the right account."
      )
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Choose provider"));
    fireEvent.press(screen.getByText("CIB (Commercial International Bank)"));

    expect(onSelectKnownInstitution).toHaveBeenCalledWith("cib");
    expect(screen.queryByText("Vodafone Cash (Vodafone Cash)")).toBeNull();
  });

  it("shows the wallet picker for eligible wallet accounts", () => {
    render(
      <InstitutionProviderSection
        accountType="DIGITAL_WALLET"
        isKnownProviderEligible={true}
        institutionId={null}
        providerDisplayName=""
        senderNames={[]}
        onSelectKnownInstitution={jest.fn()}
        onSelectOtherInstitution={jest.fn()}
        onProviderDisplayNameChange={jest.fn()}
        onSenderNamesChange={jest.fn()}
      />
    );

    expect(screen.getByText("Wallet")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("Choose provider"));
    expect(screen.getByText("Vodafone Cash (Vodafone Cash)")).toBeTruthy();
    expect(
      screen.queryByText("CIB (Commercial International Bank)")
    ).toBeNull();
  });

  it("opens manual provider entry from Other with default sender chips", () => {
    const onSelectOtherInstitution = jest.fn();
    const onProviderDisplayNameChange = jest.fn();

    render(
      <InstitutionProviderSection
        accountType="BANK"
        isKnownProviderEligible={true}
        institutionId={null}
        providerDisplayName=""
        senderNames={[]}
        onSelectKnownInstitution={jest.fn()}
        onSelectOtherInstitution={onSelectOtherInstitution}
        onProviderDisplayNameChange={onProviderDisplayNameChange}
        onSenderNamesChange={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose provider"));
    fireEvent.press(screen.getByText("Other"));
    fireEvent.changeText(screen.getByLabelText("Provider name"), "My Bank");

    expect(onSelectOtherInstitution).toHaveBeenCalledTimes(1);
    expect(onProviderDisplayNameChange).toHaveBeenCalledWith("My Bank");
    expect(screen.getByPlaceholderText("Add sender")).toBeTruthy();
  });

  it("uses manual provider mode outside Egypt eligibility", () => {
    render(
      <InstitutionProviderSection
        accountType="DIGITAL_WALLET"
        isKnownProviderEligible={false}
        institutionId={null}
        providerDisplayName="Family wallet"
        senderNames={["FamilySMS"]}
        onSelectKnownInstitution={jest.fn()}
        onSelectOtherInstitution={jest.fn()}
        onProviderDisplayNameChange={jest.fn()}
        onSenderNamesChange={jest.fn()}
      />
    );

    expect(screen.queryByText("Vodafone Cash (Vodafone Cash)")).toBeNull();
    expect(screen.getByDisplayValue("Family wallet")).toBeTruthy();
    expect(screen.getByText("FamilySMS")).toBeTruthy();
  });

  it("opens and closes the provider details explanation sheet", () => {
    render(
      <InstitutionProviderSection
        accountType="BANK"
        isKnownProviderEligible={true}
        institutionId={null}
        providerDisplayName=""
        senderNames={[]}
        onSelectKnownInstitution={jest.fn()}
        onSelectOtherInstitution={jest.fn()}
        onProviderDisplayNameChange={jest.fn()}
        onSenderNamesChange={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Why provider details matter"));

    expect(screen.getByText("Better SMS matching")).toBeTruthy();

    fireEvent.press(screen.getByText("Got it"));

    expect(screen.queryByText("Better SMS matching")).toBeNull();
  });
});
