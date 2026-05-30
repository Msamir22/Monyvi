import {
  DEFAULT_EGYPTIAN_INSTITUTION_ASSETS,
  EGYPTIAN_INSTITUTION_ASSETS,
} from "../../constants/egyptian-institution-assets";
import {
  resolveAccountInstitutionPresentation,
  type AccountInstitutionSource,
} from "../../services/account-institution-read-model-service";

function source(
  overrides: Partial<AccountInstitutionSource>
): AccountInstitutionSource {
  return {
    type: "BANK",
    institutionId: null,
    providerDisplayName: undefined,
    ...overrides,
  };
}

describe("account institution read model", () => {
  it("resolves known bank registry metadata and logo", () => {
    const presentation = resolveAccountInstitutionPresentation(
      source({ institutionId: "cib", providerDisplayName: "Old CIB" })
    );

    expect(presentation).toEqual(
      expect.objectContaining({
        kind: "bank",
        providerLabel: "CIB (Commercial International Bank)",
        asset: EGYPTIAN_INSTITUTION_ASSETS.cib,
      })
    );
  });

  it("resolves known wallet registry metadata and logo", () => {
    const presentation = resolveAccountInstitutionPresentation(
      source({ type: "DIGITAL_WALLET", institutionId: "e-and-cash" })
    );

    expect(presentation).toEqual(
      expect.objectContaining({
        kind: "wallet",
        providerLabel: "e& money (e& money)",
        asset: EGYPTIAN_INSTITUTION_ASSETS["e-and-cash"],
      })
    );
  });

  it("falls back to manual provider display and default logo", () => {
    const presentation = resolveAccountInstitutionPresentation(
      source({ institutionId: null, providerDisplayName: "My Bank" })
    );

    expect(presentation).toEqual(
      expect.objectContaining({
        kind: "bank",
        providerLabel: "My Bank",
        asset: DEFAULT_EGYPTIAN_INSTITUTION_ASSETS.bank,
      })
    );
  });

  it("returns no institution presentation for cash accounts", () => {
    expect(
      resolveAccountInstitutionPresentation(source({ type: "CASH" }))
    ).toBeNull();
  });
});
