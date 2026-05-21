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

function unwrapExpression(expression) {
  let current = expression;

  while (
    current?.type === "ChainExpression" ||
    current?.type === "TSNonNullExpression" ||
    current?.type === "TSAsExpression" ||
    current?.type === "TSTypeAssertion" ||
    current?.type === "TSInstantiationExpression" ||
    current?.type === "TSSatisfiesExpression" ||
    current?.type === "ParenthesizedExpression"
  ) {
    current = current.expression;
  }

  return current;
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

    function getLatestWriteExpression(variable, referenceNode) {
      const referenceStart =
        referenceNode.range?.[0] ?? Number.MAX_SAFE_INTEGER;
      let latestWrite = null;

      for (const reference of variable.references) {
        const writeExpression = reference.writeExpr;
        const writeStart = reference.identifier.range?.[0] ?? -1;
        if (!writeExpression || writeStart > referenceStart) {
          continue;
        }

        if (
          !latestWrite ||
          writeStart > (latestWrite.identifier.range?.[0] ?? -1)
        ) {
          latestWrite = reference;
        }
      }

      return latestWrite?.writeExpr ?? null;
    }

    function resolveExpression(expression, visitedIdentifiers, scopeNode) {
      const unwrappedExpression = unwrapExpression(expression);
      if (unwrappedExpression.type !== "Identifier") {
        return unwrappedExpression;
      }

      if (visitedIdentifiers.has(unwrappedExpression.name)) {
        return null;
      }

      visitedIdentifiers.add(unwrappedExpression.name);
      const variable = findVariable(unwrappedExpression.name, scopeNode);
      if (!variable) {
        return unwrappedExpression;
      }

      const latestWrite = variable
        ? getLatestWriteExpression(variable, unwrappedExpression)
        : null;
      if (latestWrite) {
        return resolveExpression(latestWrite, visitedIdentifiers, scopeNode);
      }

      const definition = variable?.defs.find(
        (def) => def.node.type === "VariableDeclarator" && def.node.init
      );
      const init = definition?.node.init;
      if (!init) {
        return null;
      }

      if (unwrapExpression(init).type === "Identifier") {
        return resolveExpression(init, visitedIdentifiers, scopeNode);
      }

      return unwrapExpression(init);
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

        const value = unwrapExpression(property.value);

        if (value.type === "ObjectExpression") {
          inspectObjectExpression(value, visitedIdentifiers, scopeNode);
        }

        if (value.type === "Identifier") {
          inspectContextExpression(
            value,
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
      const unwrappedExpression = unwrapExpression(expression);

      if (unwrappedExpression.type === "SpreadElement") {
        inspectContextExpression(
          unwrappedExpression.argument,
          visitedIdentifiers,
          scopeNode
        );
        return;
      }

      const resolved = resolveExpression(
        unwrappedExpression,
        visitedIdentifiers,
        scopeNode
      );
      const unwrappedResolved = unwrapExpression(resolved);
      if (unwrappedResolved?.type === "ObjectExpression") {
        inspectObjectExpression(
          unwrappedResolved,
          visitedIdentifiers,
          scopeNode
        );
      }
    }

    function getMemberPathNames(expression) {
      const unwrapped = unwrapExpression(expression);
      if (!unwrapped) {
        return [];
      }

      if (unwrapped.type === "Identifier") {
        return [unwrapped.name];
      }

      if (unwrapped.type !== "MemberExpression") {
        return [];
      }

      const objectNames = getMemberPathNames(unwrapped.object);
      const propertyName = getPropertyName(unwrapped);
      return propertyName ? [...objectNames, propertyName] : objectNames;
    }

    function isSensitiveMemberExpression(expression) {
      const propertyName = getPropertyName(expression);
      if (!propertyName) {
        return false;
      }

      if (isSensitiveKey(propertyName)) {
        return true;
      }

      const ownerNames = getMemberPathNames(
        unwrapExpression(expression).object
      );
      return ownerNames.some(
        (ownerName) =>
          SENSITIVE_MEMBER_OWNERS.has(normalizeSensitiveName(ownerName)) &&
          SENSITIVE_MEMBER_PROPERTIES.has(normalizeSensitiveName(propertyName))
      );
    }

    function getSensitiveExpressionName(
      expression,
      visitedIdentifiers,
      scopeNode
    ) {
      const unwrapped = unwrapExpression(expression);
      if (!unwrapped) {
        return null;
      }

      if (unwrapped.type === "Identifier") {
        if (isSensitiveKey(unwrapped.name)) {
          return unwrapped.name;
        }

        const resolved = resolveExpression(
          unwrapped,
          new Set(visitedIdentifiers),
          scopeNode
        );
        if (resolved && resolved !== unwrapped) {
          return getSensitiveExpressionName(
            resolved,
            visitedIdentifiers,
            scopeNode
          );
        }

        return null;
      }

      if (unwrapped.type === "MemberExpression") {
        const propertyName = getPropertyName(unwrapped);
        return propertyName && isSensitiveMemberExpression(unwrapped)
          ? propertyName
          : null;
      }

      if (unwrapped.type === "TemplateLiteral") {
        for (const nestedExpression of unwrapped.expressions) {
          const keyName = getSensitiveExpressionName(
            nestedExpression,
            new Set(visitedIdentifiers),
            scopeNode
          );
          if (keyName) {
            return keyName;
          }
        }

        return null;
      }

      if (
        unwrapped.type === "BinaryExpression" ||
        unwrapped.type === "LogicalExpression"
      ) {
        return (
          getSensitiveExpressionName(
            unwrapped.left,
            new Set(visitedIdentifiers),
            scopeNode
          ) ||
          getSensitiveExpressionName(
            unwrapped.right,
            new Set(visitedIdentifiers),
            scopeNode
          )
        );
      }

      if (unwrapped.type === "ConditionalExpression") {
        return (
          getSensitiveExpressionName(
            unwrapped.consequent,
            new Set(visitedIdentifiers),
            scopeNode
          ) ||
          getSensitiveExpressionName(
            unwrapped.alternate,
            new Set(visitedIdentifiers),
            scopeNode
          )
        );
      }

      if (unwrapped.type === "CallExpression") {
        for (const argument of unwrapped.arguments) {
          const keyName = getSensitiveExpressionName(
            argument,
            new Set(visitedIdentifiers),
            scopeNode
          );
          if (keyName) {
            return keyName;
          }
        }
      }

      return null;
    }

    function inspectLoggerMessage(argument, scopeNode) {
      const keyName = getSensitiveExpressionName(
        argument,
        new Set(),
        scopeNode
      );
      if (!keyName) {
        return;
      }

      context.report({
        node: argument,
        messageId: "sensitiveLoggerMessage",
        data: { keyName },
      });
    }

    return {
      CallExpression(node) {
        if (!isLoggerCall(node)) {
          return;
        }

        inspectLoggerMessage(node.arguments[0], node);

        for (const argument of node.arguments) {
          inspectContextExpression(argument, new Set(), node);
        }
      },
    };
  },
};
