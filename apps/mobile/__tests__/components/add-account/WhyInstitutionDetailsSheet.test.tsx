import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { WhyInstitutionDetailsSheet } from "../../../components/add-account/WhyInstitutionDetailsSheet";

const translations: Record<string, string> = {
  why_provider_details_title: "Message detection",
  why_provider_details_body: "Helps Monyvi detect SMS for this account.",
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

describe("WhyInstitutionDetailsSheet", () => {
  it("renders localized copy and dismisses without native Alert", () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    const onClose = jest.fn();

    render(<WhyInstitutionDetailsSheet visible={true} onClose={onClose} />);

    expect(screen.getByText("Message detection")).toBeTruthy();
    expect(
      screen.getByText("Helps Monyvi detect SMS for this account.")
    ).toBeTruthy();

    fireEvent.press(screen.getByText("Got it"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it("dismisses when the user taps outside the tooltip", () => {
    const onClose = jest.fn();

    render(<WhyInstitutionDetailsSheet visible={true} onClose={onClose} />);

    fireEvent.press(screen.getByTestId("provider-details-tooltip-backdrop"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
