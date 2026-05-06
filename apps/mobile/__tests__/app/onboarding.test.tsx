import React from "react";

interface ReactTestRendererInstance {
  root: {
    findAllByProps: (m: Record<string, unknown>) => unknown[];
  };
}

interface ReactTestRendererModule {
  create: (el: React.ReactElement) => ReactTestRendererInstance;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const RTR: ReactTestRendererModule = require("react-test-renderer");

const mockUseProfile = jest.fn();

jest.mock("@/hooks/useProfile", () => ({
  useProfile: (): unknown => mockUseProfile(),
}));

jest.mock("expo-router", () => ({
  Redirect: (props: { href: string }): React.ReactElement => {
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
    const ReactMod = require("react");
    const RN = require("react-native");
    return ReactMod.createElement(
      RN.View,
      { testID: "redirect", "data-href": props.href },
      null
    ) as React.ReactElement;
    /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  },
}));

jest.mock("@/components/onboarding/CurrencyStep", () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  const ReactMod = require("react");
  const RN = require("react-native");
  return {
    CurrencyStep: (): React.ReactElement =>
      ReactMod.createElement(
        RN.View,
        { testID: "currency-step" },
        null
      ) as React.ReactElement,
  };
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
});

jest.mock("@/components/sync/AccountLoadingScreen", () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  const ReactMod = require("react");
  const RN = require("react-native");
  return {
    AccountLoadingScreen: (): React.ReactElement =>
      ReactMod.createElement(
        RN.View,
        { testID: "account-loading-screen" },
        null
      ) as React.ReactElement,
  };
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
});

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const OnboardingModule = require("../../app/onboarding.tsx") as {
  default: () => React.JSX.Element;
};
const OnboardingScreen = OnboardingModule.default;

function renderScreen(): ReactTestRendererInstance {
  return RTR.create(React.createElement(OnboardingScreen));
}

function findRedirectHref(
  renderer: ReactTestRendererInstance
): string | undefined {
  const hits = renderer.root.findAllByProps({ testID: "redirect" });
  const node = hits[0] as { props?: { [key: string]: unknown } } | undefined;
  return node?.props?.["data-href"] as string | undefined;
}

describe("onboarding screen route guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows account loading while the profile is still loading", () => {
    mockUseProfile.mockReturnValue({
      profile: null,
      isLoading: true,
    });

    const renderer = renderScreen();

    expect(
      renderer.root.findAllByProps({ testID: "account-loading-screen" })
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: "currency-step" })
    ).toHaveLength(0);
  });

  it("redirects back to the route gate when the profile is missing", () => {
    mockUseProfile.mockReturnValue({
      profile: null,
      isLoading: false,
    });

    const renderer = renderScreen();

    expect(findRedirectHref(renderer)).toBe("/");
    expect(
      renderer.root.findAllByProps({ testID: "account-loading-screen" })
    ).not.toHaveLength(0);
  });

  it("redirects an onboarded user away from currency selection", () => {
    mockUseProfile.mockReturnValue({
      profile: { onboardingCompleted: true },
      isLoading: false,
    });

    const renderer = renderScreen();

    expect(findRedirectHref(renderer)).toBe("/(tabs)");
    expect(
      renderer.root.findAllByProps({ testID: "currency-step" })
    ).toHaveLength(0);
  });

  it("renders currency selection for a verified unfinished profile", () => {
    mockUseProfile.mockReturnValue({
      profile: { onboardingCompleted: false },
      isLoading: false,
    });

    const renderer = renderScreen();

    expect(findRedirectHref(renderer)).toBeUndefined();
    expect(
      renderer.root.findAllByProps({ testID: "currency-step" })
    ).not.toHaveLength(0);
  });
});
