import { render, screen } from "@testing-library/react-native";
import React from "react";

import { AccountSelectorModal } from "@/components/modals/AccountSelectorModal";
import { CategorySelectorModal } from "@/components/modals/CategorySelectorModal";
import { FrequencyPickerModal } from "@/components/modals/FrequencyPickerModal";
import type { Account, Category } from "@monyvi/db";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { readonly bottom: number } => ({ bottom: 24 }),
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: false } => ({ isDark: false }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string => key,
  }),
}));

jest.mock("@/utils/account-display", () => ({
  buildAccountDisplayNames: (): Map<string, string> => new Map(),
}));

jest.mock("@/utils/financial-display", () => ({
  formatAccountBalance: (): string => "EGP 1,000",
}));

jest.mock("@/components/category-selector", () => ({
  Breadcrumb: (): null => null,
  CategoryListItem: (): null => null,
  CategorySearchBar: (): null => null,
}));

jest.mock("@/hooks/useCategoryChildren", () => ({
  useCategoryChildren: (): {
    readonly children: readonly Category[];
    readonly isLoading: false;
  } => ({
    children: [],
    isLoading: false,
  }),
}));

jest.mock("@/hooks/useCategoriesWithChildren", () => ({
  useCategoriesWithChildren: (): ReadonlySet<string> => new Set(),
}));

jest.mock("@/hooks/useCategoryNavigation", () => ({
  useCategoryNavigation: (): {
    readonly stack: readonly [];
    readonly currentLevel: { readonly category: null; readonly label: string };
    readonly depth: 0;
    readonly searchQuery: "";
    readonly direction: "forward";
    readonly drillInto: jest.Mock;
    readonly goBack: jest.Mock;
    readonly jumpToLevel: jest.Mock;
    readonly reset: jest.Mock;
    readonly setSearchQuery: jest.Mock;
  } => ({
    stack: [],
    currentLevel: { category: null, label: "All Categories" },
    depth: 0,
    searchQuery: "",
    direction: "forward",
    drillInto: jest.fn(),
    goBack: jest.fn(),
    jumpToLevel: jest.fn(),
    reset: jest.fn(),
    setSearchQuery: jest.fn(),
  }),
}));

const account = {
  id: "account-1",
  name: "Cash",
  type: "CASH",
  currency: "EGP",
};

describe("recurring payment selector safe areas", () => {
  it("pads the frequency picker above the native bottom bar", () => {
    render(
      <FrequencyPickerModal
        visible
        selectedFrequency="MONTHLY"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId("frequency-picker-sheet-content")).toHaveStyle({
      paddingBottom: 24,
    });
  });

  it("pads the account selector above the native bottom bar", () => {
    render(
      <AccountSelectorModal
        visible
        accounts={[account] as unknown as Account[]}
        selectedId="account-1"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId("account-selector-list-content")).toHaveStyle({
      paddingBottom: 64,
    });
  });

  it("pads the category selector above the native bottom bar", () => {
    render(
      <CategorySelectorModal
        visible
        rootCategories={[]}
        selectedId={null}
        type="EXPENSE"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getByTestId("category-selector-sheet")).toHaveStyle({
      paddingBottom: 24,
    });
  });
});
