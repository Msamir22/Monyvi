/**
 * user-data-access.test.ts
 *
 * Tests for the runtime user-scoped data guard used as defense-in-depth
 * around local WatermelonDB reads and writes.
 */

import { Q } from "@nozbe/watermelondb";

interface MockUserOwnedRecord {
  readonly id: string;
  readonly userId: string;
}

interface MockCategoryRecord {
  readonly id: string;
  readonly userId?: string | null;
}

interface MockChildRecord {
  readonly id: string;
  readonly accountId: string;
}

interface MockCollection<T> {
  readonly find: jest.Mock<Promise<T>, [string]>;
}

const mockGetCurrentUserId = jest.fn<Promise<string | null>, []>();
const mockWhere = jest.fn((column: string, value: unknown) => ({
  column,
  value,
}));
const mockOr = jest.fn((...clauses: unknown[]) => ({ or: clauses }));
const mockAnd = jest.fn((...clauses: unknown[]) => ({ and: clauses }));

jest.mock("@/services/supabase", () => ({
  getCurrentUserId: (): Promise<string | null> => mockGetCurrentUserId(),
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: (column: string, value: unknown): unknown =>
      mockWhere(column, value),
    or: (...clauses: unknown[]): unknown => mockOr(...clauses),
    and: (...clauses: unknown[]): unknown => mockAnd(...clauses),
  },
}));

import {
  USER_DATA_ACCESS_ERROR_CODES,
  assertAccessibleCategory,
  assertChildRecordParentOwned,
  assertOwnedRecord,
  findOwnedById,
  getRequiredCurrentUserId,
  queryAccessibleCategories,
  queryOwned,
} from "@/services/user-data-access";

describe("user-data-access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fails closed when no authenticated user exists", async () => {
    mockGetCurrentUserId.mockResolvedValueOnce(null);

    await expect(getRequiredCurrentUserId()).rejects.toThrow(
      USER_DATA_ACCESS_ERROR_CODES.USER_REQUIRED
    );
  });

  it("allows owned records", () => {
    const record: MockUserOwnedRecord = { id: "acc-1", userId: "user-1" };

    expect(assertOwnedRecord(record, "user-1")).toBe(record);
  });

  it("denies foreign user-owned records", () => {
    const record: MockUserOwnedRecord = { id: "acc-1", userId: "owner-user" };

    expect(() => assertOwnedRecord(record, "attacker-user")).toThrow(
      USER_DATA_ACCESS_ERROR_CODES.OWNERSHIP_FAILED
    );
  });

  it("loads by id and denies foreign records", async () => {
    const collection: MockCollection<MockUserOwnedRecord> = {
      find: jest.fn((_id: string) =>
        Promise.resolve({ id: "acc-1", userId: "owner-user" })
      ),
    };

    await expect(
      findOwnedById(collection, "acc-1", "attacker-user")
    ).rejects.toThrow(USER_DATA_ACCESS_ERROR_CODES.OWNERSHIP_FAILED);
  });

  it("allows system categories for any signed-in user", () => {
    const systemCategory: MockCategoryRecord = {
      id: "cat-system",
      userId: null,
    };

    expect(assertAccessibleCategory(systemCategory, "user-1")).toBe(
      systemCategory
    );
  });

  it("denies foreign custom categories", () => {
    const customCategory: MockCategoryRecord = {
      id: "cat-custom",
      userId: "owner-user",
    };

    expect(() =>
      assertAccessibleCategory(customCategory, "attacker-user")
    ).toThrow(USER_DATA_ACCESS_ERROR_CODES.OWNERSHIP_FAILED);
  });

  it("allows child records only when their parent is owned", async () => {
    const child: MockChildRecord = { id: "bd-1", accountId: "acc-1" };
    const parents: MockCollection<MockUserOwnedRecord> = {
      find: jest.fn((_id: string) =>
        Promise.resolve({ id: "acc-1", userId: "user-1" })
      ),
    };

    await expect(
      assertChildRecordParentOwned(child, parents, "accountId", "user-1")
    ).resolves.toBe(child);
  });

  it("denies child records when their parent is foreign", async () => {
    const child: MockChildRecord = { id: "bd-1", accountId: "acc-1" };
    const parents: MockCollection<MockUserOwnedRecord> = {
      find: jest.fn((_id: string) =>
        Promise.resolve({ id: "acc-1", userId: "owner-user" })
      ),
    };

    await expect(
      assertChildRecordParentOwned(child, parents, "accountId", "attacker-user")
    ).rejects.toThrow(USER_DATA_ACCESS_ERROR_CODES.OWNERSHIP_FAILED);
  });

  it("builds current-user-owned queries with user_id scope first", () => {
    const query = jest.fn((...clauses: unknown[]) => ({ clauses }));
    const collection = { query };
    const deletedClause = Q.where("deleted", false);

    queryOwned(collection as never, "user-1", deletedClause);

    expect(query).toHaveBeenCalledWith(
      { column: "user_id", value: "user-1" },
      { column: "deleted", value: false }
    );
  });

  it("builds category queries for ownerless system and current-user custom rows", () => {
    const query = jest.fn((...clauses: unknown[]) => ({ clauses }));
    const collection = { query };

    queryAccessibleCategories(collection as never, "user-1");

    expect(query).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(query.mock.calls[0])).toContain("user-1");
    expect(JSON.stringify(query.mock.calls[0])).toContain("is_system");
    expect(JSON.stringify(query.mock.calls[0])).toContain("user_id");
  });
});
