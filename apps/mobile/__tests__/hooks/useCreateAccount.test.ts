/**
 * useCreateAccount.test.ts
 *
 * Guards the create-account flow against rapid duplicate submits. The hook
 * must lock synchronously before any awaited auth/service work so repeated
 * presses cannot create duplicate local rows or trigger multiple navigations.
 */

import { act, renderHook } from "@testing-library/react-native";
import type { AccountFormData } from "../../validation/account-validation";

const mockCreateAccountForUser = jest.fn();
let mockCurrentUserId: string | null = "user-1";
let mockIsResolvingUser = false;
const mockShowToast = jest.fn();
const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();
const mockRouterCanGoBack = jest.fn();

jest.mock("../../services/account-service", () => ({
  CREATE_ACCOUNT_ERROR_CODES: {
    USER_ID_REQUIRED: "USER_ID_REQUIRED",
    DUPLICATE_ACCOUNT: "DUPLICATE_ACCOUNT",
    DUPLICATE_IN_FLIGHT: "DUPLICATE_IN_FLIGHT",
  },
  createAccountForUser: (...args: readonly unknown[]): Promise<unknown> =>
    mockCreateAccountForUser(...args) as Promise<unknown>,
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

jest.mock("../../components/ui/Toast", () => ({
  useToast: (): { showToast: jest.Mock } => ({ showToast: mockShowToast }),
}));

jest.mock("expo-router", () => ({
  useRouter: (): {
    back: jest.Mock;
    replace: jest.Mock;
    canGoBack: jest.Mock;
  } => ({
    back: mockRouterBack,
    replace: mockRouterReplace,
    canGoBack: mockRouterCanGoBack,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (
    namespace: "accounts" | "common"
  ): { t: (key: string, options?: Record<string, unknown>) => string } => ({
    t: (key: string, options?: Record<string, unknown>): string => {
      const prefix = `${namespace}:${key}`;
      return typeof options?.name === "string"
        ? `${prefix}:${options.name}`
        : prefix;
    },
  }),
}));

// Import AFTER mocks
// eslint-disable-next-line import/first
import { useCreateAccount } from "../../hooks/useCreateAccount";

const accountFormData: AccountFormData = {
  name: "Cash",
  accountType: "CASH",
  currency: "EGP",
  balance: "0",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCurrentUserId = "user-1";
  mockIsResolvingUser = false;
  mockCreateAccountForUser.mockResolvedValue({
    success: true,
    accountId: "account-1",
    created: true,
  });
  mockRouterCanGoBack.mockReturnValue(true);
});

describe("useCreateAccount", () => {
  it("synchronously ignores rapid duplicate submits", async () => {
    let releaseCreate: () => void = () => undefined;
    const createGate = new Promise<void>((resolve) => {
      releaseCreate = resolve;
    });
    mockCreateAccountForUser.mockImplementationOnce(async () => {
      await createGate;
      return { success: true, accountId: "account-1", created: true };
    });

    const { result } = renderHook(() => useCreateAccount());

    let firstSubmit: Promise<void> = Promise.resolve();
    let secondSubmit: Promise<void> = Promise.resolve();
    let thirdSubmit: Promise<void> = Promise.resolve();

    act(() => {
      firstSubmit = result.current.createAccount(accountFormData);
      secondSubmit = result.current.createAccount(accountFormData);
      thirdSubmit = result.current.createAccount(accountFormData);
    });

    await Promise.resolve();

    expect(mockCreateAccountForUser).toHaveBeenCalledTimes(1);

    releaseCreate();

    await act(async () => {
      await Promise.all([firstSubmit, secondSubmit, thirdSubmit]);
    });

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledTimes(1);
  });

  it("replaces to the accounts tab when there is no route to go back to", async () => {
    mockRouterCanGoBack.mockReturnValue(false);
    const { result } = renderHook(() => useCreateAccount());

    await act(async () => {
      await result.current.createAccount(accountFormData);
    });

    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mockRouterReplace).toHaveBeenCalledWith(
      "/(private)/(tabs)/accounts"
    );
  });

  it("uses localized success toast text without emojis", async () => {
    const { result } = renderHook(() => useCreateAccount());

    await act(async () => {
      await result.current.createAccount(accountFormData);
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        title: "accounts:toast_create_success_title",
        message: "accounts:toast_create_success_message:Cash",
      })
    );
  });

  it("does not submit or navigate while the current user is still resolving", async () => {
    mockCurrentUserId = null;
    mockIsResolvingUser = true;
    const { result } = renderHook(() => useCreateAccount());

    await act(async () => {
      await result.current.createAccount(accountFormData);
    });

    expect(mockCreateAccountForUser).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it("routes to auth when the current user is missing after auth resolves", async () => {
    mockCurrentUserId = null;
    const { result } = renderHook(() => useCreateAccount());

    await act(async () => {
      await result.current.createAccount(accountFormData);
    });

    expect(mockCreateAccountForUser).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockRouterBack).not.toHaveBeenCalled();
    expect(mockRouterReplace).toHaveBeenCalledWith("/auth");
  });
});
