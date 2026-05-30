import { renderHook } from "@testing-library/react-native";

let mockPreferredCurrency = "USD";
let mockRegionCode: string | null = "US";
let mockTimezoneCurrency: string | null = null;

jest.mock("../../hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): { readonly preferredCurrency: string } => ({
    preferredCurrency: mockPreferredCurrency,
  }),
}));

jest.mock("expo-localization", () => ({
  getLocales: (): ReadonlyArray<{ readonly regionCode: string | null }> => [
    { regionCode: mockRegionCode },
  ],
}));

jest.mock("../../utils/currency-detection", () => ({
  detectCurrencyFromTimezone: (): string | null => mockTimezoneCurrency,
}));

import { useEgyptianInstitutionEligibility } from "../../hooks/useEgyptianInstitutionEligibility";

describe("useEgyptianInstitutionEligibility", () => {
  beforeEach(() => {
    mockPreferredCurrency = "USD";
    mockRegionCode = "US";
    mockTimezoneCurrency = null;
  });

  it("enables Egyptian presets when preferred currency is EGP", () => {
    mockPreferredCurrency = "EGP";
    mockRegionCode = "US";

    const { result } = renderHook(() => useEgyptianInstitutionEligibility());

    expect(result.current.isEligible).toBe(true);
    expect(result.current.reason).toBe("preferred_currency");
  });

  it("enables Egyptian presets when runtime region is Egypt", () => {
    mockPreferredCurrency = "USD";
    mockRegionCode = "EG";

    const { result } = renderHook(() => useEgyptianInstitutionEligibility());

    expect(result.current.isEligible).toBe(true);
    expect(result.current.reason).toBe("runtime_region");
  });

  it("enables Egyptian presets when runtime timezone maps to EGP", () => {
    mockPreferredCurrency = "USD";
    mockRegionCode = "US";
    mockTimezoneCurrency = "EGP";

    const { result } = renderHook(() => useEgyptianInstitutionEligibility());

    expect(result.current.isEligible).toBe(true);
    expect(result.current.reason).toBe("runtime_region");
  });

  it("keeps non-Egypt users in manual provider mode", () => {
    mockPreferredCurrency = "USD";
    mockRegionCode = "US";

    const { result } = renderHook(() => useEgyptianInstitutionEligibility());

    expect(result.current.isEligible).toBe(false);
    expect(result.current.reason).toBe("manual");
  });
});
