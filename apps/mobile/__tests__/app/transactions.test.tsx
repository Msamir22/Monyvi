/**
 * Transactions tab layout tests.
 *
 * The custom bottom tab bar is absolutely positioned, so long transaction
 * lists must reserve bottom content padding or the final card can sit under
 * the tab bar.
 */

import { render, screen } from "@testing-library/react-native";
import React from "react";
import { TAB_BAR_HEIGHT } from "../../constants/ui";

interface TransactionsListNode {
  readonly props: {
    readonly contentContainerStyle?: {
      readonly paddingBottom?: number;
      readonly flexGrow?: number;
    };
  };
}

const SAFE_AREA_BOTTOM = 34;
const mockRouterPush = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: mockRouterPush },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { bottom: number } => ({ bottom: SAFE_AREA_BOTTOM }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { t: (key: string) => string } => ({
    t: (key: string): string => key,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: (): null => null,
}));

jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Error: "Error",
    Success: "Success",
  },
}));

jest.mock("@/components/modals/DeleteConfirmationModal", () => ({
  DeleteConfirmationModal: (): null => null,
}));

jest.mock("@/components/modals/PeriodFilterModal", () => ({
  PeriodFilterModal: (): null => null,
}));

jest.mock("@/components/modals/RecurringEditModal", () => ({
  RecurringEditModal: (): null => null,
}));

jest.mock("@/components/modals/TypeFilterModal", () => ({
  TypeFilterModal: (): null => null,
}));

jest.mock("@/components/navigation/PageHeader", () => ({
  PageHeader: (): null => null,
}));

jest.mock("@/components/transactions/GroupHeader", () => ({
  GroupHeader: (): null => null,
}));

jest.mock("@/components/transactions/QuickEditModal", () => ({
  QuickEditModal: (): null => null,
}));

jest.mock("@/components/transactions/TransactionCard", () => ({
  TransactionCard: (): null => null,
}));

jest.mock("@/components/transactions/TransactionFiltersBar", () => ({
  TransactionFiltersBar: (): null => null,
}));

jest.mock("@/components/transactions/TransferCard", () => ({
  TransferCard: (): null => null,
}));

jest.mock("@/components/ui/Button", () => ({
  Button: (): null => null,
}));

jest.mock("@/components/ui/Toast", () => ({
  useToast: (): { showToast: jest.Mock } => ({ showToast: jest.fn() }),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: false } => ({ isDark: false }),
}));

jest.mock("@/hooks/useHistoricalRates", () => ({
  computeEquivalentText: (): null => null,
  toDateKey: (): string => "2026-06-01",
  useHistoricalRates: (): { ratesByDate: Map<string, unknown> } => ({
    ratesByDate: new Map(),
  }),
}));

jest.mock("@/hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): { preferredCurrency: "EGP" } => ({
    preferredCurrency: "EGP",
  }),
}));

jest.mock("@/hooks/useTransactionsGrouping", () => ({
  useTransactionsGrouping: (): unknown => ({
    groupedData: [
      {
        title: "This Month",
        groupNetWorth: 1000,
        groupTotalIncome: 2000,
        groupTotalExpense: 1000,
        transactions: [
          {
            _type: "transaction",
            id: "tx-1",
            amount: 100,
            currency: "EGP",
            date: new Date("2026-06-01T00:00:00.000Z"),
            isExpense: true,
            isIncome: false,
            categoryId: "shopping",
            categoryName: "Shopping",
            categoryIconName: "cart",
            categoryIconLibrary: "Ionicons",
            accountName: "Cash",
            displayNetWorth: 1000,
          },
        ],
      },
    ],
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock("@/providers/SyncProvider", () => ({
  useSync: (): { sync: () => Promise<void> } => ({
    sync: (): Promise<void> => Promise.resolve(),
  }),
}));

jest.mock("@/services", () => ({
  updateTransaction: jest.fn(),
  updateTransfer: jest.fn(),
}));

jest.mock("@/services/transaction-service", () => ({
  batchDeleteDisplayTransactions: jest.fn(),
}));

jest.mock("@/utils/financial-display", () => ({
  formatSignedTransactionAmount: (): string => "-EGP 100",
}));

jest.mock("@/utils/logger", () => ({
  logger: { error: jest.fn() },
}));

// Import AFTER mocks
// eslint-disable-next-line import/first
import Transactions from "../../app/(private)/(tabs)/transactions";

describe("Transactions tab", () => {
  it("reserves bottom space so the last transaction scrolls above the tab bar", () => {
    render(<Transactions />);

    const list = screen.getByTestId(
      "transactions-list"
    ) as unknown as TransactionsListNode;
    const contentContainerStyle = list.props.contentContainerStyle;

    expect(contentContainerStyle?.flexGrow).toBe(1);
    expect(contentContainerStyle?.paddingBottom).toBeGreaterThanOrEqual(
      TAB_BAR_HEIGHT + SAFE_AREA_BOTTOM
    );
  });
});
