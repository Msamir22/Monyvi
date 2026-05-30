import { fireEvent, render, screen } from "@testing-library/react-native";
import { getSelectableEgyptianInstitutions } from "@monyvi/logic";

import { InstitutionPicker } from "../../../components/add-account/InstitutionPicker";

const translations: Record<string, string> = {
  institution_bank_dropdown_accessibility: "Choose bank",
  institution_bank_dropdown_close: "Close bank list",
  institution_bank_dropdown_placeholder: "Choose a bank",
  institution_wallet_dropdown_accessibility: "Choose wallet",
  institution_wallet_dropdown_close: "Close wallet list",
  institution_wallet_dropdown_placeholder: "Choose a wallet",
  institution_search_placeholder: "Search",
  institution_other: "Other",
  institution_bank_label: "Bank",
  institution_wallet_label: "Wallet",
};

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string => translations[key] ?? key,
  }),
}));

describe("InstitutionPicker", () => {
  it("shows only selectable banks with short-name-first labels", () => {
    render(
      <InstitutionPicker
        type="bank"
        selectedInstitutionId={null}
        onSelectInstitution={jest.fn()}
        onSelectOther={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose bank"));

    expect(screen.getByText("Bank")).toBeTruthy();
    expect(
      screen.getByText("ADCB (Abu Dhabi Commercial Bank Egypt)")
    ).toBeTruthy();
    fireEvent.changeText(screen.getByPlaceholderText("Search"), "CIB");
    expect(
      screen.getByText("CIB (Commercial International Bank)")
    ).toBeTruthy();
    expect(
      screen.getByTestId("CIB (Commercial International Bank) logo")
    ).toBeTruthy();
    expect(screen.queryByText("Vodafone Cash (Vodafone Cash)")).toBeNull();
  });

  it("shows only selectable wallets and supports Other", () => {
    const onSelectOther = jest.fn();

    render(
      <InstitutionPicker
        type="wallet"
        selectedInstitutionId={null}
        onSelectInstitution={jest.fn()}
        onSelectOther={onSelectOther}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose wallet"));

    expect(screen.getByText("Wallet")).toBeTruthy();
    expect(screen.getByText("Vodafone Cash (Vodafone Cash)")).toBeTruthy();
    expect(
      screen.getByTestId("Vodafone Cash (Vodafone Cash) logo")
    ).toBeTruthy();
    expect(screen.getByText("e& money (e& money)")).toBeTruthy();
    expect(
      screen.queryByText("CIB (Commercial International Bank)")
    ).toBeNull();

    fireEvent.press(screen.getByText("Other"));
    expect(onSelectOther).toHaveBeenCalledTimes(1);
  });

  it("filters providers by search text", () => {
    render(
      <InstitutionPicker
        type="bank"
        selectedInstitutionId={null}
        onSelectInstitution={jest.fn()}
        onSelectOther={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose bank"));
    fireEvent.changeText(screen.getByPlaceholderText("Search"), "standard");

    expect(
      screen.getByText("Standard Chartered (Standard Chartered Bank)")
    ).toBeTruthy();
    expect(
      screen.queryByText("CIB (Commercial International Bank)")
    ).toBeNull();
  });

  it("renders a logo for every selectable bank in the dropdown", () => {
    render(
      <InstitutionPicker
        type="bank"
        selectedInstitutionId={null}
        onSelectInstitution={jest.fn()}
        onSelectOther={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose bank"));

    for (const bank of getSelectableEgyptianInstitutions("bank")) {
      fireEvent.changeText(
        screen.getByPlaceholderText("Search"),
        bank.shortName
      );
      const label = `${bank.shortName} (${bank.fullName})`;

      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByTestId(`${label} logo`)).toBeTruthy();
    }
  });

  it("renders a logo for every selectable wallet in the dropdown", () => {
    render(
      <InstitutionPicker
        type="wallet"
        selectedInstitutionId={null}
        onSelectInstitution={jest.fn()}
        onSelectOther={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose wallet"));

    for (const wallet of getSelectableEgyptianInstitutions("wallet")) {
      fireEvent.changeText(
        screen.getByPlaceholderText("Search"),
        wallet.shortName
      );
      const label = `${wallet.shortName} (${wallet.fullName})`;

      expect(screen.getByText(label)).toBeTruthy();
      expect(screen.getByTestId(`${label} logo`)).toBeTruthy();
    }
  });

  it("filters providers by Arabic metadata in English UI", () => {
    render(
      <InstitutionPicker
        type="bank"
        selectedInstitutionId={null}
        onSelectInstitution={jest.fn()}
        onSelectOther={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose bank"));
    fireEvent.changeText(
      screen.getByPlaceholderText("Search"),
      "التجاري الدولي"
    );

    expect(
      screen.getByText("CIB (Commercial International Bank)")
    ).toBeTruthy();
    expect(screen.queryByText("NBE (National Bank of Egypt)")).toBeNull();
  });

  it("clears search text when switching provider type", () => {
    const { rerender } = render(
      <InstitutionPicker
        type="bank"
        selectedInstitutionId={null}
        onSelectInstitution={jest.fn()}
        onSelectOther={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose bank"));
    fireEvent.changeText(screen.getByPlaceholderText("Search"), "CIB");

    expect(
      screen.getByText("CIB (Commercial International Bank)")
    ).toBeTruthy();
    expect(screen.queryByText("Vodafone Cash (Vodafone Cash)")).toBeNull();

    rerender(
      <InstitutionPicker
        type="wallet"
        selectedInstitutionId={null}
        onSelectInstitution={jest.fn()}
        onSelectOther={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose wallet"));
    expect(screen.getByPlaceholderText("Search")).toHaveProp("value", "");
    expect(screen.getByText("Vodafone Cash (Vodafone Cash)")).toBeTruthy();
  });

  it("clears stale search text when reopening the dropdown", () => {
    render(
      <InstitutionPicker
        type="bank"
        selectedInstitutionId={null}
        onSelectInstitution={jest.fn()}
        onSelectOther={jest.fn()}
      />
    );

    fireEvent.press(screen.getByLabelText("Choose bank"));
    fireEvent.changeText(screen.getByPlaceholderText("Search"), "CIB");

    expect(
      screen.getByText("CIB (Commercial International Bank)")
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Close bank list"));
    fireEvent.press(screen.getByLabelText("Choose bank"));

    expect(screen.getByPlaceholderText("Search")).toHaveProp("value", "");
    expect(
      screen.getByText("ADCB (Abu Dhabi Commercial Bank Egypt)")
    ).toBeTruthy();
  });
});
