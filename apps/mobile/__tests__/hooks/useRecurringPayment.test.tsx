import { act, render, screen, waitFor } from "@testing-library/react-native";
import type { RecurringPayment } from "@monyvi/db";
import React from "react";
import { Text } from "react-native";

const mockDatabaseGet = jest.fn((tableName: string): string => tableName);
const mockObserveOwnedById = jest.fn();
const mockUnsubscribe = jest.fn();

interface MockObserver<TRecord> {
  readonly next: (record: TRecord | null) => void;
  readonly error: (error: unknown) => void;
}

let observer: MockObserver<RecurringPayment> | null = null;

const payment = {
  id: "payment-1",
  userId: "user-1",
  status: "ACTIVE",
  deleted: false,
} as unknown as RecurringPayment;
const secondPayment = {
  id: "payment-2",
  userId: "user-1",
  status: "PAUSED",
  deleted: false,
} as unknown as RecurringPayment;
let shouldEmitOnSubscribe = true;

jest.mock("@monyvi/db", () => ({
  database: {
    get: (tableName: string): string => mockDatabaseGet(tableName),
  },
}));

jest.mock("@/services/user-data-access", () => ({
  observeOwnedById: (...args: readonly unknown[]): unknown =>
    mockObserveOwnedById(...args),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

jest.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: (): { userId: string; isResolvingUser: boolean } => ({
    userId: "user-1",
    isResolvingUser: false,
  }),
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

import { useRecurringPayment } from "@/hooks/useRecurringPayment";

function RecurringPaymentStatusProbe(): React.JSX.Element {
  const { payment: observedPayment } = useRecurringPayment("payment-1");

  return (
    <Text testID="payment-status">{observedPayment?.status ?? "missing"}</Text>
  );
}

function RecurringPaymentIdProbe({
  paymentId,
}: {
  readonly paymentId: string;
}): React.JSX.Element {
  const { payment: observedPayment, isLoading } =
    useRecurringPayment(paymentId);

  return (
    <>
      <Text testID="payment-id">{observedPayment?.id ?? "missing"}</Text>
      <Text testID="payment-loading">{isLoading ? "loading" : "settled"}</Text>
    </>
  );
}

describe("useRecurringPayment", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    observer = null;
    payment.status = "ACTIVE";
    (payment as unknown as { deleted: boolean }).deleted = false;
    shouldEmitOnSubscribe = true;
    mockObserveOwnedById.mockReturnValue({
      subscribe: (
        nextObserver: MockObserver<RecurringPayment>
      ): { unsubscribe: jest.Mock } => {
        observer = nextObserver;
        if (shouldEmitOnSubscribe) {
          nextObserver.next(payment);
        }
        return { unsubscribe: mockUnsubscribe };
      },
    });
  });

  it("re-renders when Watermelon emits the same model instance after status changes", async () => {
    render(<RecurringPaymentStatusProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("payment-status")).toHaveTextContent("ACTIVE");
    });

    payment.status = "PAUSED";
    act(() => {
      observer?.next(payment);
    });

    await waitFor(() => {
      expect(screen.getByTestId("payment-status")).toHaveTextContent("PAUSED");
    });
  });

  it("treats soft-deleted recurring payments as missing", async () => {
    render(<RecurringPaymentStatusProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("payment-status")).toHaveTextContent("ACTIVE");
    });

    (payment as unknown as { deleted: boolean }).deleted = true;
    act(() => {
      observer?.next(payment);
    });

    await waitFor(() => {
      expect(screen.getByTestId("payment-status")).toHaveTextContent("missing");
    });
  });

  it("clears stale payment state while a new route id subscription is loading", async () => {
    mockObserveOwnedById.mockImplementation(
      (_collection: string, paymentId: string) => ({
        subscribe: (
          nextObserver: MockObserver<RecurringPayment>
        ): { unsubscribe: jest.Mock } => {
          observer = nextObserver;
          if (paymentId === "payment-1") {
            nextObserver.next(payment);
          }
          return { unsubscribe: mockUnsubscribe };
        },
      })
    );

    const view = render(<RecurringPaymentIdProbe paymentId="payment-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("payment-id")).toHaveTextContent("payment-1");
      expect(screen.getByTestId("payment-loading")).toHaveTextContent(
        "settled"
      );
    });

    view.rerender(<RecurringPaymentIdProbe paymentId="payment-2" />);

    expect(screen.getByTestId("payment-id")).toHaveTextContent("missing");
    expect(screen.getByTestId("payment-loading")).toHaveTextContent("loading");

    act(() => {
      observer?.next(secondPayment);
    });

    await waitFor(() => {
      expect(screen.getByTestId("payment-id")).toHaveTextContent("payment-2");
      expect(screen.getByTestId("payment-loading")).toHaveTextContent(
        "settled"
      );
    });
  });
});
