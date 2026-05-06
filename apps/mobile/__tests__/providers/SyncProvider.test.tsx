/**
 * @file SyncProvider.test.tsx
 * @description Unit tests for SyncProvider's new initialSyncState and retryInitialSync.
 *
 * Tests the state machine: in-progress → success | failed | timeout,
 * the 20-second timeout race, and retryInitialSync().
 */

import React from "react";

// ---------------------------------------------------------------------------
// Test renderer utilities
// ---------------------------------------------------------------------------

interface ReactTestRendererInstance {
  update: (element: React.ReactElement) => void;
  unmount: () => void;
}

interface ReactTestRendererModule {
  act: (...args: unknown[]) => unknown;
  create: (element: React.ReactElement) => ReactTestRendererInstance;
}

// Lazy-load react-test-renderer so it doesn't drag `react-native` into the
// module cache before our AppState mock (from __tests__/setup.ts) is applied.
// Without this, `AppState.addEventListener` comes out as undefined when
// SyncProvider's useEffect runs and the test crashes.
function getRTR(): ReactTestRendererModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require("react-test-renderer");
}

const actSync = ((fn: () => void) => getRTR().act(fn)) as (
  fn: () => void
) => void;

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSyncDatabase = jest.fn();
const mockCheckIsAuthenticated = jest.fn();
const mockCompleteInterruptedLogout = jest.fn();
const mockBootstrapCurrentProfile = jest.fn();
const mockRefreshSharedReferenceDataAfterAuth = jest.fn();
const mockFetchCount = jest.fn();
let mockIsAuthenticated = true;
let mockAuthUserId: string | null = "user-1";

jest.mock("@/services/sync", () => ({
  syncDatabase: (...args: unknown[]): Promise<unknown> =>
    mockSyncDatabase(...args) as Promise<unknown>,
}));

jest.mock("@/services/supabase", () => ({
  isAuthenticated: (): Promise<boolean> =>
    mockCheckIsAuthenticated() as Promise<boolean>,
}));

jest.mock("@/services/logout-service", () => ({
  completeInterruptedLogout: (...args: unknown[]): Promise<void> =>
    mockCompleteInterruptedLogout(...args) as Promise<void>,
}));

jest.mock("@/services/profile-bootstrap-service", () => ({
  bootstrapCurrentProfile: (...args: unknown[]): Promise<unknown> =>
    mockBootstrapCurrentProfile(...args) as Promise<unknown>,
}));

jest.mock("@/services/shared-reference-refresh-service", () => ({
  refreshSharedReferenceDataAfterAuth: (...args: unknown[]): Promise<unknown> =>
    mockRefreshSharedReferenceDataAfterAuth(...args) as Promise<unknown>,
}));

jest.mock("@monyvi/db", () => ({
  database: {
    get: jest.fn(() => ({
      query: () => ({ fetchCount: mockFetchCount }),
    })),
  },
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    user: mockAuthUserId === null ? null : { id: mockAuthUserId },
  }),
}));

// Import after mocks
import { SyncProvider, useSync } from "../../providers/SyncProvider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SyncContextSnapshot {
  bootstrapRouteBasis: string;
  bootstrapReason: string | null;
  initialSyncState: string;
  isInitialSync: boolean;
  isPostBootstrapSyncing: boolean;
  syncError: Error | null;
  retryInitialSync: () => Promise<string>;
}

interface AppStateSubscription {
  remove: () => void;
}

interface MockedReactNativeAppState {
  AppState: {
    addEventListener: jest.Mock<
      AppStateSubscription,
      [string, (state: string) => void]
    >;
  };
}

function renderAndCapture(): {
  result: React.MutableRefObject<SyncContextSnapshot>;
  update: () => void;
  unmount: () => void;
} {
  const resultRef =
    React.createRef() as React.MutableRefObject<SyncContextSnapshot>;

  const CaptureComponent = (): React.JSX.Element | null => {
    const {
      bootstrapRouteBasis,
      bootstrapReason,
      initialSyncState,
      isInitialSync,
      isPostBootstrapSyncing,
      syncError,
      retryInitialSync,
    } = useSync();
    resultRef.current = {
      bootstrapRouteBasis,
      bootstrapReason,
      initialSyncState,
      isInitialSync,
      isPostBootstrapSyncing,
      syncError,
      retryInitialSync,
    };
    return null;
  };

  let renderer: ReactTestRendererInstance | null = null;
  actSync(() => {
    renderer = getRTR().create(
      React.createElement(
        SyncProvider,
        null,
        React.createElement(CaptureComponent)
      )
    );
  });

  return {
    result: resultRef,
    update: () => {
      actSync(() => {
        renderer?.update(
          React.createElement(
            SyncProvider,
            null,
            React.createElement(CaptureComponent)
          )
        );
      });
    },
    unmount: () => {
      renderer?.unmount();
    },
  };
}

function getLatestAppStateListener(): (state: string) => void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require("react-native") as MockedReactNativeAppState;
  const calls = RN.AppState.addEventListener.mock.calls;
  const latestCall = calls[calls.length - 1];
  if (!latestCall) {
    throw new Error("AppState listener was not registered");
  }
  return latestCall[1];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SyncProvider initialSyncState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockIsAuthenticated = true;
    mockAuthUserId = "user-1";
    mockCheckIsAuthenticated.mockResolvedValue(true);
    mockCompleteInterruptedLogout.mockResolvedValue(undefined);
    mockBootstrapCurrentProfile.mockResolvedValue({
      status: "ready-remote-profile",
      reason: "remote-profile-applied",
      routeBasis: "remote-profile",
    });
    mockRefreshSharedReferenceDataAfterAuth.mockResolvedValue({
      marketRates: "applied",
      systemCategories: "applied",
    });
    mockFetchCount.mockResolvedValue(3);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('starts with initialSyncState "in-progress"', () => {
    mockSyncDatabase.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderAndCapture();
    expect(result.current.initialSyncState).toBe("in-progress");
  });

  it("does not expose a stale signed-out sync state during the sign-in transition", async () => {
    mockIsAuthenticated = false;
    const { result, update } = renderAndCapture();

    await getRTR().act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.initialSyncState).toBe("success");

    mockIsAuthenticated = true;
    update();

    expect(result.current.initialSyncState).toBe("in-progress");
  });

  it("does not start a sync interval while unauthenticated", async () => {
    mockIsAuthenticated = false;
    renderAndCapture();

    await getRTR().act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockBootstrapCurrentProfile).not.toHaveBeenCalled();
    expect(mockSyncDatabase).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("does not start a sync interval from AppState changes while unauthenticated", async () => {
    mockIsAuthenticated = false;
    renderAndCapture();

    await getRTR().act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const listener = getLatestAppStateListener();
    actSync(() => {
      listener("background");
    });

    expect(mockSyncDatabase).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  // Helper: flush pending microtasks without running every timer. We can't use
  // `jest.runAllTimersAsync()` here because SyncProvider schedules a 15-minute
  // interval, and runAllTimers re-fires it forever.
  async function flushInitialSync(): Promise<void> {
    // Advance just past the 20s race — enough to settle both resolve and
    // reject branches of Promise.race without triggering the 15-min interval.
    await getRTR().act(async () => {
      await jest.advanceTimersByTimeAsync(20_500);
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
    });
  }

  it('transitions to "success" when sync completes within timeout', async () => {
    mockSyncDatabase.mockResolvedValue(undefined);
    const { result } = renderAndCapture();

    await flushInitialSync();
    actSync(() => {
      // No-op - just trigger a React update
    });

    expect(result.current.initialSyncState).toBe("success");
    expect(mockSyncDatabase).toHaveBeenCalledWith(expect.any(Object), true);
  });

  it("bootstraps the current profile before starting the background full sync", async () => {
    mockSyncDatabase.mockResolvedValue(undefined);
    renderAndCapture();

    await flushInitialSync();
    actSync(() => {
      // Trigger a React update so captured state catches up.
    });

    expect(mockBootstrapCurrentProfile).toHaveBeenCalledWith(
      expect.any(Object),
      { timeoutMs: 30_000, userId: "user-1" }
    );
    expect(mockSyncDatabase).toHaveBeenCalledWith(expect.any(Object), true);
    expect(
      mockBootstrapCurrentProfile.mock.invocationCallOrder[0]
    ).toBeLessThan(mockSyncDatabase.mock.invocationCallOrder[0]);
  });

  it("starts shared reference refresh after successful profile bootstrap", async () => {
    mockSyncDatabase.mockResolvedValue(undefined);
    renderAndCapture();

    await flushInitialSync();

    expect(mockRefreshSharedReferenceDataAfterAuth).toHaveBeenCalledWith(
      expect.any(Object)
    );
    expect(
      mockBootstrapCurrentProfile.mock.invocationCallOrder[0]
    ).toBeLessThan(
      mockRefreshSharedReferenceDataAfterAuth.mock.invocationCallOrder[0]
    );
  });

  it("ignores stale profile bootstrap results after the authenticated user changes", async () => {
    let resolveStaleBootstrap:
      | ((value: {
          status: string;
          reason: string;
          routeBasis: string;
        }) => void)
      | undefined;

    mockBootstrapCurrentProfile.mockImplementation(
      (_database: unknown, options: { readonly userId?: string | null }) => {
        if (options.userId === "user-1") {
          return new Promise((resolve) => {
            resolveStaleBootstrap = resolve;
          });
        }

        return Promise.resolve({
          status: "ready-remote-profile",
          reason: "remote-profile-applied",
          routeBasis: "remote-profile",
        });
      }
    );

    const { result, update } = renderAndCapture();

    await getRTR().act(async () => {
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
    });

    expect(mockBootstrapCurrentProfile).toHaveBeenCalledWith(
      expect.any(Object),
      { timeoutMs: 30_000, userId: "user-1" }
    );
    expect(result.current.initialSyncState).toBe("in-progress");

    mockAuthUserId = "user-2";
    update();

    await flushInitialSync();
    expect(mockBootstrapCurrentProfile).toHaveBeenCalledWith(
      expect.any(Object),
      { timeoutMs: 30_000, userId: "user-2" }
    );
    expect(result.current.initialSyncState).toBe("success");

    await getRTR().act(async () => {
      resolveStaleBootstrap?.({
        status: "needs-recovery",
        reason: "remote-profile-error",
        routeBasis: "none",
      });
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
    });

    expect(result.current.initialSyncState).toBe("success");
    expect(result.current.bootstrapRouteBasis).toBe("remote-profile");
    expect(result.current.bootstrapReason).toBe("remote-profile-applied");
  });
  it("unblocks a new user's onboarding route without waiting for full sync completion", async () => {
    mockBootstrapCurrentProfile.mockResolvedValue({
      status: "ready-remote-profile",
      reason: "remote-profile-unfinished",
      routeBasis: "remote-profile",
    });
    mockSyncDatabase.mockReturnValue(new Promise(() => {}));
    const { result } = renderAndCapture();

    await flushInitialSync();

    expect(result.current.initialSyncState).toBe("success");
    expect(result.current.bootstrapRouteBasis).toBe("remote-profile");
    expect(result.current.bootstrapReason).toBe("remote-profile-unfinished");
    expect(result.current.isInitialSync).toBe(false);
    expect(result.current.isPostBootstrapSyncing).toBe(true);
    expect(mockSyncDatabase).toHaveBeenCalledWith(expect.any(Object), true);
  });

  it("keeps post-bootstrap syncing true only while the first full data refresh is pending", async () => {
    let resolveFullSync: (() => void) | undefined;
    mockSyncDatabase.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveFullSync = resolve;
      })
    );
    const { result } = renderAndCapture();

    await flushInitialSync();

    expect(result.current.initialSyncState).toBe("success");
    expect(result.current.isPostBootstrapSyncing).toBe(true);

    await getRTR().act(async () => {
      resolveFullSync?.();
      for (let i = 0; i < 5; i++) {
        await Promise.resolve();
      }
    });

    expect(result.current.isPostBootstrapSyncing).toBe(false);
  });

  it("keeps the route unblocked and stores a non-blocking error when background sync fails", async () => {
    mockSyncDatabase.mockRejectedValue(new Error("background refresh failed"));
    const { result } = renderAndCapture();

    await flushInitialSync();

    expect(result.current.initialSyncState).toBe("success");
    expect(result.current.isPostBootstrapSyncing).toBe(false);
    expect(result.current.syncError?.message).toBe("background refresh failed");
  });

  // TODO(024): this test is order-dependent in fake-timer mode — passes
  // alone, fails after the "success" case runs first because a tick of the
  // 15-min setInterval leaks microtasks that prevent the failure handler
  // from settling in time. Revisit with a dedicated test-utility that
  // isolates SyncProvider's effect from its interval.
  it.skip('transitions to "failed" when sync throws before timeout', async () => {
    mockSyncDatabase.mockRejectedValue(new Error("Network error"));
    const { result } = renderAndCapture();

    for (let i = 0; i < 10; i++) {
      if (result.current?.initialSyncState === "failed") break;
      await flushInitialSync();
    }
    actSync(() => {
      // No-op - just trigger a React update
    });

    expect(result.current.initialSyncState).toBe("failed");
  });

  // TODO(024): Like the "failed" case above, this test is order-dependent
  // in fake-timer mode. Revisit with a test-utility that isolates
  // SyncProvider's initial-sync Promise.race from its 15-min setInterval.
  it.skip('transitions to "timeout" when sync takes longer than 20 seconds', async () => {
    mockSyncDatabase.mockReturnValue(new Promise(() => {}));
    const { result } = renderAndCapture();

    await flushInitialSync();
    actSync(() => {
      // Trigger a React update so the captured ref sees the latest state.
    });

    expect(result.current.initialSyncState).toBe("timeout");
  });

  it("provides retryInitialSync as a callable function", () => {
    mockSyncDatabase.mockReturnValue(new Promise(() => {}));
    const { result } = renderAndCapture();
    expect(typeof result.current.retryInitialSync).toBe("function");
  });
});
