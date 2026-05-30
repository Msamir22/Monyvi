/**
 * useAccountById tests
 *
 * Guards the edit-account screen contract: BANK accounts must not finish
 * loading until their bank_details row has been fetched, otherwise the form
 * mounts with empty bank fields and never hydrates them.
 */

import React from "react";

interface ReactTestRendererInstance {
  unmount: () => void;
}

interface ReactTestRendererAct {
  (callback: () => Promise<void>): Promise<void>;
  (callback: () => void): void;
}

interface ReactTestRendererModule {
  act: ReactTestRendererAct;
  create: (element: React.ReactElement) => ReactTestRendererInstance;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const RTR: ReactTestRendererModule = require("react-test-renderer");

interface MockBankDetails {
  readonly bankName?: string;
  readonly cardLast4?: string;
  readonly smsSenderName?: string;
}

interface MockAccount {
  readonly id: string;
  readonly userId: string;
  readonly type: "BANK" | "CASH" | "DIGITAL_WALLET";
  readonly isBank: boolean;
  readonly isDigitalWallet?: boolean;
  readonly providerDisplayName?: string;
  readonly bankDetails: {
    readonly fetch?: jest.Mock<Promise<MockBankDetails[]>, []>;
  };
  readonly accountSmsSenders?: {
    readonly fetch?: jest.Mock<
      Promise<Array<{ senderName: string; deleted: boolean }>>,
      []
    >;
  };
}

interface MockObserver {
  readonly next: (record: MockAccount) => void;
  readonly error: (err: unknown) => void;
}

interface UseAccountByIdResult {
  readonly account: MockAccount | null;
  readonly bankDetails: {
    readonly bankName: string;
    readonly cardLast4: string;
    readonly smsSenderName: string;
    readonly smsSenderNames: readonly string[];
  } | null;
  readonly isLoading: boolean;
}

let activeObserver: MockObserver | null = null;
const mockUnsubscribe = jest.fn();
const mockFindAndObserve = jest.fn(() => ({
  subscribe: jest.fn((observer: MockObserver) => {
    activeObserver = observer;
    return { unsubscribe: mockUnsubscribe };
  }),
}));

jest.mock("@monyvi/db", () => ({
  database: {
    get: jest.fn(() => ({
      findAndObserve: mockFindAndObserve,
    })),
  },
}));

jest.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: (): { userId: string; isResolvingUser: boolean } => ({
    userId: "user-1",
    isResolvingUser: false,
  }),
}));

jest.mock("../../services/supabase", () => ({
  getCurrentUserId: (): Promise<string> => Promise.resolve("user-1"),
}));

// Import AFTER mocks
// eslint-disable-next-line import/first
import { useAccountById } from "../../hooks/useAccountById";

function renderHook(id: string): {
  readonly result: { current: UseAccountByIdResult };
  readonly unmount: () => void;
} {
  const ref: { current: UseAccountByIdResult } = {
    current: { account: null, bankDetails: null, isLoading: true },
  };

  const HookWrapper = (): React.JSX.Element | null => {
    ref.current = useAccountById(id) as unknown as UseAccountByIdResult;
    return null;
  };

  let renderer: ReactTestRendererInstance = { unmount: () => undefined };
  RTR.act(() => {
    renderer = RTR.create(React.createElement(HookWrapper));
  });
  return { result: ref, unmount: () => renderer.unmount() };
}

function createDeferred<T>(): {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
} {
  let resolvePromise: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

beforeEach(() => {
  jest.clearAllMocks();
  activeObserver = null;
});

describe("useAccountById", () => {
  it("keeps bank accounts loading until bank details are fetched", async () => {
    const deferredDetails = createDeferred<MockBankDetails[]>();
    const account: MockAccount = {
      id: "acc-1",
      userId: "user-1",
      type: "BANK",
      isBank: true,
      providerDisplayName: "CIB",
      bankDetails: {
        fetch: jest.fn(() => deferredDetails.promise),
      },
      accountSmsSenders: {
        fetch: jest.fn(() =>
          Promise.resolve([{ senderName: "CIBSMS", deleted: false }])
        ),
      },
    };
    const { result } = renderHook("acc-1");

    RTR.act(() => {
      activeObserver?.next(account);
    });

    expect(result.current.account).toBe(account);
    expect(result.current.bankDetails).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await RTR.act(async () => {
      deferredDetails.resolve([
        {
          cardLast4: "1234",
        },
      ]);
      await deferredDetails.promise;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.bankDetails).toEqual({
      bankName: "CIB",
      cardLast4: "1234",
      smsSenderName: "CIBSMS",
      smsSenderNames: ["CIBSMS"],
    });
  });

  it("does not refetch bank details for account emits with the same id and type", async () => {
    const account: MockAccount = {
      id: "acc-1",
      userId: "user-1",
      type: "BANK",
      isBank: true,
      providerDisplayName: "CIB",
      bankDetails: {
        fetch: jest.fn(() =>
          Promise.resolve([
            {
              cardLast4: "1234",
            },
          ])
        ),
      },
      accountSmsSenders: {
        fetch: jest.fn(() =>
          Promise.resolve([{ senderName: "CIBSMS", deleted: false }])
        ),
      },
    };
    renderHook("acc-1");

    await RTR.act(async () => {
      activeObserver?.next(account);
      await Promise.resolve();
    });

    await RTR.act(async () => {
      activeObserver?.next(account);
      await Promise.resolve();
    });

    expect(account.bankDetails.fetch).toHaveBeenCalledTimes(1);
  });

  it("uses empty relation rows when a fallback relation cannot fetch", async () => {
    const account: MockAccount = {
      id: "acc-1",
      userId: "user-1",
      type: "BANK",
      isBank: true,
      providerDisplayName: "CIB",
      bankDetails: {},
      accountSmsSenders: {},
    };
    const { result } = renderHook("acc-1");

    await RTR.act(async () => {
      activeObserver?.next(account);
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.bankDetails).toEqual({
      bankName: "CIB",
      cardLast4: undefined,
      smsSenderName: "",
      smsSenderNames: [],
    });
  });

  it("treats a foreign account id as not found", () => {
    const account: MockAccount = {
      id: "acc-foreign",
      userId: "other-user",
      type: "CASH",
      isBank: false,
      bankDetails: {
        fetch: jest.fn(() => Promise.resolve([])),
      },
    };
    const { result } = renderHook("acc-foreign");

    RTR.act(() => {
      activeObserver?.next(account);
    });

    expect(result.current.account).toBeNull();
    expect(result.current.bankDetails).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
