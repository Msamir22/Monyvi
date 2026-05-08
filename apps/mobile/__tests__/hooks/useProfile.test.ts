/**
 * Unit tests for useProfile hook.
 *
 * Validates that the hook scopes the local profile observation to the
 * currently authenticated user. A foreign local profile row must never drive
 * routing.
 */

import React from "react";

// ---------------------------------------------------------------------------
// Test renderer utilities
// ---------------------------------------------------------------------------

interface ReactTestRendererInstance {
  unmount: () => void;
  update: (element: React.ReactElement) => void;
}

interface ReactTestRendererModule {
  act: (...args: unknown[]) => unknown;
  create: (element: React.ReactElement) => ReactTestRendererInstance;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const RTR: ReactTestRendererModule = require("react-test-renderer");

// ---------------------------------------------------------------------------
// Mock: WatermelonDB observable
// ---------------------------------------------------------------------------

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
    return {
      unsubscribe: jest.fn(() => {
        activeSubscriber = null;
      }),
    };
  }
);

const mockObserve = jest.fn(() => ({ subscribe: mockSubscribe }));

const mockQuery = jest.fn(() => ({ observe: mockObserve }));
const mockWhere = jest.fn((column: string, value: unknown) => ({
  column,
  value,
}));
const mockTake = jest.fn((count: number) => ({ count }));
const mockUseAuth = jest.fn();

jest.mock("@monyvi/db", () => ({
  database: {
    get: jest.fn(() => ({
      query: mockQuery,
    })),
  },
  Profile: {},
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: (column: string, value: unknown): unknown =>
      mockWhere(column, value),
    take: (count: number): unknown => mockTake(count),
  },
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: (): unknown => mockUseAuth(),
}));

jest.mock("@/services/supabase", () => ({
  getCurrentUserId: jest.fn(() => Promise.resolve("current-user")),
}));

jest.mock("@/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

// Import after mocks
import { useProfile } from "../../hooks/useProfile";

// ---------------------------------------------------------------------------
// Lightweight renderHook
// ---------------------------------------------------------------------------

interface HookResult {
  profile: unknown;
  isLoading: boolean;
}

function renderHook(): {
  result: React.MutableRefObject<HookResult>;
  unmount: () => void;
  update: () => void;
} {
  const resultRef: React.MutableRefObject<HookResult> =
    React.createRef() as React.MutableRefObject<HookResult>;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!resultRef.current) {
    resultRef.current = { profile: null, isLoading: true };
  }

  const HookWrapper = (): React.JSX.Element | null => {
    const hookVal = useProfile();
    resultRef.current = hookVal;
    return null;
  };

  let renderer: ReactTestRendererInstance | null = null;
  RTR.act(() => {
    renderer = RTR.create(React.createElement(HookWrapper));
  });

  if (renderer === null) {
    throw new Error("renderer not initialised");
  }

  return {
    result: resultRef,
    unmount: () => renderer?.unmount(),
    update: () => {
      RTR.act(() => {
        renderer?.update(React.createElement(HookWrapper));
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  activeSubscriber = null;
  mockUseAuth.mockReturnValue({
    user: { id: "current-user" },
    isLoading: false,
  });
});

describe("useProfile", () => {
  it("starts with isLoading=true and profile=null", () => {
    const { result } = renderHook();
    expect(result.current.isLoading).toBe(true);
    expect(result.current.profile).toBeNull();
  });

  it("sets up a WatermelonDB observation on mount", () => {
    renderHook();
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(activeSubscriber).not.toBeNull();
  });

  it("subscribes only to the current authenticated user's profile", () => {
    renderHook();

    expect(mockQuery).toHaveBeenCalledWith(
      { column: "user_id", value: "current-user" },
      { column: "deleted", value: false },
      { count: 1 }
    );
  });

  it("does not subscribe or emit a foreign row while auth is unresolved", () => {
    mockUseAuth.mockReturnValue({ user: null, isLoading: true });

    const { result } = renderHook();

    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(result.current.profile).toBeNull();
    expect(result.current.isLoading).toBe(true);
  });

  it("clears the profile and resubscribes when the authenticated user changes", () => {
    const firstProfile = { id: "profile-1", userId: "current-user" };
    const { result, update } = renderHook();

    RTR.act(() => {
      activeSubscriber?.next([firstProfile]);
    });
    expect(result.current.profile).toBe(firstProfile);
    expect(result.current.isLoading).toBe(false);

    mockUseAuth.mockReturnValue({
      user: { id: "next-user" },
      isLoading: false,
    });

    update();

    expect(result.current.profile).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(mockQuery).toHaveBeenLastCalledWith(
      { column: "user_id", value: "next-user" },
      { column: "deleted", value: false },
      { count: 1 }
    );
  });

  it("does not emit foreign profile rows from the scoped observation", () => {
    const { result } = renderHook();

    RTR.act(() => {
      activeSubscriber?.next([]);
    });

    expect(result.current.profile).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("returns an unsubscribe function from the subscription (cleanup contract)", () => {
    renderHook();
    const subscription = mockSubscribe.mock.results[0].value as {
      unsubscribe: () => void;
    };
    expect(subscription).toHaveProperty("unsubscribe");
    expect(typeof subscription.unsubscribe).toBe("function");
  });
});
