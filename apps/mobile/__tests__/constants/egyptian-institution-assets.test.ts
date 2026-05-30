import { getSelectableEgyptianInstitutions } from "@monyvi/logic";

import {
  DEFAULT_EGYPTIAN_INSTITUTION_ASSETS,
  EGYPTIAN_INSTITUTION_ASSETS,
  getEgyptianInstitutionAsset,
} from "../../constants/egyptian-institution-assets";

describe("Egyptian institution assets", () => {
  it("has local logo coverage for every selectable provider", () => {
    const selectableProviders = [
      ...getSelectableEgyptianInstitutions("bank"),
      ...getSelectableEgyptianInstitutions("wallet"),
    ];

    for (const provider of selectableProviders) {
      const asset = EGYPTIAN_INSTITUTION_ASSETS[provider.id];

      expect(asset.institutionId).toBe(provider.id);
      expect(asset.kind).toBe(provider.type);
      expect(asset.logo).toBeTruthy();
      expect(asset.logo).not.toBe(
        DEFAULT_EGYPTIAN_INSTITUTION_ASSETS[provider.type].logo
      );
    }
  });

  it("does not define local logo assets for non-selectable providers", () => {
    const selectableIds = new Set(
      [
        ...getSelectableEgyptianInstitutions("bank"),
        ...getSelectableEgyptianInstitutions("wallet"),
      ].map((provider) => provider.id)
    );

    for (const institutionId of Object.keys(EGYPTIAN_INSTITUTION_ASSETS)) {
      expect(
        selectableIds.has(
          institutionId as Parameters<typeof selectableIds.has>[0]
        )
      ).toBe(true);
    }
  });

  it("provides default assets for manual bank and wallet providers", () => {
    expect(DEFAULT_EGYPTIAN_INSTITUTION_ASSETS.bank.logo).toBeTruthy();
    expect(DEFAULT_EGYPTIAN_INSTITUTION_ASSETS.wallet.logo).toBeTruthy();
    expect(getEgyptianInstitutionAsset(null, "bank")).toBe(
      DEFAULT_EGYPTIAN_INSTITUTION_ASSETS.bank
    );
    expect(getEgyptianInstitutionAsset(null, "wallet")).toBe(
      DEFAULT_EGYPTIAN_INSTITUTION_ASSETS.wallet
    );
  });
});
