import { render, screen } from "@testing-library/react-native";
import React from "react";

let mockSearchParams: { readonly id?: string } = {};
let mockEditableBudgetResult: {
  readonly budget: Record<string, unknown> | undefined;
  readonly isLoading: boolean;
  readonly loadErrorKey: "budget_not_found" | "load_budget_error" | null;
};
let mockBudgetDetailResult: {
  readonly budget: Record<string, unknown> | null;
  readonly metrics: Record<string, unknown> | null;
  readonly daysLeft: number;
  readonly weeklySpending: readonly [];
  readonly subcategoryBreakdown: readonly [];
  readonly recentTransactions: readonly [];
  readonly isLoading: boolean;
};

const mockView = (testID: string): React.JSX.Element => {
  const ReactNative =
    jest.requireActual<typeof import("react-native")>("react-native");

  return <ReactNative.View testID={testID} />;
};

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: (): { readonly id?: string } => mockSearchParams,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { readonly bottom: number } => ({ bottom: 0 }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string => key,
  }),
}));

jest.mock("@/components/navigation/PageHeader", () => ({
  PageHeader: (): null => null,
}));

jest.mock("@/components/budget/BudgetDashboard", () => ({
  BudgetDashboard: (): React.JSX.Element => mockView("budget-dashboard"),
}));

jest.mock("@/components/budget/BudgetForm", () => ({
  BudgetForm: (): React.JSX.Element => mockView("budget-form"),
}));

jest.mock("@/components/budget/BudgetDetailOverview", () => ({
  BudgetDetailOverview: (): React.JSX.Element =>
    mockView("budget-detail-overview"),
}));

jest.mock("@/components/budget/BudgetSpendingTrendChart", () => ({
  BudgetSpendingTrendChart: (): React.JSX.Element =>
    mockView("budget-spending-trend-chart"),
}));

jest.mock("@/components/budget/SubcategoryBreakdown", () => ({
  SubcategoryBreakdown: (): React.JSX.Element =>
    mockView("subcategory-breakdown"),
}));

jest.mock("@/components/budget/BudgetRecentTransactions", () => ({
  BudgetRecentTransactions: (): React.JSX.Element =>
    mockView("budget-recent-transactions"),
}));

jest.mock("@/components/budget/BudgetActionsSheet", () => ({
  BudgetActionsSheet: (): null => null,
}));

jest.mock("@/components/ui/Toast", () => ({
  useToast: (): { readonly showToast: jest.Mock } => ({ showToast: jest.fn() }),
}));

jest.mock("@/hooks/useEditableBudget", () => ({
  useEditableBudget: (): typeof mockEditableBudgetResult =>
    mockEditableBudgetResult,
}));

jest.mock("@/hooks/useBudgetDetail", () => ({
  useBudgetDetail: (): typeof mockBudgetDetailResult => mockBudgetDetailResult,
}));

jest.mock("@/hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): { readonly preferredCurrency: "EGP" } => ({
    preferredCurrency: "EGP",
  }),
}));

jest.mock("@/services/budget-service", () => ({
  deleteBudget: jest.fn(),
  pauseBudget: jest.fn(),
  resumeBudget: jest.fn(),
}));

import BudgetDetailScreen from "@/app/(private)/budget-detail";
import BudgetsScreen from "@/app/(private)/budgets";
import CreateBudgetScreen from "@/app/(private)/create-budget";

describe("Budget screen dark theme styling", () => {
  beforeEach(() => {
    mockSearchParams = {};
    mockEditableBudgetResult = {
      budget: undefined,
      isLoading: false,
      loadErrorKey: null,
    };
    mockBudgetDetailResult = {
      budget: {
        id: "budget-1",
        name: "Food",
        amount: 1000,
        currency: "EGP",
        isPaused: false,
        isCategoryBudget: false,
      },
      metrics: { remaining: 500 },
      daysLeft: 10,
      weeklySpending: [],
      subcategoryBreakdown: [],
      recentTransactions: [],
      isLoading: false,
    };
  });

  it("uses the themed app background on the budgets dashboard root", () => {
    render(<BudgetsScreen />);

    expect(screen.getByTestId("budgets-screen")).toHaveProp(
      "className",
      expect.stringContaining("bg-background dark:bg-background-dark")
    );
  });

  it("uses the themed app background on the create budget root", () => {
    render(<CreateBudgetScreen />);

    expect(screen.getByTestId("create-budget-screen")).toHaveProp(
      "className",
      expect.stringContaining("bg-background dark:bg-background-dark")
    );
  });

  it("uses the themed app background on the budget detail root", () => {
    mockSearchParams = { id: "budget-1" };

    render(<BudgetDetailScreen />);

    expect(screen.getByTestId("budget-detail-screen")).toHaveProp(
      "className",
      expect.stringContaining("bg-background dark:bg-background-dark")
    );
  });
});
