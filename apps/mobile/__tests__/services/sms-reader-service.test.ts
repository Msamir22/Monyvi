import { Platform } from "react-native";

const mockNativeSmsList = jest.fn();

jest.mock("react-native-get-sms-android", () => ({
  list: (...args: readonly unknown[]): unknown => mockNativeSmsList(...args),
}));

import { readSmsInbox } from "@/services/sms-reader-service";

const originalPlatformOS = Platform.OS;

describe("sms-reader-service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalPlatformOS,
    });
  });

  it("uses a stable timestamp fallback for invalid native SMS dates", async () => {
    mockNativeSmsList.mockImplementation(
      (
        _filter: string,
        _onFail: (error: string) => void,
        onSuccess: (count: number, smsList: string) => void
      ) => {
        onSuccess(
          1,
          JSON.stringify([
            {
              _id: "sms-1",
              address: "NBE",
              body: "Purchase EGP 100 at Shop",
              date: "not-a-date",
              read: 0,
            },
          ])
        );
      }
    );

    const firstRead = await readSmsInbox();
    const secondRead = await readSmsInbox();

    expect(firstRead[0]?.date).toBe(0);
    expect(secondRead[0]?.date).toBe(0);
  });
});
