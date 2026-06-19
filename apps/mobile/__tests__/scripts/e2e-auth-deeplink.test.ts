interface E2eAuthDeepLinkModule {
  buildE2eAuthDeepLink(
    env?: Readonly<Record<string, string | undefined>>
  ): string | undefined;
  applyE2eAuthDeepLink(env?: Record<string, string | undefined>): void;
}

const e2eAuthDeepLink = jest.requireActual(
  "../../scripts/e2e-auth-deeplink"
) as E2eAuthDeepLinkModule;

describe("e2e auth deep link helpers", () => {
  it("URL-encodes auth credentials before Maestro interpolation", () => {
    expect(
      e2eAuthDeepLink.buildE2eAuthDeepLink({
        MAESTRO_E2E_EMAIL: "e2e+ci@monyvi.test",
        MAESTRO_E2E_PASSWORD: "a&b#c?d",
      })
    ).toBe(
      "monyvi://e2e-auth?email=e2e%2Bci%40monyvi.test&password=a%26b%23c%3Fd"
    );
  });

  it("does not overwrite an explicitly provided auth deep link", () => {
    const env: Record<string, string | undefined> = {
      MAESTRO_E2E_AUTH_DEEPLINK: "monyvi://custom",
      MAESTRO_E2E_EMAIL: "e2e@monyvi.test",
      MAESTRO_E2E_PASSWORD: "password",
    };

    e2eAuthDeepLink.applyE2eAuthDeepLink(env);

    expect(env.MAESTRO_E2E_AUTH_DEEPLINK).toBe("monyvi://custom");
  });
});
