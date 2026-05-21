import { redactIdentifierForLog } from "@/utils/logger-redaction";

describe("logger redaction helpers", () => {
  it("redacts identifiers without exposing the full value", () => {
    const value = "sms-transaction-fingerprint-123456";

    const redacted = redactIdentifierForLog(value);

    expect(redacted).toContain("redacted");
    expect(redacted).toContain("prefix=sms-tr");
    expect(redacted).toContain("length=34");
    expect(redacted).not.toContain(value);
    expect(redacted).not.toContain("fingerprint-123456");
  });

  it("does not expose short identifiers as their own prefix", () => {
    const redacted = redactIdentifierForLog("abc");

    expect(redacted).toBe("[redacted:length=3]");
    expect(redacted).not.toContain("abc");
  });

  it("keeps the prefix hidden at the hidden-suffix threshold", () => {
    const redacted = redactIdentifierForLog("abcd");

    expect(redacted).toBe("[redacted:length=4]");
    expect(redacted).not.toContain("abcd");
    expect(redacted).not.toContain("prefix=");
  });

  it("emits only the safe prefix after the hidden-suffix threshold", () => {
    const redacted = redactIdentifierForLog("abcde");

    expect(redacted).toBe("[redacted:prefix=a;length=5]");
    expect(redacted).toContain("prefix=a");
    expect(redacted).not.toContain("abcde");
    expect(redacted).not.toContain("bcde");
  });

  it("normalizes missing identifiers", () => {
    expect(redactIdentifierForLog(null)).toBe("[redacted:missing]");
    expect(redactIdentifierForLog(undefined)).toBe("[redacted:missing]");
    expect(redactIdentifierForLog("   ")).toBe("[redacted:missing]");
  });
});
