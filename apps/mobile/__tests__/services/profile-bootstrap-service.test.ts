const mockGetCurrentUserId = jest.fn<Promise<string | null>, []>();
const mockFrom = jest.fn();
const mockApplyRemoteChangeSetWithoutCursor = jest.fn<
  Promise<void>,
  [unknown, unknown]
>();
const mockSyncDatabase = jest.fn();
const mockWhere = jest.fn((column: string, value: unknown) => ({
  column,
  value,
}));
const mockNotEq = jest.fn((value: unknown) => ({ notEq: value }));

jest.mock("@/services/supabase", () => ({
  getCurrentUserId: (): Promise<string | null> => mockGetCurrentUserId(),
  supabase: {
    from: (table: string): unknown => mockFrom(table),
  },
}));

jest.mock("@/services/remote-apply-service", () => ({
  applyRemoteChangeSetWithoutCursor: (
    database: unknown,
    changes: unknown
  ): Promise<void> => mockApplyRemoteChangeSetWithoutCursor(database, changes),
}));

jest.mock("@/services/sync", () => ({
  syncDatabase: (...args: unknown[]): Promise<unknown> =>
    mockSyncDatabase(...args) as Promise<unknown>,
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: (column: string, value: unknown): unknown =>
      mockWhere(column, value),
    notEq: (value: unknown): unknown => mockNotEq(value),
  },
}));

import { bootstrapCurrentProfile } from "@/services/profile-bootstrap-service";

interface ProfileQueryMock {
  readonly select: jest.Mock<ProfileQueryMock, [string]>;
  readonly eq: jest.Mock<ProfileQueryMock, [string, string]>;
  readonly maybeSingle: jest.Mock<
    Promise<{
      readonly data: Record<string, unknown> | null;
      readonly error: Error | null;
    }>,
    []
  >;
}

function createProfileQuery(
  row: Record<string, unknown> | null,
  error: Error | null = null
): ProfileQueryMock {
  const query: ProfileQueryMock = {
    select: jest.fn<ProfileQueryMock, [string]>(() => query),
    eq: jest.fn<ProfileQueryMock, [string, string]>(() => query),
    maybeSingle: jest.fn(() => Promise.resolve({ data: row, error })),
  };
  return query;
}

describe("bootstrapCurrentProfile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockApplyRemoteChangeSetWithoutCursor.mockResolvedValue(undefined);
    mockSyncDatabase.mockResolvedValue(undefined);
  });

  it("fetches and applies only the current user's onboarded remote profile", async (): Promise<void> => {
    const remoteProfile = {
      id: "profile-1",
      user_id: "user-1",
      onboarding_completed: true,
      preferred_language: "ar",
      preferred_currency: "USD",
      onboarding_flags: { setup_guide_dismissed: true },
      notification_settings: { sms: false },
      deleted: false,
      created_at: "2026-05-06T09:00:00.000Z",
      updated_at: "2026-05-06T10:00:00.000Z",
    };
    const profileQuery = createProfileQuery(remoteProfile);
    mockFrom.mockReturnValue(profileQuery);
    const database = createDatabaseWithForeignProfiles([]);

    const result = await bootstrapCurrentProfile(database as never, {
      timeoutMs: 10_000,
    });

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(profileQuery.select).toHaveBeenCalledWith("*");
    expect(profileQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(mockApplyRemoteChangeSetWithoutCursor).toHaveBeenCalledWith(
      database,
      {
        profiles: {
          created: [],
          updated: [
            expect.objectContaining({
              id: "profile-1",
              user_id: "user-1",
              onboarding_completed: true,
              preferred_language: "ar",
              onboarding_flags: JSON.stringify({
                setup_guide_dismissed: true,
              }),
              notification_settings: JSON.stringify({ sms: false }),
              updated_at: new Date("2026-05-06T10:00:00.000Z").getTime(),
            }),
          ],
          deleted: [],
        },
      }
    );
    expect(result).toEqual({
      status: "ready-remote-profile",
      reason: "remote-profile-applied",
      routeBasis: "remote-profile",
    });
  });

  it("uses the provided authenticated user id without a second auth lookup", async (): Promise<void> => {
    const profileQuery = createProfileQuery({
      id: "profile-1",
      user_id: "auth-user-1",
      onboarding_completed: true,
      deleted: false,
    });
    mockFrom.mockReturnValue(profileQuery);
    const database = createDatabaseWithForeignProfiles([]);

    await bootstrapCurrentProfile(database as never, {
      timeoutMs: 10_000,
      userId: "auth-user-1",
    });

    expect(mockGetCurrentUserId).not.toHaveBeenCalled();
    expect(profileQuery.eq).toHaveBeenCalledWith("user_id", "auth-user-1");
  });

  it("purges foreign local profiles before applying the remote profile", async (): Promise<void> => {
    const foreignProfile = {
      destroyPermanently: jest.fn().mockResolvedValue(undefined),
    };
    const profileQuery = createProfileQuery({
      id: "profile-1",
      user_id: "user-1",
      onboarding_completed: true,
      deleted: false,
    });
    mockFrom.mockReturnValue(profileQuery);
    const database = createDatabaseWithForeignProfiles([foreignProfile]);

    await bootstrapCurrentProfile(database as never, { timeoutMs: 10_000 });

    expect(mockWhere).toHaveBeenCalledWith("user_id", { notEq: "user-1" });
    expect(foreignProfile.destroyPermanently).toHaveBeenCalledTimes(1);
  });

  it("does not invoke the full sync path during profile bootstrap", async (): Promise<void> => {
    const profileQuery = createProfileQuery({
      id: "profile-1",
      user_id: "user-1",
      onboarding_completed: true,
      deleted: false,
    });
    mockFrom.mockReturnValue(profileQuery);
    const database = createDatabaseWithForeignProfiles([]);

    await bootstrapCurrentProfile(database as never, { timeoutMs: 10_000 });

    expect(mockSyncDatabase).not.toHaveBeenCalled();
  });

  it("returns remote-profile-unfinished for a verified current user who has not completed onboarding", async (): Promise<void> => {
    const profileQuery = createProfileQuery({
      id: "profile-1",
      user_id: "user-1",
      onboarding_completed: false,
      deleted: false,
    });
    mockFrom.mockReturnValue(profileQuery);
    const database = createDatabaseWithForeignProfiles([]);

    const result = await bootstrapCurrentProfile(database as never, {
      timeoutMs: 10_000,
    });

    expect(result).toEqual({
      status: "ready-remote-profile",
      reason: "remote-profile-unfinished",
      routeBasis: "remote-profile",
    });
    expect(mockApplyRemoteChangeSetWithoutCursor).toHaveBeenCalledWith(
      database,
      expect.any(Object)
    );
    const appliedChanges = mockApplyRemoteChangeSetWithoutCursor.mock
      .calls[0]?.[1] as {
      readonly profiles?: {
        readonly updated?: ReadonlyArray<Record<string, unknown>>;
      };
    };
    expect(appliedChanges.profiles?.updated).toEqual([
      expect.objectContaining({
        onboarding_completed: false,
        user_id: "user-1",
      }),
    ]);
  });

  it("shows recovery when the remote profile query fails and no trusted local profile exists", async (): Promise<void> => {
    mockFrom.mockReturnValue(createProfileQuery(null, new Error("network")));
    const database = createDatabaseWithProfiles({
      foreignProfiles: [],
      currentProfiles: [],
    });

    const result = await bootstrapCurrentProfile(database as never, {
      timeoutMs: 10_000,
    });

    expect(result).toEqual({
      status: "needs-recovery",
      reason: "remote-profile-error",
      routeBasis: "none",
    });
  });

  it("shows recovery when the remote profile is missing", async (): Promise<void> => {
    mockFrom.mockReturnValue(createProfileQuery(null));
    const database = createDatabaseWithForeignProfiles([]);

    const result = await bootstrapCurrentProfile(database as never, {
      timeoutMs: 10_000,
    });

    expect(result).toEqual({
      status: "needs-recovery",
      reason: "remote-profile-missing",
      routeBasis: "none",
    });
  });

  it("shows recovery when the remote profile is deleted", async (): Promise<void> => {
    mockFrom.mockReturnValue(
      createProfileQuery({
        id: "profile-1",
        user_id: "user-1",
        onboarding_completed: true,
        deleted: true,
      })
    );
    const database = createDatabaseWithForeignProfiles([]);

    const result = await bootstrapCurrentProfile(database as never, {
      timeoutMs: 10_000,
    });

    expect(result).toEqual({
      status: "needs-recovery",
      reason: "remote-profile-deleted",
      routeBasis: "none",
    });
  });

  it("shows timeout recovery when remote profile verification hangs", async (): Promise<void> => {
    jest.useFakeTimers();
    const profileQuery: ProfileQueryMock = {
      select: jest.fn<ProfileQueryMock, [string]>(() => profileQuery),
      eq: jest.fn<ProfileQueryMock, [string, string]>(() => profileQuery),
      maybeSingle: jest.fn(() => new Promise(() => {})),
    };
    mockFrom.mockReturnValue(profileQuery);
    const database = createDatabaseWithProfiles({
      foreignProfiles: [],
      currentProfiles: [],
    });

    const resultPromise = bootstrapCurrentProfile(database as never, {
      timeoutMs: 10_000,
    });
    await jest.advanceTimersByTimeAsync(10_000);

    await expect(resultPromise).resolves.toEqual({
      status: "needs-recovery",
      reason: "remote-profile-timeout",
      routeBasis: "none",
    });
    jest.useRealTimers();
  });

  it("routes from a trusted local onboarded profile when remote verification fails", async (): Promise<void> => {
    mockFrom.mockReturnValue(createProfileQuery(null, new Error("offline")));
    const database = createDatabaseWithProfiles({
      foreignProfiles: [],
      currentProfiles: [
        {
          userId: "user-1",
          deleted: false,
          onboardingCompleted: true,
        },
      ],
    });

    const result = await bootstrapCurrentProfile(database as never, {
      timeoutMs: 10_000,
    });

    expect(result).toEqual({
      status: "ready-local-trusted",
      reason: "trusted-local-onboarded-profile",
      routeBasis: "trusted-local-profile",
    });
  });

  it("rejects an unsafe local unfinished profile when remote verification fails", async (): Promise<void> => {
    mockFrom.mockReturnValue(createProfileQuery(null, new Error("offline")));
    const database = createDatabaseWithProfiles({
      foreignProfiles: [],
      currentProfiles: [
        {
          userId: "user-1",
          deleted: false,
          onboardingCompleted: false,
        },
      ],
    });

    const result = await bootstrapCurrentProfile(database as never, {
      timeoutMs: 10_000,
    });

    expect(result).toEqual({
      status: "needs-recovery",
      reason: "local-profile-unfinished",
      routeBasis: "none",
    });
  });

  it("purges foreign local profiles before evaluating trusted local fallback", async (): Promise<void> => {
    mockFrom.mockReturnValue(createProfileQuery(null, new Error("offline")));
    const foreignProfile = {
      destroyPermanently: jest.fn().mockResolvedValue(undefined),
    };
    const database = createDatabaseWithProfiles({
      foreignProfiles: [foreignProfile],
      currentProfiles: [],
    });

    const result = await bootstrapCurrentProfile(database as never, {
      timeoutMs: 10_000,
    });

    expect(foreignProfile.destroyPermanently).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "needs-recovery",
      reason: "remote-profile-error",
      routeBasis: "none",
    });
  });
});

function createDatabaseWithForeignProfiles(
  foreignProfiles: ReadonlyArray<{ readonly destroyPermanently: jest.Mock }>
): {
  readonly get: jest.Mock;
  readonly write: jest.Mock;
} {
  return createDatabaseWithProfiles({ foreignProfiles, currentProfiles: [] });
}

function createDatabaseWithProfiles({
  foreignProfiles,
  currentProfiles,
}: {
  readonly foreignProfiles: ReadonlyArray<{
    readonly destroyPermanently: jest.Mock;
  }>;
  readonly currentProfiles: ReadonlyArray<{
    readonly userId: string;
    readonly deleted: boolean;
    readonly onboardingCompleted: boolean;
  }>;
}): {
  readonly get: jest.Mock;
  readonly write: jest.Mock;
} {
  const fetch = jest.fn(() => Promise.resolve(foreignProfiles));
  const fetchCurrent = jest.fn(() => Promise.resolve(currentProfiles));
  const query = jest.fn((...clauses: unknown[]) => {
    const payload = JSON.stringify(clauses);
    return { fetch: payload.includes("notEq") ? fetch : fetchCurrent };
  });
  return {
    get: jest.fn(() => ({ query })),
    write: jest.fn((writer: () => Promise<void>) => writer()),
  };
}
