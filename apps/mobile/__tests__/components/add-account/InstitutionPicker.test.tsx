import { fireEvent, render, screen } from "@testing-library/react-native";

import { InstitutionPicker } from "../../../components/add-account/InstitutionPicker";

const translations: Record<string, string> = {
  institution_dropdown_accessibility: "Choose provider",
  institution_dropdown_close: "Close provider list",
  institution_dropdown_placeholder: "Choose a provider",
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

    fireEvent.press(screen.getByLabelText("Choose provider"));

    expect(screen.getByText("Bank")).toBeTruthy();
    expect(
      screen.getByText("CIB (Commercial International Bank)")
    ).toBeTruthy();
    expect(
      screen.getByTestId("CIB (Commercial International Bank) logo")
    ).toBeTruthy();
    expect(screen.getByText("NBE (National Bank of Egypt)")).toBeTruthy();
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

    fireEvent.press(screen.getByLabelText("Choose provider"));

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

    fireEvent.press(screen.getByLabelText("Choose provider"));
    fireEvent.changeText(screen.getByPlaceholderText("Search"), "standard");

    expect(
      screen.getByText("Standard Chartered (Standard Chartered Bank)")
    ).toBeTruthy();
    expect(
      screen.queryByText("CIB (Commercial International Bank)")
    ).toBeNull();
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

    fireEvent.press(screen.getByLabelText("Choose provider"));
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

    fireEvent.press(screen.getByLabelText("Choose provider"));
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

    fireEvent.press(screen.getByLabelText("Choose provider"));
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

    fireEvent.press(screen.getByLabelText("Choose provider"));
    fireEvent.changeText(screen.getByPlaceholderText("Search"), "CIB");

    expect(
      screen.getByText("CIB (Commercial International Bank)")
    ).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Close provider list"));
    fireEvent.press(screen.getByLabelText("Choose provider"));

    expect(screen.getByPlaceholderText("Search")).toHaveProp("value", "");
    expect(screen.getByText("NBE (National Bank of Egypt)")).toBeTruthy();
  });
});
