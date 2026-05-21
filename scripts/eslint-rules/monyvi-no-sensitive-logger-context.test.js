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
    {
      code: `logger.info("sms.saved", { amount: 100, smsFingerprint: "abc" });`,
      filename: "apps/mobile/services/sms-live-detection-handler.ts",
    },
    {
      code: `logger.error("payment.failed", error, { paymentId: "p1", accountId: "a1" });`,
      filename: "apps/mobile/hooks/usePaymentSubmission.ts",
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
      code: `logger.info("notification.sent", { notificationId: "n1" });`,
      filename: "apps/mobile/services/profile-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `logger.error("nested", error, { metadata: { userId: "u1" } });`,
      filename: "apps/mobile/services/profile-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `
        const context = { account_id: "a1" };
        logger.info("account.loaded", context);
      `,
      filename: "apps/mobile/services/profile-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `
        const context = { safe: true };
        logger.info("account.loaded", { ...context, sms_fingerprint: "abc" });
      `,
      filename: "apps/mobile/services/profile-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `
        const context = { amount: 100 };
        logger.info("account.loaded", { ...context });
      `,
      filename: "apps/mobile/services/profile-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `
        const baseContext = { amount: 100 };
        const context = baseContext;
        logger.info("account.loaded", context);
      `,
      filename: "apps/mobile/services/profile-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `
        const context = { safe: true };
        logger.info("account.loaded", { ...context, metadata: { user_id: "u1" } });
      `,
      filename: "apps/mobile/services/profile-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `
        let context = { safe: true };
        context = { amount: 100 };
        logger.info("account.loaded", context);
      `,
      filename: "apps/mobile/services/profile-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: `logger.info("account.loaded", ({ amount: 100 } as const));`,
      filename: "apps/mobile/services/profile-service.ts",
      errors: [{ messageId: "sensitiveLoggerKey" }],
    },
    {
      code: "logger.error(`Account not found (ID: ${accountId})`);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: "logger.error(`Account not found (ID: ${account.id})`);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: "logger.error(`Account not found (ID: ${ctx.account.id})`);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: "logger.error(`Account not found (ID: ${account?.id})`);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: "logger.error(`Account not found (ID: ${accountId!})`);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: "logger.error(`Account not found (ID: ${accountId as string})`);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: "logger.error(`Account not found (ID: ${accountId satisfies string})`);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: 'logger.error(`Account not found (ID: ${isKnown ? accountId : "none"})`);',
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: 'logger.error(`Account not found (ID: ${accountId || "none"})`);',
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: "const safe = accountId; logger.error(`Account not found (ID: ${safe})`);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: "const message = `Account not found (ID: ${accountId})`; logger.error(message);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: 'logger.error(`Account not found (${"ID: " + accountId})`);',
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: "logger.error(`Account not found (${`ID: ${accountId}`})`);",
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
    {
      code: 'logger.error("Account not found: " + accountId);',
      filename: "apps/mobile/services/edit-account-service.ts",
      errors: [{ messageId: "sensitiveLoggerMessage" }],
    },
  ],
});
