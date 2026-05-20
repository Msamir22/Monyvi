"use strict";

const KNOWN_DEBT_FILE_SUFFIXES = [];

const SENSITIVE_KEYS = new Set([
  "accountid",
  "amount",
  "availablebalance",
  "balance",
  "bankaccountid",
  "email",
  "fingerprint",
  "fromaccountid",
  "notificationid",
  "paymentid",
  "profileid",
  "rawsmsbody",
  "sender",
  "senderdisplayname",
  "smsbody",
  "smsfingerprint",
  "toaccountid",
  "transactionid",
  "transferid",
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
      sensitiveLoggerMessage:
        "Logger message interpolates '{{keyName}}', which may expose sensitive financial, account, or SMS data. Redact it before logging or omit it.",
    },
  },

  create(context) {
    const fileName = context.getFilename();
    if (isKnownDebtFile(fileName) || isTestFile(fileName)) {
      return {};
    }

    function inspectObjectExpression(objectExpression) {
      for (const property of objectExpression.properties) {
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

    function getSensitiveExpressionName(expression) {
      if (expression.type === "Identifier") {
        return isSensitiveKey(expression.name) ? expression.name : null;
      }

      if (expression.type === "MemberExpression") {
        const propertyName = getPropertyName(expression);
        return propertyName && isSensitiveKey(propertyName)
          ? propertyName
          : null;
      }

      return null;
    }

    function inspectLoggerMessage(argument) {
      if (!argument || argument.type !== "TemplateLiteral") {
        return;
      }

      for (const expression of argument.expressions) {
        const keyName = getSensitiveExpressionName(expression);
        if (keyName) {
          context.report({
            node: expression,
            messageId: "sensitiveLoggerMessage",
            data: { keyName },
          });
        }
      }
    }

    return {
      CallExpression(node) {
        if (!isLoggerCall(node)) {
          return;
        }

        inspectLoggerMessage(node.arguments[0]);

        for (const argument of node.arguments) {
          if (argument.type === "ObjectExpression") {
            inspectObjectExpression(argument);
          }
        }
      },
    };
  },
};
