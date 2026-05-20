import { act, renderHook } from "@testing-library/react-native";

let activeSubscriber: {
  next: (value: unknown[]) => void;
  error: (err: unknown) => void;
} | null = null;

const mockSubscribe = jest.fn(
  (subscriber: {
    next: (value: unknown[]) => void;
    error: (err: unknown) => void;
  }) => {
    activeSubscriber = subscriber;
    return { unsubscribe: jest.fn() };
  }
);
const mockObserve = jest.fn(() => ({ subscribe: mockSubscribe }));
const mockQuery = jest.fn(() => ({ observe: mockObserve }));
const mockWrite = jest.fn<Promise<unknown>, [() => Promise<unknown>]>((fn) =>
  fn()
);
const mockUseAuth = jest.fn();
const mockShowToast = jest.fn();
const mockPersistPreferredCurrency = jest.fn();
const mockLoggerError = jest.fn();

jest.mock("@monyvi/db", () => ({
  database: {
    get: jest.fn(() => ({
      query: mockQuery,
    })),
    write: (callback: () => Promise<unknown>): Promise<unknown> =>
      mockWrite(callback),
  },
  Profile: {},
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: (column: string, value: unknown): unknown => ({ column, value }),
    take: (count: number): unknown => ({ count }),
  },
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: (): unknown => mockUseAuth(),
}));

jest.mock("@/components/ui/Toast", () => ({
  useToast: (): { showToast: jest.Mock } => ({ showToast: mockShowToast }),
}));

jest.mock("@/services/profile-service", () => ({
  setPreferredCurrency: (...args: unknown[]): Promise<unknown> =>
    mockPersistPreferredCurrency(...args) as Promise<unknown>,
}));

jest.mock("@/services/user-data-access", () => ({
  queryOwned: (
    collection: { query: (...args: unknown[]) => unknown },
    ...args: unknown[]
  ): unknown => collection.query(...args),
}));

jest.mock("@/utils/currency-detection", () => ({
  DEFAULT_CURRENCY: "USD",
  detectCurrencyFromTimezone: jest.fn(() => "EGP"),
}));

jest.mock("@monyvi/logic", () => ({
  SUPPORTED_CURRENCIES: [{ code: "EGP" }, { code: "USD" }],
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: (...args: unknown[]): void => {
      mockLoggerError(...args);
    },
  },
}));

import { usePreferredCurrency } from "../../hooks/usePreferredCurrency";

beforeEach(() => {
  jest.clearAllMocks();
  activeSubscriber = null;
  mockUseAuth.mockReturnValue({
    user: { id: "user-1" },
    isLoading: false,
  });
  mockPersistPreferredCurrency.mockResolvedValue(undefined);
});

describe("usePreferredCurrency", () => {
  it("delegates preferred-currency writes to profile-service", async (): Promise<void> => {
    const { result } = renderHook(() => usePreferredCurrency());

    act(() => {
      activeSubscriber?.next([
        {
          id: "profile-1",
          preferredCurrency: "EGP",
          update: jest.fn(),
        },
      ]);
    });

    await act(async () => {
      await result.current.setPreferredCurrency("USD");
    });

    expect(mockPersistPreferredCurrency).toHaveBeenCalledWith("USD");
    expect(mockWrite).not.toHaveBeenCalled();
  });

  it("logs and shows a toast when the service rejects", async (): Promise<void> => {
    mockPersistPreferredCurrency.mockRejectedValueOnce(
      new Error("write failed")
    );
    const { result } = renderHook(() => usePreferredCurrency());

    act(() => {
      activeSubscriber?.next([{ id: "profile-1", preferredCurrency: "EGP" }]);
    });

    await act(async () => {
      await result.current.setPreferredCurrency("USD");
    });

    expect(mockLoggerError).toHaveBeenCalledWith(
      "preferredCurrency.save.failed",
      expect.any(Error)
    );
    expect(mockShowToast).toHaveBeenCalledWith({
      type: "error",
      title: "Error",
      message: "Failed to save currency preference",
    });
  });
});
