import { fireEvent, render, screen } from "@testing-library/react-native";
import type { RecurringPayment } from "@monyvi/db";
import React from "react";

const mockSetStatusFilter = jest.fn();

interface MockRecurringPayment {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly currency: "EGP";
  readonly type: "EXPENSE" | "INCOME";
  readonly categoryId: string;
  readonly frequency: "MONTHLY" | "YEARLY";
  readonly nextDueDate: Date;
  readonly status: "ACTIVE" | "PAUSED" | "COMPLETED";
  readonly isIncome: boolean;
  readonly isExpense: boolean;
  readonly isOverdue: boolean;
  readonly isActive: boolean;
  readonly isCompleted: boolean;
}

interface MockRecurringPaymentsState {
  readonly allPayments: readonly RecurringPayment[];
  readonly filteredPayments: readonly RecurringPayment[];
  readonly counts: {
    readonly ACTIVE: number;
    readonly PAUSED: number;
    readonly COMPLETED: number;
  };
  readonly next7DaysTotal: number;
  readonly totalDueThisMonth: number;
  readonly isLoading: boolean;
  readonly statusFilter: "ACTIVE" | "PAUSED" | "COMPLETED";
  readonly setStatusFilter: jest.Mock;
}

const createPayment = (
  overrides: Partial<MockRecurringPayment>
): RecurringPayment => {
  const payment: MockRecurringPayment = {
    id: "payment-1",
    name: "Netflix",
    amount: 250,
    currency: "EGP",
    type: "EXPENSE",
    categoryId: "category-1",
    frequency: "MONTHLY",
    nextDueDate: new Date("2026-07-01T00:00:00.000Z"),
    status: "ACTIVE",
    isIncome: overrides.type === "INCOME",
    isExpense: overrides.type !== "INCOME",
    isOverdue: false,
    isActive: overrides.status !== "PAUSED" && overrides.status !== "COMPLETED",
    isCompleted: overrides.status === "COMPLETED",
    ...overrides,
  };

  return payment as unknown as RecurringPayment;
};

const netflix = createPayment({
  id: "payment-1",
  name: "Netflix",
  amount: 250,
  nextDueDate: new Date("2026-07-01T00:00:00.000Z"),
});

const rent = createPayment({
  id: "payment-2",
  name: "Rent",
  amount: 8200,
  nextDueDate: new Date("2026-07-03T00:00:00.000Z"),
});

let mockRecurringPaymentsState: MockRecurringPaymentsState = {
  allPayments: [netflix, rent],
  filteredPayments: [netflix, rent],
  counts: { ACTIVE: 2, PAUSED: 1, COMPLETED: 0 },
  next7DaysTotal: 250,
  totalDueThisMonth: 8450,
  isLoading: false,
  statusFilter: "ACTIVE",
  setStatusFilter: mockSetStatusFilter,
};

jest.mock("expo-router", () => ({
  __esModule: true,
  router: { push: jest.fn() },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { readonly bottom: number } => ({ bottom: 0 }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): {
    readonly t: (key: string, options?: { readonly value?: string }) => string;
  } => ({
    t: (key: string, options?: { readonly value?: string }): string =>
      options?.value ? `${key}: ${options.value}` : key,
  }),
}));

jest.mock("@/components/navigation/PageHeader", () => ({
  PageHeader: ({ title }: { readonly title: string }): React.JSX.Element => {
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <Text>{title}</Text>;
  },
}));

jest.mock("@/components/common/CategoryIcon", () => ({
  CategoryIcon: (): React.JSX.Element => {
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <Text>category-icon</Text>;
  },
}));

jest.mock("@/components/ui/EmptyStateCard", () => ({
  EmptyStateCard: ({
    title,
  }: {
    readonly title: string;
  }): React.JSX.Element => {
    const { Text } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <Text>{title}</Text>;
  },
}));

jest.mock("@/components/ui/Skeleton", () => ({
  Skeleton: ({ height }: { readonly height: number }): React.JSX.Element => {
    const { View } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <View testID={`skeleton-${height}`} />;
  },
}));

jest.mock("@/context/CategoriesContext", () => ({
  useCategoryLookup: (): ReadonlyMap<string, unknown> => new Map(),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: false } => ({ isDark: false }),
}));

jest.mock("@/hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): { readonly preferredCurrency: "EGP" } => ({
    preferredCurrency: "EGP",
  }),
}));

jest.mock("@/hooks/useRecurringPayments", () => ({
  useRecurringPayments: (): MockRecurringPaymentsState =>
    mockRecurringPaymentsState,
}));

jest.mock("@monyvi/logic", () => ({
  formatCurrency: ({
    amount,
    currency,
  }: {
    readonly amount: number;
    readonly currency: string;
  }): string => `${currency} ${amount.toLocaleString("en-US")}`,
}));

import RecurringPaymentsScreen from "@/app/(private)/recurring-payments";

interface MockExpoRouter {
  readonly router: {
    readonly push: jest.Mock;
  };
}

describe("RecurringPaymentsScreen dashboard", () => {
  beforeEach(() => {
    jest.requireMock<MockExpoRouter>("expo-router").router.push.mockClear();
    mockSetStatusFilter.mockClear();
    mockRecurringPaymentsState = {
      allPayments: [netflix, rent],
      filteredPayments: [netflix, rent],
      counts: { ACTIVE: 2, PAUSED: 1, COMPLETED: 0 },
      next7DaysTotal: 250,
      totalDueThisMonth: 8450,
      isLoading: false,
      statusFilter: "ACTIVE",
      setStatusFilter: mockSetStatusFilter,
    };
  });

  it("uses the themed app background on the dashboard root", () => {
    render(<RecurringPaymentsScreen />);

    expect(screen.getByTestId("recurring-payments-screen")).toHaveProp(
      "className",
      expect.stringContaining("bg-background dark:bg-background-dark")
    );
  });

  it("renders the Concept A summary, insight, explicit sort chip, and groups", () => {
    render(<RecurringPaymentsScreen />);

    expect(screen.getByText("due_this_month")).toBeTruthy();
    expect(screen.getByText("EGP 8,450")).toBeTruthy();
    expect(screen.getByText("next_7_days")).toBeTruthy();
    expect(screen.getByText("overdue")).toBeTruthy();
    expect(screen.getByText("renews_next")).toBeTruthy();
    expect(screen.getByText("upcoming")).toBeTruthy();
    expect(
      screen.getByTestId("recurring-payments-sort-chip")
    ).toHaveTextContent("sort_by: next_due");
    expect(screen.getByText("Jul 1")).toBeTruthy();
    expect(screen.getByText("Jul 3")).toBeTruthy();
  });

  it("opens a sort sheet that clearly labels sorting, not filtering", () => {
    render(<RecurringPaymentsScreen />);

    fireEvent.press(screen.getByTestId("recurring-payments-sort-chip"));

    expect(screen.getByText("sort_payments")).toBeTruthy();
    expect(screen.getByText("sort_payments_description")).toBeTruthy();
    expect(screen.getByText("highest_amount")).toBeTruthy();
    expect(screen.getByText("lowest_amount")).toBeTruthy();
    expect(screen.getByText("name_a_z")).toBeTruthy();
  });

  it("reorders payments when a sort option is selected", () => {
    render(<RecurringPaymentsScreen />);

    fireEvent.press(screen.getByTestId("recurring-payments-sort-chip"));
    fireEvent.press(
      screen.getByTestId("recurring-payments-sort-highest_amount")
    );

    const rows = screen.getAllByTestId("recurring-payment-row");
    expect(rows[0]).toHaveTextContent(/Rent/);
    expect(
      screen.getByTestId("recurring-payments-sort-chip")
    ).toHaveTextContent("sort_by: highest_amount");
  });

  it("keeps status tabs functional", () => {
    render(<RecurringPaymentsScreen />);

    fireEvent.press(screen.getByTestId("recurring-status-tab-PAUSED"));

    expect(mockSetStatusFilter).toHaveBeenCalledWith("PAUSED");
  });

  it("navigates to add and edit flows from dashboard actions", () => {
    render(<RecurringPaymentsScreen />);

    fireEvent.press(screen.getByTestId("recurring-payment-row-payment-1"));
    fireEvent.press(screen.getByTestId("recurring-payments-add-button"));

    const routerPush =
      jest.requireMock<MockExpoRouter>("expo-router").router.push;
    expect(routerPush).toHaveBeenCalledWith(
      "/edit-recurring-payment?id=payment-1"
    );
    expect(routerPush).toHaveBeenCalledWith("/create-recurring-payment");
  });

  it("renders skeleton blocks instead of a spinner while loading content", () => {
    mockRecurringPaymentsState = {
      ...mockRecurringPaymentsState,
      filteredPayments: [],
      isLoading: true,
    };

    render(<RecurringPaymentsScreen />);

    expect(screen.getByTestId("recurring-payments-loading")).toBeTruthy();
    expect(screen.queryByTestId("recurring-payments-spinner")).toBeNull();
    expect(screen.queryByText("no_status_payments")).toBeNull();
  });

  it("does not render overdue due text for completed payments", () => {
    const completedPayment = createPayment({
      id: "payment-completed",
      name: "Phone Installment",
      nextDueDate: new Date("2026-06-15T00:00:00.000Z"),
      status: "COMPLETED",
      isActive: false,
      isCompleted: true,
      isOverdue: true,
    });

    mockRecurringPaymentsState = {
      ...mockRecurringPaymentsState,
      allPayments: [completedPayment],
      filteredPayments: [completedPayment],
      counts: { ACTIVE: 0, PAUSED: 0, COMPLETED: 1 },
      statusFilter: "COMPLETED",
    };

    render(<RecurringPaymentsScreen />);

    expect(
      screen.getByTestId("recurring-payment-row-payment-completed")
    ).toHaveTextContent(/Jun 15/);
  });
});
