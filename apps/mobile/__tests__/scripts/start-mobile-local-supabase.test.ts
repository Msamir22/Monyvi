interface StartMobileLocalSupabaseModule {
  buildLocalSupabaseExpoEnv(
    anonKey: string,
    baseEnv?: Readonly<Record<string, string | undefined>>
  ): Record<string, string | undefined>;
  parseSupabaseEnv(output: string): Record<string, string>;
  resolveLocalSupabaseDeviceConfig(
    env?: Readonly<Record<string, string | undefined>>
  ): {
    readonly supabaseUrl: string;
    readonly shouldReversePort: boolean;
  };
}

const startMobileLocalSupabase = jest.requireActual(
  "../../scripts/start-mobile-local-supabase"
) as StartMobileLocalSupabaseModule;

describe("start-mobile-local-supabase script helpers", () => {
  it("uses loopback plus adb reverse by default so Google auth is available", () => {
    expect(
      startMobileLocalSupabase.resolveLocalSupabaseDeviceConfig({})
    ).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      shouldReversePort: true,
    });
  });

  it("allows the legacy Google auth flag without changing behavior", () => {
    expect(
      startMobileLocalSupabase.resolveLocalSupabaseDeviceConfig({
        MONYVI_LOCAL_GOOGLE_AUTH: "1",
      })
    ).toEqual({
      supabaseUrl: "http://127.0.0.1:54321",
      shouldReversePort: true,
    });
  });

  it("can opt out to the Android emulator host for non-OAuth debugging", () => {
    expect(
      startMobileLocalSupabase.resolveLocalSupabaseDeviceConfig({
        MONYVI_LOCAL_SUPABASE_LOOPBACK: "0",
      })
    ).toEqual({
      supabaseUrl: "http://10.0.2.2:54321",
      shouldReversePort: false,
    });
  });

  it("uses an explicit device Supabase URL for wireless physical devices", () => {
    expect(
      startMobileLocalSupabase.resolveLocalSupabaseDeviceConfig({
        MONYVI_LOCAL_GOOGLE_AUTH: "1",
        MONYVI_LOCAL_SUPABASE_DEVICE_URL: "https://monyvi-local.example.dev",
      })
    ).toEqual({
      supabaseUrl: "https://monyvi-local.example.dev",
      shouldReversePort: false,
    });
  });

  it("keeps an explicitly provided Expo Supabase URL", () => {
    const env = startMobileLocalSupabase.buildLocalSupabaseExpoEnv(
      "local-anon-key",
      {
        EXPO_PUBLIC_SUPABASE_URL: "https://custom-supabase.example.dev",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "custom-anon-key",
        MONYVI_LOCAL_GOOGLE_AUTH: "1",
      }
    );

    expect(env.EXPO_PUBLIC_SUPABASE_URL).toBe(
      "https://custom-supabase.example.dev"
    );
    expect(env.EXPO_PUBLIC_SUPABASE_ANON_KEY).toBe("custom-anon-key");
  });

  it("parses quoted Supabase status env output", () => {
    expect(
      startMobileLocalSupabase.parseSupabaseEnv(
        'ANON_KEY="anon"\nSUPABASE_URL=http://127.0.0.1:54321'
      )
    ).toEqual({
      ANON_KEY: "anon",
      SUPABASE_URL: "http://127.0.0.1:54321",
    });
  });
});
