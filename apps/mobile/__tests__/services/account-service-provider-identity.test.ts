/**
 * Focused coverage for create-account duplicate identity rules.
 *
 * Account identity is name + currency plus provider identity:
 * institution_id for known providers, normalized provider_display_name for
 * manual providers, and no provider token when neither exists.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import {
  CREATE_ACCOUNT_ERROR_CODES,
  createAccountForUser,
} from "@/services/account-service";

const mockDatabaseGet = jest.fn();
const mockDatabaseWrite = jest.fn();

jest.mock("@monyvi/db", () => ({
  database: {
    get: (collectionName: string): unknown => mockDatabaseGet(collectionName),
    write: (writer: () => Promise<void>): Promise<void> =>
      mockDatabaseWrite(writer) as Promise<void>,
  },
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    where: (..._args: unknown[]) => ({ _kind: "where", _args }),
    notEq: (v: unknown) => ({ _kind: "notEq", _v: v }),
  },
}));

jest.mock("@/utils/currency-detection", () => ({
  detectCurrencyFromTimezone: jest.fn(),
}));

jest.mock("@/utils/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock("@/services/supabase", () => ({
  getCurrentUserId: jest.fn(),
}));

jest.mock("@/services/intro-flag-service", () => ({
  readIntroLocaleOverride: jest.fn(),
}));

function setupCreateAccountCollections(
  existingAccounts: ReadonlyArray<Record<string, unknown>>
): {
  accountCreateCalls: Array<Record<string, unknown>>;
  accountsCollection: { readonly create: jest.Mock };
} {
  const accountCreateCalls: Array<Record<string, unknown>> = [];
  const accountsCollection = {
    query: jest.fn().mockReturnValue({
      fetch: jest.fn().mockResolvedValue(existingAccounts),
      fetchCount: jest.fn().mockResolvedValue(existingAccounts.length),
    }),
    create: jest.fn((writer: (acc: Record<string, unknown>) => void) => {
      const acc: Record<string, unknown> = {};
      writer(acc);
      accountCreateCalls.push({ ...acc });
      return { id: "created-account", ...acc };
    }),
  };
  const accountSmsSendersCollection = {
    create: jest.fn(),
  };
  const bankDetailsCollection = {
    create: jest.fn((writer: (details: Record<string, unknown>) => void) => {
      const details: Record<string, unknown> = {};
      writer(details);
      return { id: "bank-details-1", ...details };
    }),
  };

  mockDatabaseGet.mockImplementation((collectionName: string) => {
    if (collectionName === "accounts") return accountsCollection;
    if (collectionName === "account_sms_senders")
      return accountSmsSendersCollection;
    if (collectionName === "bank_details") return bankDetailsCollection;
    throw new Error(`Unexpected collection: ${collectionName}`);
  });

  return { accountCreateCalls, accountsCollection };
}

describe("createAccountForUser provider identity uniqueness", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDatabaseWrite.mockImplementation(async (writer: () => Promise<void>) =>
      writer()
    );
  });

  it("allows a manual provider account to share name and currency with a no-provider account", async () => {
    const { accountCreateCalls } = setupCreateAccountCollections([
      {
        id: "cash-1",
        name: "Main",
        type: "CASH",
        userId: "user-1",
        currency: "EGP",
        deleted: false,
        institutionId: undefined,
      },
    ]);

    const result = await createAccountForUser("user-1", {
      name: "Main",
      accountType: "BANK",
      currency: "EGP",
      balance: "0",
      institutionId: null,
      providerDisplayName: "Manual Bank",
      senderNames: [],
    });

    expect(result).toEqual({
      success: true,
      accountId: "created-account",
      created: true,
    });
    expect(accountCreateCalls[0]).toEqual(
      expect.objectContaining({
        name: "Main",
        providerDisplayName: "Manual Bank",
      })
    );
  });

  it("rejects a known wallet institution id when creating a bank account", async () => {
    const { accountsCollection } = setupCreateAccountCollections([]);

    const result = await createAccountForUser("user-1", {
      name: "Main",
      accountType: "BANK",
      currency: "EGP",
      balance: "0",
      institutionId: "vodafone-cash",
      providerDisplayName: "Vodafone Cash",
      senderNames: [],
    });

    expect(result).toEqual({
      success: false,
      error: CREATE_ACCOUNT_ERROR_CODES.VALIDATION_FAILED,
    });
    expect(accountsCollection.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate no-provider names by name and currency", async () => {
    const { accountsCollection } = setupCreateAccountCollections([
      {
        id: "existing-account",
        name: "Manual Bank",
        type: "CASH",
        userId: "user-1",
        currency: "EGP",
        deleted: false,
        institutionId: undefined,
        providerDisplayName: undefined,
      },
    ]);

    const result = await createAccountForUser("user-1", {
      name: "Manual Bank",
      accountType: "BANK",
      currency: "EGP",
      balance: "0",
      institutionId: null,
      providerDisplayName: "",
      senderNames: [],
    });

    expect(result).toEqual({
      success: false,
      error: CREATE_ACCOUNT_ERROR_CODES.DUPLICATE_ACCOUNT,
    });
    expect(accountsCollection.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate manual provider names case-insensitively after trimming", async () => {
    const { accountsCollection } = setupCreateAccountCollections([
      {
        id: "existing-account",
        name: "Main",
        type: "BANK",
        userId: "user-1",
        currency: "EGP",
        deleted: false,
        institutionId: undefined,
        providerDisplayName: "QA Bank",
      },
    ]);

    const result = await createAccountForUser("user-1", {
      name: " main ",
      accountType: "DIGITAL_WALLET",
      currency: "EGP",
      balance: "0",
      institutionId: null,
      providerDisplayName: " qa   bank ",
      senderNames: [],
    });

    expect(result).toEqual({
      success: false,
      error: CREATE_ACCOUNT_ERROR_CODES.DUPLICATE_ACCOUNT,
    });
    expect(accountsCollection.create).not.toHaveBeenCalled();
  });
});
