import { act, renderHook } from "@testing-library/react-native";
import type { Account } from "@monyvi/db";

import { useEditAccountForm } from "../../hooks/useEditAccountForm";

type TestCurrency = "EGP" | "USD";

interface UniquenessResult {
  readonly isUnique: boolean;
  readonly error: string | null;
}

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}

const mockCheckAccountNameUniqueness = jest.fn<
  Promise<UniquenessResult>,
  [string, string, TestCurrency, string | undefined, string | null]
>();

jest.mock("i18next", () => ({
  t: (key: string): string => key,
}));

jest.mock("../../services/edit-account-service", () => ({
  checkAccountNameUniqueness: (
    userId: string,
    name: string,
    currency: TestCurrency,
    excludeAccountId?: string,
    institutionId?: string | null
  ): Promise<UniquenessResult> =>
    mockCheckAccountNameUniqueness(
      userId,
      name,
      currency,
      excludeAccountId,
      institutionId ?? null
    ),
}));

const baseAccountData = {
  id: "acc-1",
  userId: "user-1",
  name: "Cash",
  balance: 100,
  isDefault: false,
  type: "CASH",
  currency: "EGP",
  institutionId: undefined,
  providerDisplayName: undefined,
};

const baseAccount = baseAccountData as Account;

type AccountOverrides = Omit<
  Partial<Account>,
  "institutionId" | "providerDisplayName"
> & {
  readonly institutionId?: string | null;
  readonly providerDisplayName?: string | null;
};

function createAccount(overrides: AccountOverrides = {}): Account {
  const accountData = {
    ...baseAccount,
    ...overrides,
  };

  return accountData as Account;
}

function createDeferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flushAct(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockCheckAccountNameUniqueness.mockResolvedValue({
    isUnique: true,
    error: null,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useEditAccountForm", () => {
  it("blocks save immediately while the debounced uniqueness check is pending", async () => {
    const { result } = renderHook(() => useEditAccountForm(baseAccount, null));

    act(() => {
      result.current.updateField("name", "Cash Plus");
    });

    expect(result.current.isCheckingUniqueness).toBe(true);
    expect(mockCheckAccountNameUniqueness).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(result.current.isCheckingUniqueness).toBe(false);
    expect(mockCheckAccountNameUniqueness).toHaveBeenCalledTimes(1);
  });

  it("coalesces rapid name edits into one uniqueness query", async () => {
    const { result } = renderHook(() => useEditAccountForm(baseAccount, null));

    act(() => {
      result.current.updateField("name", "C");
      result.current.updateField("name", "Ca");
      result.current.updateField("name", "Cas");
      result.current.updateField("name", "Cash Plus");
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockCheckAccountNameUniqueness).toHaveBeenCalledTimes(1);
    expect(mockCheckAccountNameUniqueness).toHaveBeenCalledWith(
      "user-1",
      "Cash Plus",
      "EGP",
      "acc-1",
      null
    );
  });

  it("ignores stale uniqueness results after the provider identity changes", async () => {
    const firstCheck = createDeferred<UniquenessResult>();
    const secondCheck = createDeferred<UniquenessResult>();
    mockCheckAccountNameUniqueness
      .mockReturnValueOnce(firstCheck.promise)
      .mockReturnValueOnce(secondCheck.promise);

    const bankAccount = createAccount({ type: "BANK" });
    const { result } = renderHook(() => useEditAccountForm(bankAccount, null));

    act(() => {
      result.current.updateField("name", "Main");
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockCheckAccountNameUniqueness).toHaveBeenCalledWith(
      "user-1",
      "Main",
      "EGP",
      "acc-1",
      null
    );

    act(() => {
      result.current.selectKnownInstitution("cib");
    });

    await act(async () => {
      firstCheck.resolve({ isUnique: false, error: null });
      await Promise.resolve();
    });

    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.isCheckingUniqueness).toBe(true);

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockCheckAccountNameUniqueness).toHaveBeenLastCalledWith(
      "user-1",
      "Main",
      "EGP",
      "acc-1",
      "cib"
    );

    await act(async () => {
      secondCheck.resolve({ isUnique: true, error: null });
      await Promise.resolve();
    });

    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.isCheckingUniqueness).toBe(false);
  });

  it("keeps account type immutable in the edit form data", () => {
    const bankAccount = createAccount({ type: "BANK" });
    const { result } = renderHook(() => useEditAccountForm(bankAccount, null));

    expect(result.current.accountType).toBe("BANK");
    expect("accountType" in result.current.formData).toBe(false);
  });

  it("loads known provider identity and sender names with null-safe IDs", () => {
    const bankAccount = createAccount({
      type: "BANK",
      institutionId: "cib",
      providerDisplayName: "CIB",
    });

    const { result } = renderHook(() =>
      useEditAccountForm(bankAccount, {
        bankName: "CIB",
        cardLast4: "1234",
        smsSenderNames: ["CIB", "CIBEGYPT"],
      })
    );

    expect(result.current.formData.institutionId).toBe("cib");
    expect(result.current.formData.providerDisplayName).toBe("CIB");
    expect(result.current.formData.senderNames).toEqual(["CIB", "CIBEGYPT"]);
  });

  it("can replace the known provider and mirror sender chips to the legacy text field", async () => {
    const bankAccount = createAccount({ type: "BANK" });
    const { result } = renderHook(() => useEditAccountForm(bankAccount, null));

    act(() => {
      result.current.selectKnownInstitution("cib");
    });

    expect(result.current.formData.institutionId).toBe("cib");
    expect(result.current.formData.providerDisplayName).toBe("CIB");
    expect(result.current.formData.senderNames).toEqual(
      expect.arrayContaining(["cib", "cibank", "cibegypt"])
    );

    act(() => {
      result.current.updateSenderNames(["CIB", "CIBEGYPT"]);
    });

    expect(result.current.formData.smsSenderName).toBe("CIB, CIBEGYPT");

    await flushAct();
  });

  it("marks the form dirty when all sender names are removed", () => {
    const walletAccount = createAccount({
      type: "DIGITAL_WALLET",
      institutionId: null,
      providerDisplayName: "QA Wallet",
    });
    const { result } = renderHook(() =>
      useEditAccountForm(walletAccount, {
        bankName: "",
        cardLast4: "",
        smsSenderNames: ["QAWALLET027"],
      })
    );

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.updateSenderNames([]);
    });

    expect(result.current.formData.senderNames).toEqual([]);
    expect(result.current.formData.smsSenderName).toBe("");
    expect(result.current.isDirty).toBe(true);
    expect(result.current.isValid).toBe(true);
  });
});
