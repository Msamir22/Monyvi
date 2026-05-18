import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { DashboardSmsInlineBanner } from "@/components/dashboard/DashboardSmsInlineBanner";

interface ReactTestRendererInstance {
  readonly root: {
    findAllByType: (type: unknown) => Array<{ props: Record<string, unknown> }>;
  };
}

interface ReactTestRendererModule {
  readonly act: (callback: () => void | Promise<void>) => void | Promise<void>;
  readonly create: (element: React.ReactElement) => ReactTestRendererInstance;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const RTR: ReactTestRendererModule = require("react-test-renderer");

function findButton(
  renderer: ReactTestRendererInstance,
  testID: string
): { props: { onPress?: () => void | Promise<void> } } {
  const button = renderer.root
    .findAllByType(TouchableOpacity)
    .find((node) => node.props.testID === testID);

  if (!button) {
    throw new Error(`Button ${testID} was not found`);
  }

  return button as { props: { onPress?: () => void | Promise<void> } };
}

describe("DashboardSmsInlineBanner", () => {
  it("renders the approved inline copy and action", () => {
    const renderer = RTR.create(
      <DashboardSmsInlineBanner
        message="Connect SMS to catch payments automatically"
        actionLabel="Enable"
        requestPermission={() => Promise.resolve("granted")}
        onPermissionGranted={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    const textValues = renderer.root
      .findAllByType(Text)
      .map((node) => node.props.children);

    expect(textValues).toContain("Connect SMS to catch payments automatically");
    expect(textValues).toContain("Enable");
  });

  it("opens SMS scan after permission is granted", async () => {
    const onPermissionGranted = jest.fn();
    const onDismiss = jest.fn();
    const renderer = RTR.create(
      <DashboardSmsInlineBanner
        message="Connect SMS to catch payments automatically"
        actionLabel="Enable"
        requestPermission={() => Promise.resolve("granted")}
        onPermissionGranted={onPermissionGranted}
        onDismiss={onDismiss}
      />
    );

    await RTR.act(async () => {
      await findButton(renderer, "dashboard-sms-enable").props.onPress?.();
    });

    expect(onPermissionGranted).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("dismisses the banner when permission is not granted", async () => {
    const onPermissionGranted = jest.fn();
    const onDismiss = jest.fn();
    const renderer = RTR.create(
      <DashboardSmsInlineBanner
        message="Connect SMS to catch payments automatically"
        actionLabel="Enable"
        requestPermission={() => Promise.resolve("denied")}
        onPermissionGranted={onPermissionGranted}
        onDismiss={onDismiss}
      />
    );

    await RTR.act(async () => {
      await findButton(renderer, "dashboard-sms-enable").props.onPress?.();
    });

    expect(onPermissionGranted).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("dismisses the banner from the close button", () => {
    const onDismiss = jest.fn();
    const renderer = RTR.create(
      <DashboardSmsInlineBanner
        message="Connect SMS to catch payments automatically"
        actionLabel="Enable"
        requestPermission={() => Promise.resolve("granted")}
        onPermissionGranted={jest.fn()}
        onDismiss={onDismiss}
      />
    );

    findButton(renderer, "dashboard-sms-dismiss").props.onPress?.();

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
