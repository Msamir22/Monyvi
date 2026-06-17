jest.mock("i18next", () => ({
  t: (key: string): string => `translated:${key}`,
}));

import {
  accountFormSchema,
  editAccountFormSchema,
  validateAccountForm,
  validateEditAccountForm,
} from "@/validation/account-validation";

const baseCreate = {
  name: "Cash",
  accountType: "CASH" as const,
  currency: "EGP",
  balance: "100",
  bankName: "",
  cardLast4: "",
  smsSenderName: "",
};

const baseEdit = {
  name: "Cash",
  balance: "100",
  bankName: "",
  cardLast4: "",
  smsSenderName: "",
};

describe("accountFormSchema (create)", () => {
  it("trims the name field via z.string().trim()", () => {
    const parsed = accountFormSchema.parse({ ...baseCreate, name: "  Cash  " });
    expect(parsed.name).toBe("Cash");
  });

  it("rejects multi-dot balance like 1.2.3", () => {
    const result = validateAccountForm({ ...baseCreate, balance: "1.2.3" });
    expect(result.isValid).toBe(false);
    expect(result.errors.balance).toBeDefined();
  });

  it("rejects integer balances with leading zeroes", () => {
    const result = validateAccountForm({
      ...baseCreate,
      balance: "00056465",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.balance).toBeDefined();
  });

  it("rejects decimal balances with leading zeroes before a non-zero integer part", () => {
    const result = validateAccountForm({ ...baseCreate, balance: "01.25" });
    expect(result.isValid).toBe(false);
    expect(result.errors.balance).toBeDefined();
  });

  it("rejects negative balance on create", () => {
    const result = validateAccountForm({ ...baseCreate, balance: "-5" });
    expect(result.isValid).toBe(false);
    expect(result.errors.balance).toBeDefined();
  });

  it("rejects alpha balance like abc", () => {
    const result = validateAccountForm({ ...baseCreate, balance: "abc" });
    expect(result.isValid).toBe(false);
    expect(result.errors.balance).toBeDefined();
  });

  it("rejects whitespace-only name (after trim)", () => {
    const result = validateAccountForm({ ...baseCreate, name: "   " });
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe(
      "translated:accounts:validation_name_required"
    );
  });

  it("accepts a valid integer balance", () => {
    const result = validateAccountForm({ ...baseCreate, balance: "100" });
    expect(result.isValid).toBe(true);
  });

  it("accepts a valid decimal balance", () => {
    const result = validateAccountForm({ ...baseCreate, balance: "100.50" });
    expect(result.isValid).toBe(true);
  });

  it("accepts zero and zero-prefixed decimals", () => {
    expect(validateAccountForm({ ...baseCreate, balance: "0" }).isValid).toBe(
      true
    );
    expect(
      validateAccountForm({ ...baseCreate, balance: "0.50" }).isValid
    ).toBe(true);
  });

  it("does not validate the hidden legacy SMS sender aggregate", () => {
    const result = validateAccountForm({
      ...baseCreate,
      smsSenderName: "x".repeat(150),
    });

    expect(result.isValid).toBe(true);
  });

  it("rejects empty string institution ids", () => {
    const result = validateAccountForm({
      ...baseCreate,
      accountType: "BANK",
      institutionId: "",
      providerDisplayName: "CIB",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.institutionId).toBeDefined();
  });

  it("rejects institution ids on cash accounts", () => {
    const result = validateAccountForm({
      ...baseCreate,
      accountType: "CASH",
      institutionId: "cib",
      providerDisplayName: "CIB",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.institutionId).toBe(
      "translated:accounts:validation_institution_invalid_for_type"
    );
  });

  it("rejects wallet institution ids on bank accounts", () => {
    const result = validateAccountForm({
      ...baseCreate,
      accountType: "BANK",
      institutionId: "vodafone-cash",
      providerDisplayName: "Vodafone Cash",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.institutionId).toBe(
      "translated:accounts:validation_institution_invalid_for_type"
    );
  });

  it("rejects unknown institution ids", () => {
    const result = validateAccountForm({
      ...baseCreate,
      accountType: "BANK",
      institutionId: "not-a-provider",
      providerDisplayName: "Unknown",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.institutionId).toBe(
      "translated:accounts:validation_institution_invalid_for_type"
    );
  });

  it("accepts matching known bank and wallet institution ids", () => {
    expect(
      validateAccountForm({
        ...baseCreate,
        accountType: "BANK",
        institutionId: "cib",
        providerDisplayName: "CIB",
      }).isValid
    ).toBe(true);
    expect(
      validateAccountForm({
        ...baseCreate,
        accountType: "DIGITAL_WALLET",
        institutionId: "vodafone-cash",
        providerDisplayName: "Vodafone Cash",
      }).isValid
    ).toBe(true);
  });

  it("allows bank edits without institution or provider details", () => {
    const result = validateEditAccountForm(
      {
        ...baseEdit,
        institutionId: null,
        providerDisplayName: "",
      },
      "BANK"
    );

    expect(result.isValid).toBe(true);
    expect(result.errors.providerDisplayName).toBeUndefined();
  });
});

describe("editAccountFormSchema", () => {
  it("trims the name field via z.string().trim()", () => {
    const parsed = editAccountFormSchema.parse({
      ...baseEdit,
      name: "  Cash  ",
    });
    expect(parsed.name).toBe("Cash");
  });

  it("rejects multi-minus balance like -1-2", () => {
    const result = validateEditAccountForm({ ...baseEdit, balance: "-1-2" });
    expect(result.isValid).toBe(false);
    expect(result.errors.balance).toBeDefined();
  });

  it("rejects multi-dot balance like 1.2.3", () => {
    const result = validateEditAccountForm({ ...baseEdit, balance: "1.2.3" });
    expect(result.isValid).toBe(false);
    expect(result.errors.balance).toBeDefined();
  });

  it("rejects balances with leading zeroes", () => {
    const result = validateEditAccountForm({
      ...baseEdit,
      balance: "00056465",
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.balance).toBeDefined();
  });

  it("rejects negative balances with leading zeroes", () => {
    const result = validateEditAccountForm({ ...baseEdit, balance: "-01.25" });
    expect(result.isValid).toBe(false);
    expect(result.errors.balance).toBeDefined();
  });

  it("accepts a valid negative balance (overdraft)", () => {
    const result = validateEditAccountForm({ ...baseEdit, balance: "-5" });
    expect(result.isValid).toBe(true);
  });

  it("accepts a valid negative decimal balance", () => {
    const result = validateEditAccountForm({ ...baseEdit, balance: "-12.50" });
    expect(result.isValid).toBe(true);
  });

  it("accepts zero-prefixed decimals, including overdrafts smaller than one", () => {
    expect(
      validateEditAccountForm({ ...baseEdit, balance: "0.50" }).isValid
    ).toBe(true);
    expect(
      validateEditAccountForm({ ...baseEdit, balance: "-0.50" }).isValid
    ).toBe(true);
  });

  it("does not validate the hidden legacy SMS sender aggregate on edit", () => {
    const result = validateEditAccountForm({
      ...baseEdit,
      smsSenderName: "x".repeat(150),
    });

    expect(result.isValid).toBe(true);
  });

  it("rejects a leading minus with no digits", () => {
    const result = validateEditAccountForm({ ...baseEdit, balance: "-" });
    expect(result.isValid).toBe(false);
    expect(result.errors.balance).toBe(
      "translated:accounts:validation_balance_edit_invalid"
    );
  });

  it("rejects empty string institution ids", () => {
    const result = validateEditAccountForm({
      ...baseEdit,
      institutionId: "",
      providerDisplayName: "CIB",
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.institutionId).toBeDefined();
  });

  it("rejects institution ids that do not match the edited account type", () => {
    const result = validateEditAccountForm(
      {
        ...baseEdit,
        institutionId: "vodafone-cash",
        providerDisplayName: "Vodafone Cash",
      },
      "BANK"
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.institutionId).toBe(
      "translated:accounts:validation_institution_invalid_for_type"
    );
  });
});
