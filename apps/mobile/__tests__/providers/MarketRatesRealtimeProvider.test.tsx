import { act, render, waitFor } from "@testing-library/react-native";
import React from "react";

interface MockRealtimeChannel {
  readonly topic: string;
  on: jest.Mock<MockRealtimeChannel>;
  subscribe: jest.Mock<MockRealtimeChannel>;
}

interface MockAuthState {
  readonly isAuthenticated: boolean;
}

const mockUseAuth = jest.fn<MockAuthState, []>(() => ({
  isAuthenticated: true,
}));
const mockSync = jest.fn<Promise<void>, []>(() => Promise.resolve());
const mockRemoveChannel = jest.fn<Promise<string>, [MockRealtimeChannel]>(
  () => Promise.resolve("ok")
);
const mockChannel = jest.fn<MockRealtimeChannel, [string]>();
const mockLoggerError = jest.fn<
  void,
  [string, unknown?, Record<string, unknown>?]
>();

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolveDeferred: (value: T) => void = () => undefined;
  let rejectDeferred: (reason: unknown) => void = () => undefined;

  const promise = new Promise<T>((resolve, reject) => {
    resolveDeferred = resolve;
    rejectDeferred = reject;
  });

  return {
    promise,
    resolve: resolveDeferred,
    reject: rejectDeferred,
  };
}

function createChannel(topic: string): MockRealtimeChannel {
  const channel: MockRealtimeChannel = {
    topic,
    on: jest.fn((): MockRealtimeChannel => channel),
    subscribe: jest.fn((): MockRealtimeChannel => channel),
  };

  return channel;
}

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock("@/providers/SyncProvider", () => ({
  useSync: () => ({ sync: mockSync }),
}));

jest.mock("@/services/supabase", () => ({
  supabase: {
    channel: (topic: string): MockRealtimeChannel => mockChannel(topic),
    removeChannel: (channel: MockRealtimeChannel): Promise<string> =>
      mockRemoveChannel(channel),
  },
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: (
      message: string,
      error?: unknown,
      context?: Record<string, unknown>
    ): void => mockLoggerError(message, error, context),
  },
}));

jest.mock("@supabase/supabase-js", () => ({
  REALTIME_SUBSCRIBE_STATES: {
    SUBSCRIBED: "SUBSCRIBED",
  },
}));

import { MarketRatesRealtimeProvider } from "../../providers/MarketRatesRealtimeProvider";

describe("MarketRatesRealtimeProvider", () => {
  beforeEach((): void => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockRemoveChannel.mockResolvedValue("ok");
    mockChannel.mockImplementation((topic: string) => createChannel(topic));
  });

  it("waits for the previous realtime channel to be removed before subscribing again", async (): Promise<void> => {
    const removal = createDeferred<string>();
    mockRemoveChannel.mockReturnValueOnce(removal.promise);

    const firstRender = render(
      <MarketRatesRealtimeProvider>
        <></>
      </MarketRatesRealtimeProvider>
    );

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      firstRender.unmount();
      await Promise.resolve();
    });

    render(
      <MarketRatesRealtimeProvider>
        <></>
      </MarketRatesRealtimeProvider>
    );

    await waitFor(() => {
      expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    });
    expect(mockChannel).toHaveBeenCalledTimes(1);

    await act(async () => {
      removal.resolve("ok");
      await removal.promise;
    });

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledTimes(2);
    });

    expect(mockChannel.mock.calls.map(([topic]) => topic)).toEqual([
      "market-rates-realtime",
      "market-rates-realtime",
    ]);
  });

  it("does not subscribe after a remount is cancelled while teardown is pending", async (): Promise<void> => {
    const removal = createDeferred<string>();
    mockRemoveChannel.mockReturnValueOnce(removal.promise);

    const firstRender = render(
      <MarketRatesRealtimeProvider>
        <></>
      </MarketRatesRealtimeProvider>
    );

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      firstRender.unmount();
      await Promise.resolve();
    });

    const secondRender = render(
      <MarketRatesRealtimeProvider>
        <></>
      </MarketRatesRealtimeProvider>
    );

    await act(async () => {
      secondRender.unmount();
      await Promise.resolve();
    });

    await act(async () => {
      removal.resolve("ok");
      await removal.promise;
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockChannel).toHaveBeenCalledTimes(1);
    expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
  });

  it("tears down the channel when authentication is lost", async (): Promise<void> => {
    const view = render(
      <MarketRatesRealtimeProvider>
        <></>
      </MarketRatesRealtimeProvider>
    );

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledTimes(1);
    });
    await act(async () => {
      await Promise.resolve();
    });

    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    await act(async () => {
      view.rerender(
        <MarketRatesRealtimeProvider>
          <></>
        </MarketRatesRealtimeProvider>
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockRemoveChannel).toHaveBeenCalledTimes(1);
    });
  });

  it("logs non-ok realtime channel removal statuses", async (): Promise<void> => {
    mockRemoveChannel.mockResolvedValueOnce("timed out");

    const view = render(
      <MarketRatesRealtimeProvider>
        <></>
      </MarketRatesRealtimeProvider>
    );

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      view.unmount();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        "marketRatesRealtime.removeChannel.failed",
        undefined,
        { status: "timed out" }
      );
    });
  });
});
