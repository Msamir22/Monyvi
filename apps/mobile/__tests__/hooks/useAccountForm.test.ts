import { act, renderHook, waitFor } from "@testing-library/react-native";

type TestCurrency = "EGP" | "USD";

interface UniquenessResult {
  readonly isUnique: boolean;
  readonly error: string | null;
}

let mockCurrentUserId: string | null = "user-1";
let mockIsResolvingUser = false;
const mockCheckAccountNameUniqueness = jest.fn<
  Promise<UniquenessResult>,
  [string, string, TestCurrency, string | undefined, string | null]
>();
let mockPreferredCurrency: TestCurrency = "EGP";

jest.mock("../../hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): {
    preferredCurrency: typeof mockPreferredCurrency;
  } => ({
    preferredCurrency: mockPreferredCurrency,
  }),
}));

jest.mock("../../hooks/useCurrentUser", () => ({
  useCurrentUser: (): {
    readonly userId: string | null;
    readonly isResolvingUser: boolean;
  } => ({
    userId: mockCurrentUserId,
    isResolvingUser: mockIsResolvingUser,
  }),
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

import { useAccountForm } from "../../hooks/useAccountForm";

interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
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
  jest.clearAllMocks();
  jest.useRealTimers();
  mockPreferredCurrency = "EGP";
  mockCurrentUserId = "user-1";
  mockIsResolvingUser = false;
  mockCheckAccountNameUniqueness.mockResolvedValue({
    isUnique: true,
    error: null,
  });
});

describe("useAccountForm", () => {
  it("initializes account balance to the visible default of zero", () => {
    const { result } = renderHook(() => useAccountForm());

    expect(result.current.formData.balance).toBe("0");
  });

  it("ignores stale uniqueness results after the account name changes", async () => {
    jest.useFakeTimers();
    const firstCheck = createDeferred<{ isUnique: boolean; error: null }>();
    const secondCheck = createDeferred<{ isUnique: boolean; error: null }>();
    mockCheckAccountNameUniqueness
      .mockReturnValueOnce(firstCheck.promise)
      .mockReturnValueOnce(secondCheck.promise);

    const { result } = renderHook(() => useAccountForm());

    await flushAct();

    act(() => {
      result.current.updateField("name", "Wallet");
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockCheckAccountNameUniqueness).toHaveBeenCalledWith(
      "user-1",
      "Wallet",
      "EGP",
      undefined,
      null
    );

    act(() => {
      result.current.updateField("name", "Savings");
    });

    await act(async () => {
      firstCheck.resolve({ isUnique: false, error: null });
      await Promise.resolve();
    });

    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.isCheckingUniqueness).toBe(true);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockCheckAccountNameUniqueness).toHaveBeenLastCalledWith(
      "user-1",
      "Savings",
      "EGP",
      undefined,
      null
    );

    await act(async () => {
      secondCheck.resolve({ isUnique: true, error: null });
      await Promise.resolve();
    });

    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.isCheckingUniqueness).toBe(false);
  });

  it("rechecks name uniqueness when untouched currency follows preferred currency", async () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(() => useAccountForm());

    await flushAct();

    act(() => {
      result.current.updateField("name", "Wallet");
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    await flushAct();

    expect(mockCheckAccountNameUniqueness).toHaveBeenCalledWith(
      "user-1",
      "Wallet",
      "EGP",
      undefined,
      null
    );

    mockPreferredCurrency = "USD";
    rerender({});

    await waitFor(() => {
      expect(result.current.formData.currency).toBe("USD");
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    await flushAct();

    expect(mockCheckAccountNameUniqueness).toHaveBeenLastCalledWith(
      "user-1",
      "Wallet",
      "USD",
      undefined,
      null
    );
  });

  it("selects a known provider with sender presets using null-safe identity", () => {
    const { result } = renderHook(() =>
      useAccountForm({ initialAccountType: "BANK" })
    );

    act(() => {
      result.current.selectKnownInstitution("cib");
    });

    expect(result.current.formData.institutionId).toBe("cib");
    expect(result.current.formData.providerDisplayName).toBe("CIB");
    expect(result.current.formData.senderNames).toEqual(
      expect.arrayContaining(["cib", "cibank", "cibegypt"])
    );
  });

  it("clears provider identity and senders when create flow switches between bank and wallet", () => {
    const { result } = renderHook(() =>
      useAccountForm({ initialAccountType: "BANK" })
    );

    act(() => {
      result.current.selectKnownInstitution("cib");
    });

    act(() => {
      result.current.updateField("accountType", "DIGITAL_WALLET");
    });

    expect(result.current.formData.accountType).toBe("DIGITAL_WALLET");
    expect(result.current.formData.institutionId).toBeNull();
    expect(result.current.formData.providerDisplayName).toBe("");
    expect(result.current.formData.senderNames).toEqual([]);
  });

  it("rechecks uniqueness against manual provider identity after account type changes", async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useAccountForm({ initialAccountType: "BANK" })
    );

    await flushAct();

    act(() => {
      result.current.updateField("name", "Main");
    });
    act(() => {
      result.current.selectKnownInstitution("cib");
    });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    await flushAct();

    act(() => {
      result.current.updateField("accountType", "DIGITAL_WALLET");
    });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    await flushAct();

    expect(mockCheckAccountNameUniqueness).toHaveBeenLastCalledWith(
      "user-1",
      "Main",
      "EGP",
      undefined,
      null
    );
  });

  it("clears provider identity and senders when create flow switches back to cash", () => {
    const { result } = renderHook(() =>
      useAccountForm({ initialAccountType: "BANK" })
    );

    act(() => {
      result.current.selectKnownInstitution("cib");
    });

    act(() => {
      result.current.updateField("accountType", "CASH");
    });

    expect(result.current.formData.accountType).toBe("CASH");
    expect(result.current.formData.institutionId).toBeNull();
    expect(result.current.formData.providerDisplayName).toBe("");
    expect(result.current.formData.senderNames).toEqual([]);
  });

  it("keeps sender arrays as the canonical value and mirrors the legacy text field", () => {
    const { result } = renderHook(() =>
      useAccountForm({ initialAccountType: "DIGITAL_WALLET" })
    );

    act(() => {
      result.current.updateSenderNames(["VFCash", "VodafoneCash"]);
    });

    expect(result.current.formData.senderNames).toEqual([
      "VFCash",
      "VodafoneCash",
    ]);
    expect(result.current.formData.smsSenderName).toBe("VFCash, VodafoneCash");
  });

  it("rechecks name uniqueness when the known provider identity changes", async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() =>
      useAccountForm({ initialAccountType: "BANK" })
    );

    await flushAct();

    act(() => {
      result.current.updateField("name", "Main");
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    await flushAct();

    act(() => {
      result.current.selectKnownInstitution("cib");
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    await flushAct();

    expect(mockCheckAccountNameUniqueness).toHaveBeenLastCalledWith(
      "user-1",
      "Main",
      "EGP",
      undefined,
      "cib"
    );
  });
});
