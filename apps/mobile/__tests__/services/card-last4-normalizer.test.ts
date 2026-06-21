import { formatCardLast4ForInput } from "../../services/card-last4-normalizer";

describe("card-last4-normalizer", () => {
  it("formats stored numeric card digits for text input display", () => {
    expect(formatCardLast4ForInput(123)).toBe("0123");
    expect(formatCardLast4ForInput(1234)).toBe("1234");
  });

  it("keeps nullable stored card digits blank for text input display", () => {
    expect(formatCardLast4ForInput(null)).toBe("");
    expect(formatCardLast4ForInput(undefined)).toBe("");
  });

  it("does not accept unvalidated string input for display formatting", () => {
    const assertFormatterRejectsStrings = (): void => {
      // @ts-expect-error strings must be normalized before display formatting
      formatCardLast4ForInput("abc");
    };

    expect(assertFormatterRejectsStrings).toBeDefined();
  });
});
