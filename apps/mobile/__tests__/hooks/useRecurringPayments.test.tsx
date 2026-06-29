import { act, render, screen, waitFor } from "@testing-library/react-native";
import type { RecurringPayment } from "@monyvi/db";
import React from "react";
import { Text, View } from "react-native";

const mockDatabaseGet = jest.fn((tableName: string): string => tableName);
const mockQueryOwned = jest.fn();
const mockObserveWithColumns = jest.fn();
const mockUnsubscribe = jest.fn();

interface MockObserver<TRecord> {
  readonly next: (records: readonly TRecord[]) => void;
  readonly error: (error: unknown) => void;
}

let observer: MockObserver<RecurringPayment> | null = null;
let shouldEmitInitialPayments = true;

interface MockCurrentUserState {
  readonly userId: string | null;
  readonly isResolvingUser: boolean;
}

let mockCurrentUserState: MockCurrentUserState = {
  userId: "user-1",
  isResolvingUser: false,
};

interface MockRecurringPayment {
  readonly id: string;
  readonly userId: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  readonly type: "EXPENSE";
  readonly amount: number;
  readonly currency: "EGP";
  readonly nextDueDate: Date;
  readonly isActive: boolean;
  readonly isPaused: boolean;
  readonly isCompleted: boolean;
}

const payment: MockRecurringPayment = {
  id: "payment-1",
  userId: "user-1",
  status: "ACTIVE",
  type: "EXPENSE",
  amount: 250,
  currency: "EGP",
  nextDueDate: new Date("2026-07-01T00:00:00.000Z"),
  get isActive(): boolean {
    return this.status === "ACTIVE";
  },
  get isPaused(): boolean {
    return this.status === "PAUSED";
  },
  get isCompleted(): boolean {
    return this.status === "COMPLETED";
  },
};

const payments = [payment] as unknown as readonly RecurringPayment[];

jest.mock("@monyvi/db", () => ({
  database: {
    get: (tableName: string): string => mockDatabaseGet(tableName),
  },
}));

jest.mock("@/services/user-data-access", () => ({
  queryOwned: (...args: readonly unknown[]): unknown => mockQueryOwned(...args),
}));

jest.mock("@/hooks/useMarketRates", () => ({
  useMarketRates: (): { readonly latestRates: null } => ({ latestRates: null }),
}));

jest.mock("@/hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): { readonly preferredCurrency: "EGP" } => ({
    preferredCurrency: "EGP",
  }),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: (): MockCurrentUserState => mockCurrentUserState,
  runUserScopedEffect: ({
    userId,
    isResolvingUser,
    onResolving,
    onSignedOut,
    onAuthenticated,
  }: {
    readonly userId: string | null;
    readonly isResolvingUser: boolean;
    readonly onResolving: () => void;
    readonly onSignedOut: () => void;
    readonly onAuthenticated: (userId: string) => void | (() => void);
  }): void | (() => void) => {
    if (isResolvingUser) {
      onResolving();
      return;
    }

    if (!userId) {
      onSignedOut();
      return;
    }

    return onAuthenticated(userId);
  },
}));

import { useRecurringPayments } from "@/hooks/useRecurringPayments";

function RecurringPaymentsCountsProbe(): React.JSX.Element {
  const { counts } = useRecurringPayments();

  return (
    <View>
      <Text testID="active-count">{counts.ACTIVE}</Text>
      <Text testID="paused-count">{counts.PAUSED}</Text>
    </View>
  );
}

function RecurringPaymentsLoadingProbe(): React.JSX.Element {
  const { isLoading } = useRecurringPayments();

  return <Text testID="is-loading">{String(isLoading)}</Text>;
}

describe("useRecurringPayments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    observer = null;
    shouldEmitInitialPayments = true;
    mockCurrentUserState = {
      userId: "user-1",
      isResolvingUser: false,
    };
    payment.status = "ACTIVE";
    mockObserveWithColumns.mockReturnValue({
      subscribe: (
        nextObserver: MockObserver<RecurringPayment>
      ): { unsubscribe: jest.Mock } => {
        observer = nextObserver;
        if (shouldEmitInitialPayments) {
          nextObserver.next(payments);
        }
        return { unsubscribe: mockUnsubscribe };
      },
    });
    mockQueryOwned.mockReturnValue({
      observeWithColumns: mockObserveWithColumns,
    });
  });

  it("observes displayed payment fields so dashboard tabs and lists refresh after edits", async () => {
    render(<RecurringPaymentsCountsProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("active-count")).toHaveTextContent("1");
    });

    expect(mockObserveWithColumns).toHaveBeenCalledWith([
      "name",
      "amount",
      "currency",
      "type",
      "category_id",
      "frequency",
      "next_due_date",
      "status",
    ]);
  });

  it("returns loading after authentication starts until recurring payments emit", async () => {
    shouldEmitInitialPayments = false;
    mockCurrentUserState = {
      userId: null,
      isResolvingUser: false,
    };

    const { rerender } = render(<RecurringPaymentsLoadingProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    });

    mockCurrentUserState = {
      userId: "user-1",
      isResolvingUser: false,
    };

    rerender(<RecurringPaymentsLoadingProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
    });

    act(() => {
      observer?.next(payments);
    });

    await waitFor(() => {
      expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
    });
  });

  it("re-renders when Watermelon emits the same array after a payment status changes", async () => {
    render(<RecurringPaymentsCountsProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("active-count")).toHaveTextContent("1");
      expect(screen.getByTestId("paused-count")).toHaveTextContent("0");
    });

    payment.status = "PAUSED";
    act(() => {
      observer?.next(payments);
    });

    await waitFor(() => {
      expect(screen.getByTestId("active-count")).toHaveTextContent("0");
      expect(screen.getByTestId("paused-count")).toHaveTextContent("1");
    });
  });
});
