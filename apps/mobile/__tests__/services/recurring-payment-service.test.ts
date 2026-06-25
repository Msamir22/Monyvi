const mockWrite = jest.fn();
const mockGet = jest.fn();
const mockCreateRecurringPayment = jest.fn();
const mockFindOwned = jest.fn();
const mockFindAccessibleCategory = jest.fn();
const mockGetCurrentUserDataScope = jest.fn();

interface MockRecurringPaymentRecord {
  readonly id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  type: string;
  accountId: string;
  categoryId: string;
  frequency: string;
  startDate: Date;
  nextDueDate: Date;
  action: string;
  status: string;
  deleted: boolean;
  notes?: string;
  update: jest.Mock<
    Promise<void>,
    [(record: MockRecurringPaymentRecord) => void]
  >;
}

interface MockCollection {
  readonly create?: typeof mockCreateRecurringPayment;
  readonly find?: jest.Mock;
}

interface MockUserDataScope {
  readonly userId: string;
  readonly findOwned: typeof mockFindOwned;
  readonly findAccessibleCategory: typeof mockFindAccessibleCategory;
}

function createRecurringRecord(
  overrides: Partial<MockRecurringPaymentRecord> = {}
): MockRecurringPaymentRecord {
  const record: MockRecurringPaymentRecord = {
    id: "payment-1",
    userId: "user-1",
    name: "Netflix",
    amount: 250,
    currency: "EGP",
    type: "EXPENSE",
    accountId: "account-1",
    categoryId: "category-1",
    frequency: "MONTHLY",
    startDate: new Date("2026-06-01T00:00:00.000Z"),
    nextDueDate: new Date("2026-07-01T00:00:00.000Z"),
    action: "NOTIFY",
    status: "ACTIVE",
    deleted: false,
    notes: "streaming",
    update: jest.fn(
      (builder: (draft: MockRecurringPaymentRecord) => void): Promise<void> => {
        builder(record);
        return Promise.resolve();
      }
    ),
    ...overrides,
  };

  return record;
}

jest.mock("@monyvi/db", () => ({
  database: {
    write: (...args: readonly unknown[]): Promise<unknown> =>
      mockWrite(...args) as Promise<unknown>,
    get: (tableName: string): MockCollection =>
      mockGet(tableName) as MockCollection,
  },
}));

jest.mock("@/services/user-data-access", () => ({
  getCurrentUserDataScope: (): Promise<MockUserDataScope> =>
    mockGetCurrentUserDataScope() as Promise<MockUserDataScope>,
}));

jest.mock("@/utils/dateHelpers", () => ({
  calculateNextDueDate: (): Date => new Date("2026-08-01T00:00:00.000Z"),
  getNextMonthSameDay: (): Date => new Date("2026-07-01T00:00:00.000Z"),
}));

jest.mock("@/services/transaction-service", () => ({
  createTransaction: jest.fn(),
}));

import {
  createRecurringPayment,
  deleteRecurringPayment,
  pauseRecurringPayment,
  resumeRecurringPayment,
  updateRecurringPayment,
} from "@/services/recurring-payment-service";

describe("recurring-payment-service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWrite.mockImplementation(
      async (callback: () => Promise<unknown>): Promise<unknown> => callback()
    );
    mockCreateRecurringPayment.mockImplementation(
      (
        builder: (record: Partial<MockRecurringPaymentRecord>) => void
      ): Promise<Partial<MockRecurringPaymentRecord>> => {
        const record: Partial<MockRecurringPaymentRecord> = {};
        builder(record);
        return Promise.resolve(record);
      }
    );
    mockGet.mockImplementation((tableName: string): MockCollection => {
      if (tableName === "recurring_payments") {
        return { create: mockCreateRecurringPayment };
      }

      return {};
    });
    mockFindOwned.mockImplementation(
      (_collection: MockCollection, id: string): Promise<unknown> => {
        if (id === "account-1") {
          return Promise.resolve({ id, userId: "user-1", currency: "EGP" });
        }

        return Promise.resolve(createRecurringRecord({ id }));
      }
    );
    mockFindAccessibleCategory.mockResolvedValue({
      id: "category-1",
      userId: null,
    });
    mockGetCurrentUserDataScope.mockResolvedValue({
      userId: "user-1",
      findOwned: mockFindOwned,
      findAccessibleCategory: mockFindAccessibleCategory,
    });
  });

  it("resolves account and category scope before creating a recurring payment", async () => {
    const result = await createRecurringPayment({
      name: "Netflix",
      amount: 250,
      currency: "EGP",
      type: "EXPENSE",
      accountId: "account-1",
      categoryId: "category-1",
      frequency: "MONTHLY",
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      action: "NOTIFY",
      notes: "streaming",
    });

    expect(mockFindOwned).toHaveBeenCalledWith(expect.anything(), "account-1");
    expect(mockFindAccessibleCategory).toHaveBeenCalledWith(
      expect.anything(),
      "category-1"
    );
    expect(result).toMatchObject({
      userId: "user-1",
      name: "Netflix",
      amount: 250,
      currency: "EGP",
      status: "ACTIVE",
      deleted: false,
    });
  });

  it("updates editable fields on an owned recurring payment", async () => {
    const payment = createRecurringRecord();
    mockFindOwned.mockImplementation(
      (_collection: MockCollection, id: string): Promise<unknown> => {
        if (id === "account-1") {
          return Promise.resolve({ id, userId: "user-1", currency: "EGP" });
        }

        return Promise.resolve(payment);
      }
    );

    await updateRecurringPayment("payment-1", {
      name: "Gym",
      amount: 450,
      currency: "EGP",
      type: "EXPENSE",
      accountId: "account-1",
      categoryId: "category-1",
      frequency: "WEEKLY",
      startDate: new Date("2026-06-15T00:00:00.000Z"),
      action: "AUTO_CREATE",
      notes: undefined,
    });

    expect(payment.update).toHaveBeenCalledTimes(1);
    expect(payment).toMatchObject({
      name: "Gym",
      amount: 450,
      frequency: "WEEKLY",
      action: "AUTO_CREATE",
      notes: undefined,
    });
  });

  it("pauses, resumes, and soft-deletes an owned recurring payment", async () => {
    const payment = createRecurringRecord();
    mockFindOwned.mockResolvedValue(payment);

    await pauseRecurringPayment("payment-1");
    expect(payment.status).toBe("PAUSED");

    await resumeRecurringPayment("payment-1");
    expect(payment.status).toBe("ACTIVE");

    await deleteRecurringPayment("payment-1");
    expect(payment.deleted).toBe(true);
  });
});
