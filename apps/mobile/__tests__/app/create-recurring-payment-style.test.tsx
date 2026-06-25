import { render, screen } from "@testing-library/react-native";
import React from "react";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { readonly bottom: number } => ({ bottom: 0 }),
}));

jest.mock("@react-native-community/datetimepicker", () => ({
  __esModule: true,
  default: (): null => null,
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): {
    readonly t: (key: string) => string;
  } => ({
    t: (key: string): string => key,
  }),
}));

jest.mock("@/components/modals/AccountSelectorModal", () => ({
  AccountSelectorModal: (): null => null,
}));

jest.mock("@/components/modals/CategorySelectorModal", () => ({
  CategorySelectorModal: (): null => null,
}));

jest.mock("@/components/modals/FrequencyPickerModal", () => ({
  FrequencyPickerModal: (): null => null,
  getFrequencyLabel: (): string => "Monthly",
}));

jest.mock("@/components/navigation/PageHeader", () => ({
  PageHeader: (): null => null,
}));

jest.mock("@/components/ui/StarryBackground", () => ({
  StarryBackground: ({
    children,
  }: {
    readonly children?: React.ReactNode;
  }): React.JSX.Element => {
    const ReactNative =
      jest.requireActual<typeof import("react-native")>("react-native");

    return (
      <ReactNative.View testID="starry-background">{children}</ReactNative.View>
    );
  },
}));

jest.mock("@/components/ui/TextField", () => ({
  TextField: (): null => null,
}));

jest.mock("@/components/ui/Toast", () => ({
  useToast: (): { readonly showToast: jest.Mock } => ({ showToast: jest.fn() }),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: true } => ({ isDark: true }),
}));

jest.mock("@/hooks/useAccounts", () => ({
  useAccounts: (): {
    readonly accounts: ReadonlyArray<{
      readonly id: string;
      readonly name: string;
      readonly currency: "EGP";
    }>;
  } => ({
    accounts: [{ id: "account-1", name: "Cash", currency: "EGP" }],
  }),
}));

jest.mock("@/hooks/useCategories", () => ({
  useCategories: (): {
    readonly expenseCategories: readonly [];
    readonly incomeCategories: readonly [];
  } => ({
    expenseCategories: [],
    incomeCategories: [],
  }),
}));

jest.mock("@/services/recurring-payment-service", () => ({
  createRecurringPayment: jest.fn(),
}));

jest.mock("@/utils/financial-display", () => ({
  formatAccountBalance: (): string => "EGP 0",
}));

import CreateRecurringPaymentScreen from "@/app/(private)/create-recurring-payment";

describe("CreateRecurringPaymentScreen dark theme styling", () => {
  it("uses the normal app background instead of the starry background", () => {
    render(<CreateRecurringPaymentScreen />);

    expect(screen.queryByTestId("starry-background")).toBeNull();
    expect(screen.getByTestId("create-recurring-payment-screen")).toHaveProp(
      "className",
      expect.stringContaining("bg-background dark:bg-background-dark")
    );
  });
});
