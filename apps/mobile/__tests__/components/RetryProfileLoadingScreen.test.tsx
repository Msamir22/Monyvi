/**
 * Unit tests for RetryProfileLoadingScreen.
 *
 * Regression guard: the status chip must use a dedicated translation key, not
 * a substring of the title. The old `.split(" ").slice(-2)` approach breaks on
 * Arabic (RTL + different word order).
 *
 * Tests:
 * - Pressing Retry loading profile invokes `onRetry`.
 * - Pressing Sign out invokes `onSignOut`.
 * - The chip renders the `profile_loading_failed_chip` translation key.
 */

import React from "react";
import { TouchableOpacity } from "react-native";

interface ReactTestRendererInstance {
  root: {
    findAllByType: (type: unknown) => Array<{
      props: Record<string, unknown>;
      children: unknown[];
    }>;
    findAllByProps: (matcher: Record<string, unknown>) => unknown[];
  };
  toJSON: () => unknown;
  unmount: () => void;
}
interface ReactTestRendererModule {
  act: (fn: () => void | Promise<void>) => void;
  create: (element: React.ReactElement) => ReactTestRendererInstance;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const RTR: ReactTestRendererModule = require("react-test-renderer");

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { top: number; bottom: number } => ({
    top: 0,
    bottom: 0,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { t: (key: string) => string } => ({
    t: (key: string): string => key,
  }),
}));

import { RetryProfileLoadingScreen } from "@/components/ui/RetryProfileLoadingScreen";

function collectText(node: unknown, out: string[]): void {
  if (node === null || node === undefined) return;
  if (typeof node === "string") {
    out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return;
  }
  if (typeof node === "object") {
    const maybe = node as { children?: unknown };
    collectText(maybe.children, out);
  }
}

function findButtonByLabel(
  renderer: ReactTestRendererInstance,
  label: string
): (() => void) | null {
  const buttons = renderer.root.findAllByType(TouchableOpacity);
  for (const btn of buttons) {
    const accessibilityLabel = btn.props.accessibilityLabel;
    if (accessibilityLabel === label) {
      return btn.props.onPress as () => void;
    }
  }
  return null;
}

describe("RetryProfileLoadingScreen", () => {
  it("invokes onRetry when the Retry loading profile button is pressed", () => {
    const onRetry = jest.fn();
    const onSignOut = jest.fn();

    const renderer = RTR.create(
      React.createElement(RetryProfileLoadingScreen, { onRetry, onSignOut })
    );

    const handler = findButtonByLabel(renderer, "retry_loading_profile");
    expect(handler).not.toBeNull();
    handler?.();

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it("invokes onSignOut when the Sign out button is pressed", () => {
    const onRetry = jest.fn();
    const onSignOut = jest.fn();

    const renderer = RTR.create(
      React.createElement(RetryProfileLoadingScreen, { onRetry, onSignOut })
    );

    const handler = findButtonByLabel(renderer, "sign_out");
    expect(handler).not.toBeNull();
    handler?.();

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("renders the dedicated profile-loading failure copy keys", () => {
    const renderer = RTR.create(
      React.createElement(RetryProfileLoadingScreen, {
        onRetry: jest.fn(),
        onSignOut: jest.fn(),
      })
    );

    const texts: string[] = [];
    collectText(renderer.toJSON(), texts);

    expect(texts).toContain("profile_loading_failed_chip");
    expect(texts).toContain("profile_loading_failed_title");
    expect(texts).toContain("profile_loading_failed_description");
    expect(texts).toContain("profile_loading_helper_text");
  });
});
