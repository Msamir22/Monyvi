"use strict";

const KNOWN_DEBT_FILE_SUFFIXES = [
  "apps/mobile/hooks/usePreferredCurrency.ts",
  "apps/mobile/utils/transactions.ts",
];

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

function isDatabaseWriteMember(node, databaseVariables) {
  return (
    node?.type === "MemberExpression" &&
    getPropertyName(node) === "write" &&
    ((node.object.type === "Identifier" &&
      databaseVariables.has(node.object.name)) ||
      (node.object.type === "CallExpression" &&
        node.object.callee.type === "Identifier" &&
        node.object.callee.name === "useDatabase"))
  );
}

function isDatabaseSource(node, databaseVariables) {
  return (
    (node?.type === "Identifier" && databaseVariables.has(node.name)) ||
    (node?.type === "CallExpression" &&
      node.callee.type === "Identifier" &&
      node.callee.name === "useDatabase")
  );
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
    const databaseWriteFunctions = new Set();

    return {
      ImportDeclaration(node) {
        const source =
          typeof node.source.value === "string" ? node.source.value : "";
        if (source !== "@monyvi/db" && !source.startsWith("@monyvi/db/")) {
          return;
        }

        for (const specifier of node.specifiers) {
          if (
            specifier.type === "ImportSpecifier" &&
            specifier.imported.type === "Identifier" &&
            specifier.imported.name === "database" &&
            specifier.local.type === "Identifier"
          ) {
            databaseVariables.add(specifier.local.name);
          }
        }
      },

      VariableDeclarator(node) {
        if (!node.id) {
          return;
        }

        if (
          node.id.type === "ObjectPattern" &&
          isDatabaseSource(node.init, databaseVariables)
        ) {
          for (const property of node.id.properties) {
            if (
              property.type === "Property" &&
              property.key.type === "Identifier" &&
              property.key.name === "write" &&
              property.value.type === "Identifier"
            ) {
              databaseWriteFunctions.add(property.value.name);
            }
          }
          return;
        }

        if (node.id.type !== "Identifier") {
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
          return;
        }

        if (isDatabaseWriteMember(node.init, databaseVariables)) {
          databaseWriteFunctions.add(node.id.name);
        }
      },

      CallExpression(node) {
        const callee = node.callee;
        if (
          callee.type === "Identifier" &&
          databaseWriteFunctions.has(callee.name)
        ) {
          context.report({
            node,
            messageId: "dbWriteOutsideService",
          });
          return;
        }

        if (isDatabaseWriteMember(callee, databaseVariables)) {
          context.report({
            node,
            messageId: "dbWriteOutsideService",
          });
        }
      },
    };
  },
};
