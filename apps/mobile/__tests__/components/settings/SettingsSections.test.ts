import { getSmsSyncDescription } from "@/components/settings/SettingsSections";

const t = jest.fn((key: string, opts?: Record<string, unknown>): string => {
  const date = typeof opts?.date === "string" ? opts.date : null;
  return date ? `${key}:${date}` : key;
});

describe("SettingsSections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("falls back to scan prompt when last sync timestamp is invalid", () => {
    expect(
      getSmsSyncDescription(t, {
        hasSynced: true,
        lastSyncTimestamp: Number.NaN,
        smsPermissionStatus: "granted",
      })
    ).toBe("scan_inbox");
  });

  it("falls back to permission prompt when timestamp is invalid and SMS permission is missing", () => {
    expect(
      getSmsSyncDescription(t, {
        hasSynced: true,
        lastSyncTimestamp: Number.NaN,
        smsPermissionStatus: "denied",
      })
    ).toBe("grant_sms_permission");
  });
});
