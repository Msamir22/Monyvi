export interface ManualQaSeedConfig {
  readonly email: string;
  readonly password: string;
  readonly supabaseUrl: string;
  readonly appSupabaseUrl: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
}

export declare const DEFAULT_MANUAL_QA_EMAIL: "manual-qa@monyvi.test";

export declare function getManualQaSeedConfig(
  env?: Record<string, string | undefined>
): ManualQaSeedConfig;
