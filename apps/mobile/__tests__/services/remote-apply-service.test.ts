const mockApplyRemoteChanges = jest.fn<Promise<void>, [unknown, unknown]>();
const mockSetLastPulledAt = jest.fn<Promise<void>, [unknown, number]>();

jest.mock("@nozbe/watermelondb/sync/impl/applyRemote", () => ({
  __esModule: true,
  default: (changes: unknown, opts: unknown): Promise<void> =>
    mockApplyRemoteChanges(changes, opts),
}));

jest.mock("@nozbe/watermelondb/sync/impl", () => ({
  setLastPulledAt: (database: unknown, timestamp: number): Promise<void> =>
    mockSetLastPulledAt(database, timestamp),
}));

import { applyRemoteChangeSetWithoutCursor } from "@/services/remote-apply-service";

describe("applyRemoteChangeSetWithoutCursor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApplyRemoteChanges.mockResolvedValue(undefined);
    mockSetLastPulledAt.mockResolvedValue(undefined);
  });

  it("applies remote changes without advancing the WatermelonDB sync cursor", async (): Promise<void> => {
    const database = {
      id: "db",
      write: jest.fn(async (writer: () => Promise<void>) => writer()),
    };
    const changes = {
      profiles: {
        created: [],
        updated: [{ id: "profile-1", user_id: "user-1" }],
        deleted: [],
      },
    };

    await applyRemoteChangeSetWithoutCursor(
      database as never,
      changes as never
    );

    expect(database.write).toHaveBeenCalledTimes(1);
    expect(mockApplyRemoteChanges).toHaveBeenCalledWith(changes, {
      db: database,
      sendCreatedAsUpdated: true,
    });
    expect(mockSetLastPulledAt).not.toHaveBeenCalled();
  });
});
