const { spawnSync } = require("node:child_process");
const {
  adb,
  appId,
  ensureE2eAppReady,
  resolveMaestroBin,
} = require("./e2e-preflight");
const { createLocalSupabaseJwt } = require("./e2e-seed");

const LOCAL_ANDROID_SUPABASE_URL = "http://10.0.2.2:54321";

function shouldRunPreflight(args) {
  return args.includes("test");
}

function applyLocalE2eDefaults() {
  if (process.env.E2E_SUPABASE_MODE !== "local") return;

  process.env.E2E_SUPABASE_MODE = "local";
  process.env.EXPO_PUBLIC_SUPABASE_URL ??= LOCAL_ANDROID_SUPABASE_URL;
  process.env.EXPO_PUBLIC_MONYVI_TEST_MODE ??= "e2e";
  process.env.EXPO_PUBLIC_AI_SMS_PARSER_MODE ??= "fixture";

  if (
    !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.E2E_LOCAL_JWT_SECRET
  ) {
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = createLocalSupabaseJwt(
      process.env.E2E_LOCAL_JWT_SECRET,
      "anon"
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const hasPreflight = shouldRunPreflight(args);

  if (hasPreflight) {
    applyLocalE2eDefaults();
  }

  const maestroBin = resolveMaestroBin();

  if (!maestroBin) {
    console.error(
      "Maestro was not found. Install it, add it to PATH, or set MAESTRO_BIN."
    );
    process.exit(1);
  }

  if (hasPreflight) {
    if (process.env.E2E_CLEAR_APP_STATE === "1") {
      adb(["shell", "pm", "clear", appId]);
    }
    await ensureE2eAppReady();
  }

  const result = spawnSync(maestroBin, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  process.exit(result.status ?? 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
