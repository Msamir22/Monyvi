const { createClient } = require("@supabase/supabase-js");

const { getE2eSeedConfig, resetE2eData, seedE2eData } = require("./e2e-seed");

const DEFAULT_MANUAL_QA_EMAIL = "manual-qa@monyvi.test";

function requireManualQaPassword(env) {
  if (!env.MANUAL_QA_PASSWORD) {
    throw new Error(
      "Set MANUAL_QA_PASSWORD before running manual QA seed scripts."
    );
  }

  return env.MANUAL_QA_PASSWORD;
}

function getManualQaSeedConfig(env = process.env) {
  return getE2eSeedConfig({
    ...env,
    E2E_SUPABASE_MODE: "local",
    MAESTRO_E2E_EMAIL: env.MANUAL_QA_EMAIL ?? DEFAULT_MANUAL_QA_EMAIL,
    MAESTRO_E2E_PASSWORD: requireManualQaPassword(env),
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
