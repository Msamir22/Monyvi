"use strict";

const KNOWN_DEBT_FILE_SUFFIXES = [];

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

function isMobileFile(fileName) {
  return normalizePath(fileName).includes("apps/mobile/");
}

function isMobileService(fileName) {
  return normalizePath(fileName).includes("apps/mobile/services/");
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

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require WatermelonDB writes to live in apps/mobile/services command services.",
      recommended: false,
    },
    schema: [],
    messages: {
      dbWriteOutsideService:
        "WatermelonDB writes belong in apps/mobile/services command services. Move this database.write() behind a service function.",
    },
  },

  create(context) {
    const fileName = context.getFilename();
    if (
      !isMobileFile(fileName) ||
      isMobileService(fileName) ||
      isKnownDebtFile(fileName) ||
      isTestFile(fileName)
    ) {
      return {};
    }

    const databaseVariables = new Set(["database"]);

    return {
      VariableDeclarator(node) {
        if (!node.id || node.id.type !== "Identifier") {
          return;
        }

        if (
          node.init?.type === "Identifier" &&
          databaseVariables.has(node.init.name)
        ) {
          databaseVariables.add(node.id.name);
          return;
        }

        if (
          node.init?.type === "CallExpression" &&
          node.init.callee.type === "Identifier" &&
          node.init.callee.name === "useDatabase"
        ) {
          databaseVariables.add(node.id.name);
        }
      },

      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type !== "MemberExpression" ||
          getPropertyName(callee) !== "write" ||
          callee.object.type !== "Identifier" ||
          !databaseVariables.has(callee.object.name)
        ) {
          return;
        }

        context.report({
          node,
          messageId: "dbWriteOutsideService",
        });
      },
    };
  },
};
