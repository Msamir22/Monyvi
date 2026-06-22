import { render, screen } from "@testing-library/react-native";
import React from "react";
import { ScrollView } from "react-native";

const mockBack = jest.fn();
const mockView = (testID: string): React.JSX.Element => {
  const ReactNative =
    jest.requireActual<typeof import("react-native")>("react-native");
  return <ReactNative.View testID={testID} />;
};

interface RenderedNodeWithClassName {
  readonly props: {
    readonly className?: string;
  };
}

jest.mock("expo-router", () => ({
  useLocalSearchParams: (): { readonly id: string } => ({ id: "transfer-1" }),
  useRouter: (): { readonly back: jest.Mock } => ({ back: mockBack }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { readonly bottom: number } => ({ bottom: 0 }),
}));

jest.mock("@/components/ui/Toast", () => ({
  useToast: (): { readonly showToast: jest.Mock } => ({ showToast: jest.fn() }),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: true } => ({ isDark: true }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string => key,
  }),
}));

jest.mock("@/hooks/useTransferById", () => ({
  useTransferById: (): {
    readonly transfer: Record<string, unknown>;
    readonly isLoading: false;
  } => ({
    transfer: {
      id: "transfer-1",
      amount: 100,
      convertedAmount: undefined,
      fromAccountId: "account-1",
      toAccountId: "account-2",
      notes: undefined,
      date: new Date("2026-05-01T12:00:00.000Z"),
    },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/useAccounts", () => ({
  useAccounts: (): {
    readonly accounts: ReadonlyArray<Record<string, unknown>>;
  } => ({
    accounts: [
      {
        id: "account-1",
        name: "Cash",
        type: "CASH",
        currency: "EGP",
      },
      {
        id: "account-2",
        name: "Wallet",
        type: "DIGITAL_WALLET",
        currency: "EGP",
      },
    ],
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

jest.mock("@/context/CategoriesContext", () => ({
  useCategoryLookup: (): ReadonlyMap<string, Record<string, unknown>> =>
    new Map(),
}));

jest.mock("@/components/navigation/PageHeader", () => ({
  PageHeader: (): React.JSX.Element => mockView("page-header"),
}));

jest.mock("@/components/add-transaction/AmountDisplay", () => ({
  AmountDisplay: (): React.JSX.Element => mockView("amount-display"),
}));

jest.mock("@/components/add-transaction/CalculatorKeypad", () => ({
  CalculatorKeypad: (): React.JSX.Element => mockView("calculator"),
}));

jest.mock("@/components/add-transaction/OptionalSection", () => ({
  OptionalSection: (): null => null,
}));

jest.mock("@/components/add-transaction/TypeTabs", () => ({
  TypeTabs: (): React.JSX.Element => mockView("type-tabs"),
}));

jest.mock("@/components/modals/AccountSelectorModal", () => ({
  AccountSelectorModal: (): null => null,
}));

jest.mock("@/components/modals/CategorySelectorModal", () => ({
  CategorySelectorModal: (): null => null,
}));

jest.mock("@/components/modals/ConfirmationModal", () => ({
  ConfirmationModal: (): null => null,
}));

jest.mock("@/services/transfer-service", () => ({
  convertTransferToTransaction: jest.fn(),
  deleteTransfer: jest.fn(),
  updateTransfer: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (): null => null,
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Error: "Error",
    Success: "Success",
    Warning: "Warning",
  },
}));

import EditTransfer from "@/app/(private)/edit-transfer";

describe("EditTransfer dark theme styling", () => {
  it("uses the themed app background on the transfer screen surfaces", async () => {
    const view = render(<EditTransfer />);

    await screen.findByTestId("edit-transfer-screen");

    expect(screen.getByTestId("edit-transfer-screen")).toHaveProp(
      "className",
      expect.stringContaining("bg-background dark:bg-background-dark")
    );

    const scrollView = view.UNSAFE_getByType(
      ScrollView
    ) as RenderedNodeWithClassName;

    expect(scrollView.props.className).toEqual(
      expect.stringContaining("bg-background dark:bg-background-dark")
    );
  });
});
