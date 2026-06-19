import {
  EGYPTIAN_FINANCIAL_INSTITUTIONS,
  getInstitutionById,
  getSelectableEgyptianInstitutions,
  getSenderPatternsForInstitution,
  isKnownFinancialSender,
} from "../egyptian-bank-registry";

function selectableIdsFor(type: "bank" | "wallet"): readonly string[] {
  return getSelectableEgyptianInstitutions(type).map(
    (institution) => institution.id
  );
}

describe("Egyptian financial institution registry", () => {
  it("uses stable unique IDs for every canonical entry", () => {
    const ids = EGYPTIAN_FINANCIAL_INSTITUTIONS.map(
      (institution) => institution.id
    );

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        "cib",
        "nbe",
        "bank-nxt",
        "kfh-egypt",
        "qnb-egypt",
        "e-and-cash",
      ])
    );
  });

  it("returns only selectable banks from the current audited bank catalog", () => {
    const bankIds = selectableIdsFor("bank");

    expect(bankIds).toEqual(
      expect.arrayContaining([
        "standard-chartered",
        "bank-nxt",
        "kfh-egypt",
        "bank-abc",
        "nasser-social-bank",
        "qnb-egypt",
      ])
    );
    expect(bankIds).not.toEqual(
      expect.arrayContaining([
        "arab-investment-bank",
        "aibank",
        "aub",
        "blom-bank",
        "central-bank-of-egypt",
        "egypt-post",
        "instapay",
        "national-bank-of-greece",
        "qnb-al-ahli",
      ])
    );
  });

  it("returns only selectable wallets from verified wallet providers", () => {
    const walletIds = selectableIdsFor("wallet");

    expect(walletIds).toEqual(
      expect.arrayContaining([
        "vodafone-cash",
        "e-and-cash",
        "orange-cash",
        "we-pay",
      ])
    );
    expect(walletIds).not.toContain("fawry");
    expect(walletIds).not.toContain("instapay");
  });

  it("keeps Arabic display metadata where the audit can support it", () => {
    const cib = getInstitutionById("cib");
    const eAndCash = getInstitutionById("e-and-cash");

    expect(cib?.nameAr).toBeTruthy();
    expect(eAndCash?.nameAr).toBeTruthy();
  });

  it("maps renamed and legacy sender aliases to the current canonical provider", () => {
    expect(isKnownFinancialSender("AINVEST")?.id).toBe("bank-nxt");
    expect(isKnownFinancialSender("aiBANK")?.id).toBe("bank-nxt");
    expect(isKnownFinancialSender("AUB")?.id).toBe("kfh-egypt");
    expect(isKnownFinancialSender("BLOM")?.id).toBe("bank-abc");
    expect(isKnownFinancialSender("QNBALAHLI")?.id).toBe("qnb-egypt");
    expect(isKnownFinancialSender("EtisalatCash")?.id).toBe("e-and-cash");
  });

  it("exposes sender presets for UI prefill and validation", () => {
    expect(getSenderPatternsForInstitution("e-and-cash")).toEqual(
      expect.arrayContaining(["e&money", "e&cash", "etisalatcash"])
    );
    expect(getSenderPatternsForInstitution("bank-nxt")).toEqual(
      expect.arrayContaining(["banknxt", "ainvest", "aibank"])
    );
  });

  it("does not include excluded rails or non-selectable institutions in sender filtering", () => {
    expect(isKnownFinancialSender("InstaPay")).toBeUndefined();
    expect(isKnownFinancialSender("IPN")).toBeUndefined();
    expect(isKnownFinancialSender("Central Bank of Egypt")).toBeUndefined();
    expect(isKnownFinancialSender("National Bank of Greece")).toBeUndefined();
  });

  it("requires exact matches for short generic sender aliases", () => {
    expect(isKnownFinancialSender("ABC")?.id).toBe("bank-abc");
    expect(isKnownFinancialSender("ABCStore")).toBeUndefined();
    expect(isKnownFinancialSender("BM-Store")).toBeUndefined();
  });

  it("matches short verified bank aliases when delimited by sender boundaries", () => {
    expect(isKnownFinancialSender("CIB-EGYPT")?.id).toBe("cib");
    expect(isKnownFinancialSender("NBE-Bank")?.id).toBe("nbe");
    expect(isKnownFinancialSender("QNB-AlaHli")?.id).toBe("qnb-egypt");
  });

  it("does not make pending Meeza or generic Fawry products selectable", () => {
    const selectableIds = [
      ...selectableIdsFor("bank"),
      ...selectableIdsFor("wallet"),
    ];
    const pendingOrGenericIds = EGYPTIAN_FINANCIAL_INSTITUTIONS.filter(
      (institution) =>
        institution.auditStatus === "pending" || institution.id === "fawry"
    ).map((institution) => institution.id);

    for (const id of pendingOrGenericIds) {
      expect(selectableIds).not.toContain(id);
    }
  });
});
