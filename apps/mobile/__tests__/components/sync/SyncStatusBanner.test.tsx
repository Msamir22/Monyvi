import React from "react";

const mockUseSync = jest.fn();

jest.mock("@/providers/SyncProvider", () => ({
  useSync: (): unknown => mockUseSync(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { SyncStatusBanner } from "@/components/sync/SyncStatusBanner";

interface ReactTestRendererModule {
  readonly create: (element: React.ReactElement) => {
    readonly toJSON: () => unknown;
    readonly root: {
      readonly findAllByProps: (props: Record<string, unknown>) => unknown[];
    };
  };
}

function getRTR(): ReactTestRendererModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require("react-test-renderer");
}

describe("SyncStatusBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders nothing when background sync has no error", () => {
    mockUseSync.mockReturnValue({ syncError: null, sync: jest.fn() });

    const renderer = getRTR().create(<SyncStatusBanner />);

    expect(renderer.toJSON()).toBeNull();
  });

  it("shows a non-blocking retry affordance after background sync fails", () => {
    const retry = jest.fn().mockResolvedValue(undefined);
    mockUseSync.mockReturnValue({
      syncError: new Error("network"),
      sync: retry,
    });

    const renderer = getRTR().create(<SyncStatusBanner />);

    expect(
      renderer.root.findAllByProps({ testID: "sync-status-banner" }).length
    ).toBeGreaterThan(0);
    const retryButtons = renderer.root.findAllByProps({
      testID: "sync-status-retry",
    });
    expect(retryButtons.length).toBeGreaterThan(0);

    const button = retryButtons.find(
      (node) =>
        typeof (node as { props?: { onPress?: unknown } }).props?.onPress ===
        "function"
    ) as { props: { onPress: () => void } } | undefined;
    expect(button).toBeDefined();
    if (!button) {
      throw new Error("retry-button-not-found");
    }
    button.props.onPress();

    expect(retry).toHaveBeenCalledWith(true);
  });
});
