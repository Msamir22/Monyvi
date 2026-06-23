import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";

import { DeleteAccountSheet } from "@/components/edit-account/DeleteAccountSheet";

jest.mock("expo-blur", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    BlurView: ({
      children,
    }: {
      readonly children?: React.ReactNode;
    }): React.ReactElement => ReactActual.createElement(View, null, children),
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: (): { readonly bottom: number } => ({
    bottom: 0,
  }),
}));

jest.mock("@monyvi/logic", () => ({
  formatCurrency: (): string => "EGP 120.00",
}));

jest.mock("react-i18next", () => ({
  useTranslation: (
    namespace: "accounts" | "common"
  ): { readonly t: (key: string) => string } => ({
    t: (key: string): string => `${namespace}:${key}`,
  }),
}));

const linkedRecords = {
  transactions: 0,
  transfers: 0,
  debts: 0,
  recurringPayments: 0,
};

describe("DeleteAccountSheet", () => {
  it("disables the delete confirmation button while deletion is running", () => {
    const onConfirm = jest.fn();

    render(
      <DeleteAccountSheet
        visible={true}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
        accountName="Cash"
        accountBalance={120}
        currencyCode="EGP"
        linkedRecords={linkedRecords}
        isDeleting={true}
      />
    );

    expect(screen.getByTestId("delete-account-confirm-button")).toHaveProp(
      "accessibilityState",
      {
        disabled: true,
        busy: true,
      }
    );

    fireEvent.press(screen.getByTestId("delete-account-confirm-button"));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("enables the delete confirmation button when deletion is not running", () => {
    const onConfirm = jest.fn();

    render(
      <DeleteAccountSheet
        visible={true}
        onConfirm={onConfirm}
        onCancel={jest.fn()}
        accountName="Cash"
        accountBalance={120}
        currencyCode="EGP"
        linkedRecords={linkedRecords}
        isDeleting={false}
      />
    );

    expect(screen.getByTestId("delete-account-confirm-button")).toHaveProp(
      "accessibilityState",
      {
        disabled: false,
        busy: false,
      }
    );

    fireEvent.press(screen.getByTestId("delete-account-confirm-button"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
