import { getManualQaSeedConfig } from "../../scripts/manual-qa-seed";

describe("manual-qa-seed script helpers", () => {
  it("requires an explicit local manual QA password", () => {
    expect(() =>
      getManualQaSeedConfig({
        E2E_SUPABASE_MODE: "local",
        E2E_LOCAL_JWT_SECRET: "local-test-jwt-secret-with-enough-length",
      })
    ).toThrow("MANUAL_QA_PASSWORD");
  });

  it("uses the manual QA email with the provided local password", () => {
    const config = getManualQaSeedConfig({
      E2E_SUPABASE_MODE: "local",
      E2E_LOCAL_JWT_SECRET: "local-test-jwt-secret-with-enough-length",
      MANUAL_QA_PASSWORD: "LocalOnlyPassword123!",
    });

    expect(config.email).toBe("manual-qa@monyvi.test");
    expect(config.password).toBe("LocalOnlyPassword123!");
  });
});
