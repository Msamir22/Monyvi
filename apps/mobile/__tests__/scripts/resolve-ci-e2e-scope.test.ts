interface ResolveCiE2eScopeModule {
  getGitDiffArgs(
    env?: Readonly<Record<string, string | undefined>>
  ): readonly string[];
  resolveCiE2eScope(files: readonly string[]): {
    readonly shouldRun: boolean;
    readonly suites: readonly string[];
  };
}

const scopeResolver = jest.requireActual(
  "../../scripts/resolve-ci-e2e-scope"
) as ResolveCiE2eScopeModule;

describe("resolve-ci-e2e-scope", () => {
  it("skips Android E2E for docs-only changes", () => {
    expect(scopeResolver.resolveCiE2eScope(["README.md"])).toEqual({
      shouldRun: false,
      suites: [],
    });
  });

  it("selects live SMS E2E for live detection changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope([
        "apps/mobile/services/sms-live-detection-handler.ts",
      ])
    ).toEqual({
      shouldRun: true,
      suites: ["live-sms"],
    });
  });

  it("selects SMS sync E2E for batch SMS scan changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope([
        "apps/mobile/services/sms-sync-service.ts",
      ])
    ).toEqual({
      shouldRun: true,
      suites: ["sms-sync"],
    });
  });

  it("selects both SMS suites for shared fixture parser changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope([
        "apps/mobile/services/testing/ai-sms-fixture-parser.ts",
      ])
    ).toEqual({
      shouldRun: true,
      suites: ["sms-sync", "live-sms"],
    });
  });

  it("runs every suite for shared E2E harness changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope(["apps/mobile/scripts/e2e-preflight.js"])
    ).toEqual({
      shouldRun: true,
      suites: ["accounts", "transactions", "sms-sync", "live-sms"],
    });
  });

  it("keeps transaction E2E coverage for account form changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope([
        "apps/mobile/components/add-account/InstitutionPicker.tsx",
      ])
    ).toEqual({
      shouldRun: true,
      suites: ["accounts", "transactions"],
    });
  });

  it("selects only transaction E2E for recurring payment and budget form changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope([
        "apps/mobile/__tests__/app/budget-screens-style.test.tsx",
        "apps/mobile/__tests__/components/recurring-payments/RecurringPaymentForm.test.tsx",
        "apps/mobile/app/(private)/budget-detail.tsx",
        "apps/mobile/app/(private)/create-recurring-payment.tsx",
        "apps/mobile/app/(private)/edit-recurring-payment.tsx",
        "apps/mobile/components/modals/AccountSelectorModal.tsx",
        "apps/mobile/components/modals/ConfirmationModal.tsx",
        "apps/mobile/components/modals/FrequencyPickerModal.tsx",
        "apps/mobile/components/recurring-payments/RecurringPaymentForm.tsx",
        "apps/mobile/hooks/index.ts",
        "apps/mobile/hooks/useRecurringPayment.ts",
        "apps/mobile/hooks/useRecurringPayments.ts",
        "apps/mobile/locales/en/transactions.json",
        "apps/mobile/services/index.ts",
        "apps/mobile/services/recurring-payment-service.ts",
        "apps/mobile/validation/recurring-payment-validation.ts",
      ])
    ).toEqual({
      shouldRun: true,
      suites: ["transactions"],
    });
  });

  it("does not run Android E2E for unrelated mobile test-only changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope([
        "apps/mobile/__tests__/components/ui/TextField.test.tsx",
      ])
    ).toEqual({
      shouldRun: false,
      suites: [],
    });
  });

  it("does not force Android E2E for scope resolver-only changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope([
        "apps/mobile/scripts/resolve-ci-e2e-scope.js",
        "apps/mobile/__tests__/scripts/resolve-ci-e2e-scope.test.ts",
      ])
    ).toEqual({
      shouldRun: false,
      suites: [],
    });
  });

  it("uses the full fallback for Expo Router index route changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope([
        "apps/mobile/app/index.tsx",
        "apps/mobile/app/(private)/(tabs)/index.tsx",
      ])
    ).toEqual({
      shouldRun: true,
      suites: ["accounts", "transactions", "sms-sync", "live-sms"],
    });
  });

  it("runs account E2E for account locale copy changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope(["apps/mobile/locales/en/accounts.json"])
    ).toEqual({
      shouldRun: true,
      suites: ["accounts"],
    });
  });

  it("runs all Android E2E suites for shared common locale copy changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope(["apps/mobile/locales/en/common.json"])
    ).toEqual({
      shouldRun: true,
      suites: ["accounts", "transactions", "sms-sync", "live-sms"],
    });
  });

  it("runs all Android E2E suites for auth and onboarding locale copy changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope([
        "apps/mobile/locales/en/auth.json",
        "apps/mobile/locales/en/onboarding.json",
      ])
    ).toEqual({
      shouldRun: true,
      suites: ["accounts", "transactions", "sms-sync", "live-sms"],
    });
  });

  it("runs SMS E2E suites for settings locale permission copy changes", () => {
    expect(
      scopeResolver.resolveCiE2eScope(["apps/mobile/locales/en/settings.json"])
    ).toEqual({
      shouldRun: true,
      suites: ["sms-sync", "live-sms"],
    });
  });

  it("diffs the full pushed range on push events", () => {
    expect(
      scopeResolver.getGitDiffArgs({
        GITHUB_EVENT_NAME: "push",
        E2E_PUSH_BEFORE_SHA: "abc123",
      })
    ).toEqual(["diff", "--name-only", "abc123...HEAD"]);
  });
});
