"use strict";

const KNOWN_DEBT_FILE_SUFFIXES = [
  "apps/mobile/hooks/usePreferredCurrency.ts",
  "apps/mobile/hooks/usePaymentSubmission.ts",
  "apps/mobile/services/notification-service.ts",
  "apps/mobile/services/sms-live-detection-handler.ts",
];

const SENSITIVE_KEYS = new Set([
  "account_id",
  "accountid",
  "amount",
  "availablebalance",
  "balance",
  "bank_account_id",
  "bankaccountid",
  "email",
  "fingerprint",
  "from_account_id",
  "fromaccountid",
  "payment_id",
  "paymentid",
  "profile_id",
  "profileid",
  "raw_sms_body",
  "rawsmsbody",
  "sender",
  "sender_display_name",
  "senderdisplayname",
  "sms_body",
  "smsbody",
  "sms_fingerprint",
  "smsfingerprint",
  "to_account_id",
  "toaccountid",
  "transaction_id",
  "transactionid",
  "transfer_id",
  "transferid",
  "user_id",
  "userid",
]);

function normalizePath(fileName) {
  return fileName.replace(/\\/g, "/");
}

function isKnownDebtFile(fileName) {
  const normalized = normalizePath(fileName);
  return KNOWN_DEBT_FILE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function isTestFile(fileName) {
  const normalized = normalizePath(fileName);
  return (
    normalized.includes("/__tests__/") ||
    normalized.endsWith(".test.ts") ||
    normalized.endsWith(".test.tsx") ||
    normalized.endsWith(".spec.ts") ||
    normalized.endsWith(".spec.tsx")
  );
}

function getPropertyName(memberExpression) {
  if (!memberExpression || memberExpression.type !== "MemberExpression") {
    return null;
  }

  const property = memberExpression.property;
  if (property.type === "Identifier") {
    return property.name;
  }

  if (property.type === "Literal" && typeof property.value === "string") {
    return property.value;
  }

  return null;
}

function getObjectKeyName(property) {
  if (!property || property.type !== "Property") {
    return null;
  }

  if (property.key.type === "Identifier") {
    return property.key.name;
  }

  if (
    property.key.type === "Literal" &&
    typeof property.key.value === "string"
  ) {
    return property.key.value;
  }

  return null;
}

function isLoggerCall(node) {
  const callee = node.callee;
  if (callee.type !== "MemberExpression") {
    return false;
  }

  return (
    callee.object.type === "Identifier" &&
    callee.object.name === "logger" &&
    ["debug", "error", "info", "warn"].includes(getPropertyName(callee))
  );
}

function isSensitiveKey(keyName) {
  const normalized = keyName.toLowerCase();
  if (
    normalized.includes("redacted") ||
    normalized.includes("masked") ||
    normalized.includes("prefix")
  ) {
    return false;
  }

  return SENSITIVE_KEYS.has(normalized);
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent sensitive financial, account, and SMS fields from being added to logger context objects.",
      recommended: false,
    },
    schema: [],
    messages: {
      sensitiveLoggerKey:
        "Logger context key '{{keyName}}' may contain sensitive financial, account, or SMS data. Redact it before logging or omit it.",
    },
  },

  create(context) {
    const fileName = context.getFilename();
    if (isKnownDebtFile(fileName) || isTestFile(fileName)) {
      return {};
    }

    const objectExpressionsByName = new Map();

    function inspectObjectExpression(objectExpression) {
      for (const property of objectExpression.properties) {
        if (property.type === "SpreadElement") {
          inspectContextExpression(property.argument);
          continue;
        }

        if (property.type !== "Property") {
          continue;
        }

        const keyName = getObjectKeyName(property);
        if (keyName && isSensitiveKey(keyName)) {
          context.report({
            node: property.key,
            messageId: "sensitiveLoggerKey",
            data: { keyName },
          });
        }

        if (property.value.type === "ObjectExpression") {
          inspectObjectExpression(property.value);
        }
      }
    }

    function inspectContextExpression(expression) {
      if (expression.type === "ObjectExpression") {
        inspectObjectExpression(expression);
        return;
      }

      if (expression.type === "Identifier") {
        const objectExpression = objectExpressionsByName.get(expression.name);
        if (objectExpression) {
          inspectObjectExpression(objectExpression);
        }
      }
    }

    return {
      VariableDeclarator(node) {
        if (
          node.id.type === "Identifier" &&
          node.init?.type === "ObjectExpression"
        ) {
          objectExpressionsByName.set(node.id.name, node.init);
        }
      },

      CallExpression(node) {
        if (!isLoggerCall(node)) {
          return;
        }

        for (const argument of node.arguments) {
          inspectContextExpression(argument);
        }
      },
    };
  },
};
