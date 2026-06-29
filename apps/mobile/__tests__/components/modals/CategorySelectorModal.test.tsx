import { render, screen } from "@testing-library/react-native";
import React from "react";

import { CategorySelectorModal } from "@/components/modals/CategorySelectorModal";
import type { Category } from "@monyvi/db";

const mockChildren = [
  mockCategory({
    id: "clothes",
    displayName: "Clothes",
    systemName: "clothes",
  }),
  mockCategory({
    id: "accessories",
    displayName: "Accessories",
    systemName: "accessories",
  }),
  mockCategory({
    id: "footwear",
    displayName: "Footwear",
    systemName: "footwear",
  }),
];

function mockCategory(overrides: Partial<Category>): Category {
  const model = {
    id: "category",
    color: "nileGreen",
    displayName: "Category",
    icon: "shirt",
    iconLibrary: "Ionicons",
    isHidden: false,
    isInternal: false,
    parentId: "shopping",
    systemName: "category",
    type: "EXPENSE",
    ...overrides,
  };

  return model as Category;
}

jest.mock("@/components/category-selector", () => ({
  Breadcrumb: (): null => null,
  CategoryListItem: ({
    category: item,
  }: {
    readonly category: Category;
  }): React.JSX.Element => {
    const ReactNative =
      jest.requireActual<typeof import("react-native")>("react-native");
    return <ReactNative.Text>{item.displayName}</ReactNative.Text>;
  },
  CategorySearchBar: (): null => null,
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { readonly isDark: false } => ({ isDark: false }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { readonly bottom: number } => ({ bottom: 24 }),
}));

jest.mock("@/hooks/useCategoryChildren", () => ({
  useCategoryChildren: (): {
    readonly children: readonly Category[];
    readonly isLoading: false;
  } => ({
    children: mockChildren,
    isLoading: false,
  }),
}));

jest.mock("@/hooks/useCategoriesWithChildren", () => ({
  useCategoriesWithChildren: (): ReadonlySet<string> => new Set(),
}));

jest.mock("@/hooks/useCategoryNavigation", () => ({
  useCategoryNavigation: (): {
    readonly stack: readonly [
      { readonly category: null; readonly label: "All Categories" },
      { readonly category: Category; readonly label: "Shopping" },
    ];
    readonly currentLevel: {
      readonly category: Category;
      readonly label: string;
    };
    readonly depth: 1;
    readonly searchQuery: "";
    readonly direction: "forward";
    readonly drillInto: jest.Mock;
    readonly goBack: jest.Mock;
    readonly jumpToLevel: jest.Mock;
    readonly reset: jest.Mock;
    readonly setSearchQuery: jest.Mock;
  } => ({
    stack: [
      { category: null, label: "All Categories" },
      {
        category: mockCategory({
          id: "shopping",
          displayName: "Shopping",
          parentId: undefined,
          systemName: "shopping",
        }),
        label: "Shopping",
      },
    ],
    currentLevel: {
      category: mockCategory({
        id: "shopping",
        displayName: "Shopping",
        parentId: undefined,
        systemName: "shopping",
      }),
      label: "Shopping",
    },
    depth: 1,
    searchQuery: "",
    direction: "forward",
    drillInto: jest.fn(),
    goBack: jest.fn(),
    jumpToLevel: jest.fn(),
    reset: jest.fn(),
    setSearchQuery: jest.fn(),
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { readonly t: (key: string) => string } => ({
    t: (key: string): string => key,
  }),
}));

describe("CategorySelectorModal", () => {
  it("renders unique child rows without clipped subviews in the animated modal list", () => {
    const view = render(
      <CategorySelectorModal
        visible
        rootCategories={[]}
        selectedId="unselected-category"
        type="EXPENSE"
        onSelect={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.getAllByText("Clothes")).toHaveLength(1);
    expect(screen.getAllByText("Accessories")).toHaveLength(1);
    expect(screen.getAllByText("Footwear")).toHaveLength(1);
    expect(
      view.UNSAFE_getByProps({ removeClippedSubviews: false })
    ).toBeTruthy();
  });
});
