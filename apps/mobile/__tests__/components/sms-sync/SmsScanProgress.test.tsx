import { render } from "@testing-library/react-native";
import React from "react";

jest.mock("@/hooks/useCategories", () => ({
  useCategories: (): never => {
    throw new Error("SmsScanProgress must not read category hooks directly");
  },
}));

jest.mock("@/context/ThemeContext", () => ({
  useTheme: (): { isDark: boolean } => ({ isDark: false }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): {
    t: (key: string, opts?: Record<string, unknown>) => string;
  } => ({
    t: (key: string, opts?: Record<string, unknown>): string => {
      const count =
        typeof opts?.count === "number" || typeof opts?.count === "string"
          ? opts.count
          : "";
      if (key === "review_transactions") return `Review ${count}`;
      if (key === "scanned_count") return `Scanned ${count}`;
      if (key === "duration_seconds") return `${count}s`;
      return key;
    },
  }),
}));

import { SmsScanProgress } from "@/components/sms-sync/SmsScanProgress";

describe("SmsScanProgress", () => {
  it("renders category display labels from props without category hooks", () => {
    const categoryNameMap = new Map<string, string>([
      ["food_drinks", "Food & Drinks"],
    ]);

    const { getByText } = render(
      <SmsScanProgress
        status="complete"
        progress={null}
        transactionsFound={3}
        totalScanned={20}
        durationMs={3000}
        topCategories={["food_drinks"]}
        categoryNameMap={categoryNameMap}
        error={null}
        onReviewPress={jest.fn()}
        onBackPress={jest.fn()}
        onRetryPress={jest.fn()}
      />
    );

    expect(getByText("Food & Drinks")).toBeTruthy();
  });
});
