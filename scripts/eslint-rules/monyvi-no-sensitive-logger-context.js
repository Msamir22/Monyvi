"use strict";

const KNOWN_DEBT_FILE_SUFFIXES = [];

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
  "notificationid",
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

const SENSITIVE_MEMBER_OWNERS = new Set([
  "account",
  "bankaccount",
  "message",
  "notification",
  "payment",
  "profile",
  "sender",
  "sms",
  "transaction",
  "transfer",
  "user",
]);

const SENSITIVE_MEMBER_PROPERTIES = new Set([
  "body",
  "email",
  "fingerprint",
  "id",
  "sender",
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
  const normalized = normalizeSensitiveName(keyName);
  if (
    normalized.includes("redacted") ||
    normalized.includes("masked") ||
    normalized.includes("prefix")
  ) {
    return false;
  }

  return SENSITIVE_KEYS.has(normalized);
}

function normalizeSensitiveName(keyName) {
  return keyName.toLowerCase().replace(/[^a-z0-9]/g, "");
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

    const sourceCode = context.getSourceCode();

    function findVariable(name, scopeNode) {
      let scope =
        typeof sourceCode.getScope === "function"
          ? sourceCode.getScope(scopeNode)
          : context.getScope();
      while (scope) {
        const variable = scope.set.get(name);
        if (variable) {
          return variable;
        }
        scope = scope.upper;
      }

      return null;
    }

    function resolveExpression(expression, visitedIdentifiers, scopeNode) {
      if (expression.type !== "Identifier") {
        return expression;
      }

      if (visitedIdentifiers.has(expression.name)) {
        return null;
      }

      visitedIdentifiers.add(expression.name);
      const variable = findVariable(expression.name, scopeNode);
      const definition = variable?.defs.find(
        (def) => def.node.type === "VariableDeclarator" && def.node.init
      );
      const init = definition?.node.init;
      if (!init) {
        return null;
      }

      if (init.type === "Identifier") {
        return resolveExpression(init, visitedIdentifiers, scopeNode);
      }

      return init;
    }

    function inspectObjectExpression(
      objectExpression,
      visitedIdentifiers,
      scopeNode
    ) {
      for (const property of objectExpression.properties) {
        if (property.type === "SpreadElement") {
          inspectContextExpression(
            property.argument,
            new Set(visitedIdentifiers),
            scopeNode
          );
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
          inspectObjectExpression(
            property.value,
            visitedIdentifiers,
            scopeNode
          );
        }

        if (property.value.type === "Identifier") {
          inspectContextExpression(
            property.value,
            new Set(visitedIdentifiers),
            scopeNode
          );
        }
      }
    }

    function inspectContextExpression(
      expression,
      visitedIdentifiers,
      scopeNode
    ) {
      if (expression.type === "SpreadElement") {
        inspectContextExpression(
          expression.argument,
          visitedIdentifiers,
          scopeNode
        );
        return;
      }

      const resolved = resolveExpression(
        expression,
        visitedIdentifiers,
        scopeNode
      );
      if (resolved?.type === "ObjectExpression") {
        inspectObjectExpression(resolved, visitedIdentifiers, scopeNode);
      }
    }

    function unwrapExpression(expression) {
      let current = expression;

      while (
        current?.type === "ChainExpression" ||
        current?.type === "TSNonNullExpression" ||
        current?.type === "TSAsExpression" ||
        current?.type === "TSTypeAssertion" ||
        current?.type === "TSInstantiationExpression" ||
        current?.type === "ParenthesizedExpression"
      ) {
        current = current.expression;
      }

      return current;
    }

    function getIdentifierName(expression) {
      const unwrapped = unwrapExpression(expression);
      return unwrapped?.type === "Identifier" ? unwrapped.name : null;
    }

    function isSensitiveMemberExpression(expression) {
      const propertyName = getPropertyName(expression);
      if (!propertyName) {
        return false;
      }

      if (isSensitiveKey(propertyName)) {
        return true;
      }

      const ownerName = getIdentifierName(expression.object);
      if (!ownerName) {
        return false;
      }

      return (
        SENSITIVE_MEMBER_OWNERS.has(normalizeSensitiveName(ownerName)) &&
        SENSITIVE_MEMBER_PROPERTIES.has(normalizeSensitiveName(propertyName))
      );
    }

    function getSensitiveExpressionName(expression) {
      const unwrapped = unwrapExpression(expression);

      if (unwrapped.type === "Identifier") {
        return isSensitiveKey(unwrapped.name) ? unwrapped.name : null;
      }

      if (
        unwrapped.type === "CallExpression" &&
        unwrapped.callee.type === "Identifier" &&
        ["String", "Number"].includes(unwrapped.callee.name) &&
        unwrapped.arguments.length === 1
      ) {
        return getSensitiveExpressionName(unwrapped.arguments[0]);
      }

      if (unwrapped.type === "MemberExpression") {
        const propertyName = getPropertyName(unwrapped);
        return propertyName && isSensitiveMemberExpression(unwrapped)
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
          inspectContextExpression(argument, new Set(), node);
        }
      },
    };
  },
};
