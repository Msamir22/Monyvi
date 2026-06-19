export interface ManualQaSeedConfig {
  readonly mode: "local" | "remote";
  readonly email: string;
  readonly password: string | null;
  readonly supabaseUrl: string;
  readonly appSupabaseUrl: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
  readonly preserveExistingPassword: boolean;
}

export declare const DEFAULT_MANUAL_QA_EMAIL: "manual-qa@monyvi.test";

export declare function getManualQaSeedConfig(
  env?: Record<string, string | undefined>
): ManualQaSeedConfig;
