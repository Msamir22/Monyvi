import { getManualQaSeedConfig } from "../../scripts/manual-qa-seed";

describe("manual-qa-seed script helpers", () => {
  it("preserves the existing manual QA password when no password is provided", () => {
    const config = getManualQaSeedConfig({
      E2E_SUPABASE_MODE: "local",
      E2E_LOCAL_JWT_SECRET: "local-test-jwt-secret-with-enough-length",
    });

    expect(config.email).toBe("manual-qa@monyvi.test");
    expect(config.password).toBeNull();
    expect(config.preserveExistingPassword).toBe(true);
  });

  it("uses the manual QA email with the provided local password", () => {
    const config = getManualQaSeedConfig({
      E2E_SUPABASE_MODE: "local",
      E2E_LOCAL_JWT_SECRET: "local-test-jwt-secret-with-enough-length",
      MANUAL_QA_PASSWORD: "LocalOnlyPassword123!",
    });

    expect(config.email).toBe("manual-qa@monyvi.test");
    expect(config.password).toBe("LocalOnlyPassword123!");
    expect(config.preserveExistingPassword).toBe(false);
  });
});
