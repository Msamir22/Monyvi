interface RunCiE2eModule {
  appendOutputTail(
    currentOutput: string,
    nextChunk: string,
    maxLength?: number
  ): string;
  getRequestedCiSuites(
    env?: Readonly<Record<string, string | undefined>>
  ): ReadonlySet<"transactions" | "sms-sync" | "live-sms">;
  isDeviceOfflineFailure(output: string): boolean;
}

const runCiE2e = jest.requireActual(
  "../../scripts/run-ci-e2e"
) as RunCiE2eModule;

describe("run-ci-e2e helpers", () => {
  it("defaults to all E2E suites when no selective suite is requested", () => {
    expect([...runCiE2e.getRequestedCiSuites({})]).toEqual([
      "transactions",
      "sms-sync",
      "live-sms",
    ]);
  });

  it("parses selected E2E suites and treats skip as no-op", () => {
    expect([
      ...runCiE2e.getRequestedCiSuites({
        E2E_CI_SUITES: "sms-sync,live-sms",
      }),
    ]).toEqual(["sms-sync", "live-sms"]);

    expect(runCiE2e.getRequestedCiSuites({ E2E_CI_SUITES: "skip" }).size).toBe(
      0
    );
  });

  it("keeps only a bounded output tail for retry detection", () => {
    expect(runCiE2e.appendOutputTail("abcdef", "ghij", 6)).toBe("efghij");
  });

  it("detects ADB device-offline failures for infrastructure-only retry", () => {
    expect(
      runCiE2e.isDeviceOfflineFailure(
        "Caused by: java.io.IOException: Command failed (host:transport:emulator-5554): device offline"
      )
    ).toBe(true);
    expect(
      runCiE2e.isDeviceOfflineFailure(
        "io.grpc.StatusRuntimeException: UNAVAILABLE"
      )
    ).toBe(true);
  });

  it("does not retry normal assertion failures", () => {
    expect(
      runCiE2e.isDeviceOfflineFailure(
        'Assertion is false: "Transactions" is visible'
      )
    ).toBe(false);
  });
});
