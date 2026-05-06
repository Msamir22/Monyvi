/**
 * Unit tests for useProfile hook.
 *
 * Validates that the hook:
 * - Calls the WatermelonDB observe pipeline correctly
 * - Returns the expected interface shape
 * - Returns an object with profile and isLoading
 *
 * Note: Full subscription lifecycle testing is handled through
 * integration tests in the routing gate. These tests verify
 * the mock wiring and initial return shape.
 */

import React from "react";

// ---------------------------------------------------------------------------
// Test renderer utilities
// ---------------------------------------------------------------------------

interface ReactTestRendererInstance {
  unmount: () => void;
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

let mockAuthState: {
  user: { id: string } | null;
  isLoading: boolean;
} = {
  user: { id: "user-1" },
  isLoading: false,
};

jest.mock("@monyvi/db", () => ({
  database: {
    get: jest.fn(() => ({
      query: mockQuery,
    })),
  },
  Profile: {},
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: (): typeof mockAuthState => mockAuthState,
}));

const mockWhere = jest.fn((column: string, value: unknown) => ({
  column,
  value,
}));
const mockTake = jest.fn((count: number) => ({ count }));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: (column: string, value: unknown): unknown =>
      mockWhere(column, value),
    take: (count: number): unknown => mockTake(count),
  },
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
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

  let renderer: ReactTestRendererInstance;
  RTR.act(() => {
    renderer = RTR.create(React.createElement(HookWrapper));
  });
  return { result: resultRef, unmount: () => renderer.unmount() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  activeSubscriber = null;
  mockAuthState = {
    user: { id: "user-1" },
    isLoading: false,
  };
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

  it("scopes the profile observation to the authenticated user", () => {
    renderHook();

    expect(mockWhere).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockWhere).toHaveBeenCalledWith("deleted", false);
    expect(mockTake).toHaveBeenCalledWith(1);
  });

  it("does not subscribe while auth is still resolving", () => {
    mockAuthState = {
      user: null,
      isLoading: true,
    };

    const { result } = renderHook();

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it("returns an empty settled result when there is no authenticated user", () => {
    mockAuthState = {
      user: null,
      isLoading: false,
    };

    const { result } = renderHook();

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
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
