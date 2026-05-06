/**
 * sync.test.ts
 *
 * Focused regression tests for sync privacy boundaries.
 */

const mockSynchronize = jest.fn();
const mockGetCurrentUserId = jest.fn<Promise<string | null>, []>();
const mockFrom = jest.fn();
const mockWhere = jest.fn((column: string, value: unknown) => ({
  column,
  value,
}));
const mockNotEq = jest.fn((value: unknown) => ({ notEq: value }));

jest.mock("@nozbe/watermelondb/sync", () => ({
  synchronize: (...args: unknown[]): Promise<void> =>
    mockSynchronize(...args) as Promise<void>,
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: (column: string, value: unknown): unknown =>
      mockWhere(column, value),
    notEq: (value: unknown): unknown => mockNotEq(value),
  },
}));

jest.mock("@monyvi/db", () => ({
  schema: {
    tables: {
      accounts: {},
      budgets: {},
      profiles: {},
    },
  },
  Profile: {},
}));

jest.mock("@/services/supabase", () => ({
  getCurrentUserId: (): Promise<string | null> => mockGetCurrentUserId(),
  supabase: {
    from: (table: string): unknown => mockFrom(table),
  },
}));

import { syncDatabase } from "@/services/sync";

describe("syncDatabase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue("user-1");
    mockSynchronize.mockResolvedValue(undefined);
  });

  it("purges locally cached profiles that do not belong to the authenticated user before synchronizing", async (): Promise<void> => {
    const foreignProfile = {
      destroyPermanently: jest.fn().mockResolvedValue(undefined),
    };
    const mockFetch = jest.fn().mockResolvedValue([foreignProfile]);
    const mockQuery = jest.fn(() => ({ fetch: mockFetch }));
    const mockWrite = jest.fn((fn: () => Promise<void>) => fn());
    const database = {
      get: jest.fn(() => ({ query: mockQuery })),
      write: mockWrite,
    };

    await syncDatabase(database as never, true);

    expect(mockWhere).toHaveBeenCalledWith("user_id", { notEq: "user-1" });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockWrite).toHaveBeenCalledTimes(1);
    expect(foreignProfile.destroyPermanently).toHaveBeenCalledTimes(1);
    expect(mockSynchronize).toHaveBeenCalledTimes(1);
  });

  it("normalizes profile JSON fields before pushing updates to Supabase", async (): Promise<void> => {
    const insert = jest
      .fn<
        Promise<{ readonly error: null }>,
        [ReadonlyArray<Record<string, unknown>>]
      >()
      .mockResolvedValue({ error: null });
    const upsert = jest
      .fn<
        Promise<{ readonly error: null }>,
        [Record<string, unknown>, { readonly onConflict: string }]
      >()
      .mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert, upsert });
    mockSynchronize.mockImplementationOnce(
      async (config: {
        readonly pushChanges: (args: {
          readonly changes: Record<string, unknown>;
          readonly lastPulledAt: number;
        }) => Promise<void>;
      }): Promise<void> => {
        await config.pushChanges({
          lastPulledAt: 0,
          changes: {
            accounts: {
              created: [
                {
                  id: "account-1",
                  name: "Cash",
                  balance: 0,
                  created_at: 1_778_000_000_000,
                  updated_at: 1_778_000_001_000,
                  _status: "created",
                  _changed: "",
                },
              ],
              updated: [],
              deleted: [],
            },
            profiles: {
              created: [],
              updated: [
                {
                  id: "profile-1",
                  user_id: "user-1",
                  onboarding_flags: null,
                  notification_settings: '{"sms":true}',
                  onboarding_completed: true,
                  created_at: 1_778_000_000_000,
                  updated_at: 1_778_000_001_000,
                  _status: "updated",
                  _changed: "onboarding_completed",
                },
              ],
              deleted: [],
            },
          },
        });
      }
    );
    const database = createDatabase();

    await syncDatabase(database as never, true);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        onboarding_flags: {},
        notification_settings: { sms: true },
        created_at: new Date(1_778_000_000_000).toISOString(),
        updated_at: new Date(1_778_000_001_000).toISOString(),
      }),
      { onConflict: "id" }
    );
    const upsertPayload = upsert.mock.calls[0]?.[0];
    const insertPayload = insert.mock.calls[0]?.[0];
    const firstInsertedRecord = insertPayload?.[0];
    expect(upsertPayload).not.toHaveProperty("pause_intervals");
    expect(firstInsertedRecord).not.toHaveProperty("onboarding_flags");
  });
});

function createDatabase(): {
  readonly get: jest.Mock;
  readonly write: jest.Mock;
} {
  const fetch = jest.fn().mockResolvedValue([]);
  return {
    get: jest.fn(() => ({ query: jest.fn(() => ({ fetch })) })),
    write: jest.fn((writer: () => Promise<void>) => writer()),
  };
}
