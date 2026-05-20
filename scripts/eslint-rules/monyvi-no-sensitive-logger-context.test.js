"use strict";

const { RuleTester } = require("eslint");
const rule = require("./monyvi-no-sensitive-logger-context");

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
});

ruleTester.run("monyvi-no-sensitive-logger-context", rule, {
  valid: [
    {
      code: `logger.info("sms.saved", { count: 1, isRetryable: false });`,
      filename: "apps/mobile/services/sms-service.ts",
    },
    {
      code: `logger.warn("sms.saved", { smsFingerprintPrefix: "abc123" });`,
      filename: "apps/mobile/services/sms-service.ts",
    },
  ],
  invalid: [
    {
      code: `logger.info("sms.saved", { amount: 100 });`,
      filename: "apps/mobile/services/sms-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `logger.warn("sms.missing", { senderDisplayName: "CIB" });`,
      filename: "apps/mobile/services/sms-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `logger.error("nested", error, { metadata: { userId: "u1" } });`,
      filename: "apps/mobile/services/profile-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `logger.info("sms.saved", { amount: 100, smsFingerprint: "abc" });`,
      filename: "apps/mobile/services/sms-live-detection-handler.ts",
      errors: [
        { messageId: "sensitiveLoggerKey" },
        { messageId: "sensitiveLoggerKey" },
      ],
    },
    {
      code: `logger.error("payment.failed", error, { paymentId: "p1", accountId: "a1" });`,
      filename: "apps/mobile/hooks/usePaymentSubmission.ts",
      errors: [
        { messageId: "sensitiveLoggerKey" },
        { messageId: "sensitiveLoggerKey" },
      ],
    },
    {
      code: "logger.error(`Account not found (ID: ${accountId})`);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
  ],
});
