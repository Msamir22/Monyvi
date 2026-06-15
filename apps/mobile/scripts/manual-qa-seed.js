const { createClient } = require("@supabase/supabase-js");

const { getE2eSeedConfig, resetE2eData, seedE2eData } = require("./e2e-seed");

const DEFAULT_MANUAL_QA_EMAIL = "manual-qa@monyvi.test";

function getManualQaSeedConfig(env = process.env) {
  const password = env.MANUAL_QA_PASSWORD;
  const preserveExistingPassword =
    !password || env.MANUAL_QA_PRESERVE_PASSWORD === "1";

  return getE2eSeedConfig({
    ...env,
    E2E_SUPABASE_MODE: "local",
    E2E_PRESERVE_EXISTING_PASSWORD: preserveExistingPassword ? "1" : undefined,
    MAESTRO_E2E_EMAIL: env.MANUAL_QA_EMAIL ?? DEFAULT_MANUAL_QA_EMAIL,
    MAESTRO_E2E_PASSWORD: password,
  });
}

async function main() {
  const config = getManualQaSeedConfig();
  const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const action = process.argv[2] ?? "seed";
  if (action !== "seed" && action !== "reset") {
    throw new Error(`Unknown manual QA seed action: ${action}`);
  }

  if (action === "reset") {
    const result = await resetE2eData(client, config);
    console.log(
      `Reset manual QA data for ${config.email} (${result.userId}) on local Supabase`
    );
    return;
  }

  const result = await seedE2eData(client, config);
  console.log(
    `Seeded manual QA data for ${config.email} (${result.userId}) on local Supabase`
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_MANUAL_QA_EMAIL,
  getManualQaSeedConfig,
};
