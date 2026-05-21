import React from "react";
import { render, waitFor } from "@testing-library/react-native";

const mockPauseExpiredCustomBudgets = jest.fn();
const mockRefresh = jest.fn();
const mockUseBudgets = jest.fn();
let mockIsFocused = true;

jest.mock("expo-router", () => {
  const ReactModule = jest.requireActual<typeof React>("react");

  return {
    router: { push: jest.fn() },
    useFocusEffect: (callback: () => void | (() => void)): void => {
      ReactModule.useEffect(() => callback(), [callback]);
    },
    useIsFocused: (): boolean => mockIsFocused,
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: (): { t: (key: string) => string } => ({
    t: (key: string): string => key,
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { bottom: number } => ({ bottom: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: function Ionicons(): React.JSX.Element {
    const { Text: MockText } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <MockText>icon</MockText>;
  },
}));

jest.mock("@/constants/colors", () => ({
  palette: {
    nileGreen: { 500: "#000000" },
    slate: { 400: "#000000", 500: "#000000" },
  },
}));

jest.mock("@/hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): { preferredCurrency: "EGP" } => ({
    preferredCurrency: "EGP",
  }),
}));

jest.mock("@/hooks/useBudgets", () => ({
  useBudgets: (): unknown => mockUseBudgets(),
}));

jest.mock("@/services/budget-service", () => ({
  pauseExpiredCustomBudgets: (): Promise<number> =>
    mockPauseExpiredCustomBudgets() as Promise<number>,
}));

jest.mock("@/utils/logger", () => ({
  logger: { error: jest.fn() },
}));

jest.mock("@monyvi/logic", () => ({
  formatCurrency: (amount: number): string => String(amount),
}));

jest.mock("@/components/budget/PeriodFilterChips", () => ({
  PeriodFilterChips: function PeriodFilterChips(): React.JSX.Element {
    const { Text: MockText } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <MockText>period-filter</MockText>;
  },
}));

jest.mock("@/components/budget/BudgetHeroCard", () => ({
  BudgetHeroCard: function BudgetHeroCard(): React.JSX.Element {
    const { Text: MockText } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <MockText>hero</MockText>;
  },
}));

jest.mock("@/components/budget/BudgetCategoryCard", () => ({
  BudgetCategoryCard: function BudgetCategoryCard(): React.JSX.Element {
    const { Text: MockText } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <MockText>category-card</MockText>;
  },
}));

jest.mock("@/components/budget/BudgetEmptyState", () => ({
  BudgetEmptyState: function BudgetEmptyState(): React.JSX.Element {
    const { Text: MockText } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <MockText>empty</MockText>;
  },
}));

import { BudgetDashboard } from "@/components/budget/BudgetDashboard";

function setBudgetState(autoPauseCheckKey: string): void {
  mockUseBudgets.mockReturnValue({
    globalBudget: undefined,
    categoryBudgets: [],
    isLoading: false,
    totalCount: 0,
    periodFilter: "ALL",
    setPeriodFilter: jest.fn(),
    budgets: [],
    refresh: mockRefresh,
    autoPauseCheckKey,
  });
}

describe("BudgetDashboard", () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    mockIsFocused = true;
    mockPauseExpiredCustomBudgets.mockResolvedValue(0);
    setBudgetState("initial");
  });

  it("re-runs budget auto-pause when relevant budget data changes while focused", async (): Promise<void> => {
    const { rerender } = render(<BudgetDashboard />);

    await waitFor(() => {
      expect(mockPauseExpiredCustomBudgets).toHaveBeenCalledTimes(1);
    });

    setBudgetState("expired-custom-budget-changed");
    rerender(<BudgetDashboard />);

    await waitFor(() => {
      expect(mockPauseExpiredCustomBudgets).toHaveBeenCalledTimes(2);
    });
  });
});
