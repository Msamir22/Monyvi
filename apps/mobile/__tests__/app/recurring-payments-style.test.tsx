import { render, screen } from "@testing-library/react-native";
import React from "react";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
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

jest.mock("@/components/ui/EmptyStateCard", () => ({
  EmptyStateCard: (): null => null,
}));

jest.mock("@/context/CategoriesContext", () => ({
  useCategoryLookup: (): ReadonlyMap<string, unknown> => new Map(),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: true } => ({ isDark: true }),
}));

jest.mock("@/hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): { readonly preferredCurrency: "EGP" } => ({
    preferredCurrency: "EGP",
  }),
}));

jest.mock("@/hooks/useRecurringPayments", () => ({
  useRecurringPayments: (): {
    readonly filteredPayments: readonly [];
    readonly counts: {
      readonly ACTIVE: number;
      readonly PAUSED: number;
      readonly COMPLETED: number;
    };
    readonly next7DaysTotal: number;
    readonly totalDueThisMonth: number;
    readonly isLoading: boolean;
    readonly statusFilter: "ACTIVE";
    readonly setStatusFilter: jest.Mock;
  } => ({
    filteredPayments: [],
    counts: { ACTIVE: 0, PAUSED: 0, COMPLETED: 0 },
    next7DaysTotal: 0,
    totalDueThisMonth: 0,
    isLoading: true,
    statusFilter: "ACTIVE",
    setStatusFilter: jest.fn(),
  }),
}));

jest.mock("@monyvi/logic", () => ({
  formatCurrency: (): string => "EGP 0",
}));

import RecurringPaymentsScreen from "@/app/(private)/recurring-payments";

describe("RecurringPaymentsScreen dark theme styling", () => {
  it("uses the themed app background on the dashboard root", () => {
    render(<RecurringPaymentsScreen />);

    expect(screen.getByTestId("recurring-payments-screen")).toHaveProp(
      "className",
      expect.stringContaining("bg-background dark:bg-background-dark")
    );
  });
});
