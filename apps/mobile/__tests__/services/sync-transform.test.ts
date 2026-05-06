import { transformFromSupabase } from "@/services/sync-transform";

describe("transformFromSupabase", () => {
  it("converts timestamp columns from ISO strings to Watermelon timestamps", (): void => {
    const result = transformFromSupabase({
      id: "profile-1",
      created_at: "2026-05-06T09:00:00.000Z",
      updated_at: "2026-05-06T10:30:00.000Z",
    });

    expect(result.created_at).toBe(
      new Date("2026-05-06T09:00:00.000Z").getTime()
    );
    expect(result.updated_at).toBe(
      new Date("2026-05-06T10:30:00.000Z").getTime()
    );
  });

  it("converts date-only columns from date strings to Watermelon timestamps", (): void => {
    const result = transformFromSupabase({
      id: "tx-1",
      date: "2026-05-06",
      due_date: "2026-05-10",
    });

    expect(result.date).toBe(new Date("2026-05-06").getTime());
    expect(result.due_date).toBe(new Date("2026-05-10").getTime());
  });

  it("leaves non-date profile, category, and market-rate fields untouched", (): void => {
    const result = transformFromSupabase({
      id: "cat-1",
      user_id: null,
      is_system: true,
      preferred_language: "ar",
      gold_egp_per_gram: 4100,
    });

    expect(result).toMatchObject({
      id: "cat-1",
      user_id: null,
      is_system: true,
      preferred_language: "ar",
      gold_egp_per_gram: 4100,
    });
  });

  it("keeps invalid date strings unchanged", (): void => {
    const result = transformFromSupabase({
      id: "bad-date",
      updated_at: "not-a-date",
    });

    expect(result.updated_at).toBe("not-a-date");
  });

  it("serializes Supabase JSONB fields into Watermelon string fields", (): void => {
    const result = transformFromSupabase({
      id: "profile-1",
      notification_settings: { sms: true },
      onboarding_flags: { cash_account_tooltip_dismissed: true },
      pause_intervals: [{ from: 100, to: 200 }],
    });

    expect(result.notification_settings).toBe(JSON.stringify({ sms: true }));
    expect(result.onboarding_flags).toBe(
      JSON.stringify({ cash_account_tooltip_dismissed: true })
    );
    expect(result.pause_intervals).toBe(
      JSON.stringify([{ from: 100, to: 200 }])
    );
  });

  it("keeps null JSONB fields unchanged for optional local columns", (): void => {
    const result = transformFromSupabase({
      id: "profile-1",
      notification_settings: null,
    });

    expect(result.notification_settings).toBeNull();
  });
});
