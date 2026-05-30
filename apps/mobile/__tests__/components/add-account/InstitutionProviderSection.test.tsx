import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { InstitutionProviderSection } from "../../../components/add-account/InstitutionProviderSection";

const mockTooltip = jest.fn();

const translations: Record<string, string> = {
  provider_details_section: "Bank or Wallet",
  provider_details_help:
    "Choose the bank or wallet so SMS transactions can be matched to the right account.",
  provider_details_info: "Why this helps",
  institution_bank_label: "Bank",
  institution_wallet_label: "Wallet",
  institution_bank_help:
    "Choose the bank so SMS transactions can be matched to the right account.",
  institution_wallet_help:
    "Choose the wallet so SMS transactions can be matched to the right account.",
  institution_bank_dropdown_accessibility: "Choose bank",
  institution_bank_dropdown_close: "Close bank list",
  institution_bank_dropdown_placeholder: "Choose a bank",
  institution_wallet_dropdown_accessibility: "Choose wallet",
  institution_wallet_dropdown_close: "Close wallet list",
  institution_wallet_dropdown_placeholder: "Choose a wallet",
  manual_bank_name: "Bank name",
  manual_wallet_name: "Wallet name",
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

jest.mock("../../../components/ui/Tooltip", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    Tooltip: (props: Record<string, unknown>) => {
      mockTooltip(props);

      if (!props.visible) {
        return null;
      }

      return React.createElement(
        View,
        { testID: "institution-details-tooltip" },
        React.createElement(
          Text,
          { onPress: props.onDismiss as () => void },
          props.text as string
        )
      );
    },
  };
});

beforeEach(() => {
  mockTooltip.mockClear();
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
    fireEvent.press(screen.getByLabelText("Choose bank"));
    fireEvent.changeText(screen.getByPlaceholderText("Search"), "CIB");
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
    fireEvent.press(screen.getByLabelText("Choose wallet"));
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

    fireEvent.press(screen.getByLabelText("Choose bank"));
    fireEvent.press(screen.getByText("Other"));
    fireEvent.changeText(screen.getByLabelText("Bank name"), "My Bank");

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

  it("keeps manual provider input visible after the user clears it", () => {
    const props = {
      accountType: "BANK" as const,
      isKnownProviderEligible: true,
      institutionId: null,
      senderNames: [],
      onSelectKnownInstitution: jest.fn(),
      onSelectOtherInstitution: jest.fn(),
      onProviderDisplayNameChange: jest.fn(),
      onSenderNamesChange: jest.fn(),
    };

    const { rerender } = render(
      <InstitutionProviderSection
        {...props}
        providerDisplayName="Manual Bank"
      />
    );

    expect(screen.getByLabelText("Bank name")).toBeTruthy();

    rerender(<InstitutionProviderSection {...props} providerDisplayName="" />);

    expect(screen.getByLabelText("Bank name")).toBeTruthy();
  });

  it("opens and closes the bank details tooltip", () => {
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

    fireEvent.press(screen.getByLabelText("Why this helps"));

    expect(
      screen.getByText("Bank or wallet details help match SMS to this account.")
    ).toBeTruthy();
    expect(mockTooltip).toHaveBeenLastCalledWith(
      expect.objectContaining({
        arrowAlignment: "left",
        autoDismissMs: 0,
        position: "top",
      })
    );

    fireEvent.press(
      screen.getByText("Bank or wallet details help match SMS to this account.")
    );

    expect(
      screen.queryByText(
        "Bank or wallet details help match SMS to this account."
      )
    ).toBeNull();
  });

  it("closes the bank details tooltip when the user taps elsewhere", () => {
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

    fireEvent.press(screen.getByLabelText("Why this helps"));
    fireEvent(
      screen.getByTestId("institution-provider-section"),
      "startShouldSetResponderCapture"
    );

    expect(
      screen.queryByText(
        "Bank or wallet details help match SMS to this account."
      )
    ).toBeNull();
  });
});
