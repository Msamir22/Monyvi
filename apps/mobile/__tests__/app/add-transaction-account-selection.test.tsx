import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import React from "react";

interface MockAccount {
  readonly id: string;
  readonly name: string;
  readonly isDefault: boolean;
  readonly type: string;
  readonly balance: number;
  readonly currency: string;
}

let mockAccounts: readonly MockAccount[] = [];

const mockBack = jest.fn();
const mockPush = jest.fn();

const mockView = (testID: string): React.JSX.Element => {
  const ReactNative =
    jest.requireActual<typeof import("react-native")>("react-native");
  return <ReactNative.View testID={testID} />;
};

jest.mock("expo-router", () => ({
  useRouter: (): {
    readonly back: jest.Mock;
    readonly push: jest.Mock;
  } => ({ back: mockBack, push: mockPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { readonly bottom: number } => ({ bottom: 0 }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string => key,
  }),
}));

jest.mock("@/hooks/useAccounts", () => ({
  useAccounts: (): { readonly accounts: readonly MockAccount[] } => ({
    accounts: mockAccounts,
  }),
}));

jest.mock("@/hooks/useCategories", () => ({
  useCategories: (): {
    readonly expenseCategories: ReadonlyArray<Record<string, unknown>>;
    readonly incomeCategories: readonly [];
    readonly isLoading: false;
  } => ({
    expenseCategories: [
      {
        id: "cat-food",
        displayName: "Food",
        color: "#16a34a",
        icon: "restaurant-outline",
        iconLibrary: "ionicons",
      },
    ],
    incomeCategories: [],
    isLoading: false,
  }),
}));

jest.mock("@/hooks/useCategoryChildren", () => ({
  useCategoryChildren: (): { readonly children: readonly [] } => ({
    children: [],
  }),
}));

jest.mock("@/hooks/useMarketRates", () => ({
  useMarketRates: (): { readonly latestRates: null } => ({ latestRates: null }),
}));

jest.mock("@/hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): { readonly preferredCurrency: "EGP" } => ({
    preferredCurrency: "EGP",
  }),
}));

jest.mock("@/hooks/useBudgetAlert", () => ({
  useBudgetAlert: (): {
    readonly alert: null;
    readonly isVisible: false;
    readonly checkAfterTransaction: jest.Mock;
    readonly dismiss: jest.Mock;
    readonly viewBudget: jest.Mock;
  } => ({
    alert: null,
    isVisible: false,
    checkAfterTransaction: jest.fn(),
    dismiss: jest.fn(),
    viewBudget: jest.fn(),
  }),
}));

jest.mock("@/components/ui/Toast", () => ({
  useToast: (): { readonly showToast: jest.Mock } => ({ showToast: jest.fn() }),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: false } => ({ isDark: false }),
}));

jest.mock("@/context/CategoriesContext", () => ({
  useCategoryLookup: (): ReadonlyMap<string, Record<string, unknown>> =>
    new Map([
      [
        "cat-food",
        {
          id: "cat-food",
          displayName: "Food",
          color: "#16a34a",
          icon: "restaurant-outline",
          iconLibrary: "ionicons",
        },
      ],
    ]),
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

jest.mock("@/components/add-transaction/TypeTabs", () => ({
  TypeTabs: (): React.JSX.Element => mockView("type-tabs"),
}));

jest.mock("@/components/add-transaction/CategoryPicker", () => ({
  CategoryPicker: (): React.JSX.Element => mockView("category-picker"),
}));

jest.mock("@/components/add-transaction/OptionalSection", () => ({
  OptionalSection: (): React.JSX.Element => mockView("optional-section"),
}));

jest.mock("@/components/common/CategoryIcon", () => ({
  CategoryIcon: (): React.JSX.Element => mockView("category-icon"),
  IconLibrary: {},
}));

jest.mock("@/components/modals/AccountSelectorModal", () => ({
  AccountSelectorModal: (props: {
    readonly visible: boolean;
    readonly accounts: readonly MockAccount[];
    readonly onSelect: (id: string) => void;
    readonly onClose: () => void;
  }): React.JSX.Element | null => {
    const ReactNative =
      jest.requireActual<typeof import("react-native")>("react-native");
    const mockAccountsList = props.accounts;
    const mockOnSelect = props.onSelect;
    const mockOnClose = props.onClose;

    if (!props.visible) return null;
    return (
      <ReactNative.View>
        {mockAccountsList.map((account) => (
          <ReactNative.Pressable
            key={account.id}
            testID={`account-option-${account.id}`}
            onPress={() => {
              mockOnSelect(account.id);
              mockOnClose();
            }}
          >
            <ReactNative.Text>{account.name}</ReactNative.Text>
          </ReactNative.Pressable>
        ))}
      </ReactNative.View>
    );
  },
}));

jest.mock("@/components/modals/CategorySelectorModal", () => ({
  CategorySelectorModal: (): null => null,
}));

jest.mock("@/components/ui/EmptyStateCard", () => ({
  EmptyStateCard: (): React.JSX.Element => mockView("empty-state"),
}));

jest.mock("@/components/budget/BudgetAlertModal", () => ({
  BudgetAlertModal: (): null => null,
}));

jest.mock("@/services/recurring-payment-service", () => ({
  createRecurringPayment: jest.fn(),
}));

jest.mock("@/services/transaction-service", () => ({
  createTransaction: jest.fn(),
}));

jest.mock("@/services/transfer-service", () => ({
  createTransfer: jest.fn(),
}));

import AddTransaction from "@/app/(private)/add-transaction";

function account(id: string, name: string, isDefault: boolean): MockAccount {
  return {
    id,
    name,
    isDefault,
    type: "CASH",
    balance: 1000,
    currency: "EGP",
  };
}

describe("AddTransaction account selection", () => {
  beforeEach(() => {
    mockAccounts = [
      account("cash-1", "Cash", false),
      account("bank-1", "Bank", false),
    ];
    mockBack.mockClear();
    mockPush.mockClear();
  });

  it("selects a default account that appears after an initial no-default emission", async () => {
    const { rerender } = render(<AddTransaction />);

    expect(screen.getByText("select")).toBeTruthy();

    mockAccounts = [
      account("cash-1", "Cash", true),
      account("bank-1", "Bank", false),
    ];
    rerender(<AddTransaction />);

    await waitFor(() => expect(screen.getByText("Cash")).toBeTruthy());
  });

  it("keeps a manually selected account when a default arrives later", async () => {
    const { rerender } = render(<AddTransaction />);

    fireEvent.press(screen.getByText("select"));
    fireEvent.press(screen.getByTestId("account-option-bank-1"));

    await waitFor(() => expect(screen.getByText("Bank")).toBeTruthy());

    mockAccounts = [
      account("cash-1", "Cash", true),
      account("bank-1", "Bank", false),
    ];
    rerender(<AddTransaction />);

    await waitFor(() => expect(screen.getByText("Bank")).toBeTruthy());
  });
});
