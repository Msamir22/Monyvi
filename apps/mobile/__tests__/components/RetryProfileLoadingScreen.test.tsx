/**
 * Unit tests for RetryProfileLoadingScreen.
 *
 * Regression guard: the status chip must use a dedicated translation key, not
 * a substring of the title. The old `.split(" ").slice(-2)` approach breaks on
 * Arabic (RTL + different word order).
 */

import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

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

describe("RetryProfileLoadingScreen", () => {
  it("invokes onRetry when the Retry loading profile button is pressed", () => {
    const onRetry = jest.fn();
    const onSignOut = jest.fn();

    render(
      <RetryProfileLoadingScreen onRetry={onRetry} onSignOut={onSignOut} />
    );

    fireEvent.press(screen.getByLabelText("retry_loading_profile"));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it("invokes onSignOut when the Sign out button is pressed", () => {
    const onRetry = jest.fn();
    const onSignOut = jest.fn();

    render(
      <RetryProfileLoadingScreen onRetry={onRetry} onSignOut={onSignOut} />
    );

    fireEvent.press(screen.getByLabelText("sign_out"));

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("renders the dedicated profile-loading failure copy keys", () => {
    render(
      <RetryProfileLoadingScreen onRetry={jest.fn()} onSignOut={jest.fn()} />
    );

    expect(screen.getByText("profile_loading_failed_chip")).toBeTruthy();
    expect(screen.getByText("profile_loading_failed_title")).toBeTruthy();
    expect(screen.getByText("profile_loading_failed_description")).toBeTruthy();
    expect(screen.getByText("profile_loading_helper_text")).toBeTruthy();
  });
});
