export type MonyviTestMode = "off" | "e2e";
export type AiSmsParserMode = "edge" | "fixture";

interface E2eProcessEnv {
  readonly EXPO_PUBLIC_MONYVI_TEST_MODE?: unknown;
  readonly EXPO_PUBLIC_AI_SMS_PARSER_MODE?: unknown;
}

interface E2eProcess {
  readonly env?: E2eProcessEnv;
}

function stringEnv(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getProcessEnv(): E2eProcessEnv | undefined {
  return (globalThis as { readonly process?: E2eProcess }).process?.env;
}

const publicMonyviTestModeEnv = stringEnv(
  process.env.EXPO_PUBLIC_MONYVI_TEST_MODE
);
const publicAiSmsParserModeEnv = stringEnv(
  process.env.EXPO_PUBLIC_AI_SMS_PARSER_MODE
);

function getNodeEnv(): string | undefined {
  return stringEnv(process.env.NODE_ENV);
}

function getPublicMonyviTestModeEnv(): string | undefined {
  if (getNodeEnv() === "test") {
    return stringEnv(getProcessEnv()?.EXPO_PUBLIC_MONYVI_TEST_MODE);
  }

  return publicMonyviTestModeEnv;
}

function getPublicAiSmsParserModeEnv(): string | undefined {
  if (getNodeEnv() === "test") {
    return stringEnv(getProcessEnv()?.EXPO_PUBLIC_AI_SMS_PARSER_MODE);
  }

  return publicAiSmsParserModeEnv;
}

export function getMonyviTestMode(): MonyviTestMode {
  return getPublicMonyviTestModeEnv() === "e2e" ? "e2e" : "off";
}

export function getAiSmsParserMode(): AiSmsParserMode {
  return getPublicAiSmsParserModeEnv() === "fixture" ? "fixture" : "edge";
}

export function isE2eTestMode(): boolean {
  return getMonyviTestMode() === "e2e";
}

export function shouldUseFixtureSmsParser(): boolean {
  return (
    getNodeEnv() !== "production" &&
    isE2eTestMode() &&
    getAiSmsParserMode() === "fixture"
  );
}
