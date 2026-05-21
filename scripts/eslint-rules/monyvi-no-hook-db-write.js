"use strict";

const path = require("path");

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

function resolveRelativeSource(fileName, source) {
  if (!source.startsWith(".")) {
    return source;
  }

  return path.posix.normalize(
    path.posix.join(path.posix.dirname(normalizePath(fileName)), source)
  );
}

function sourceTargetsDatabase(fileName, source) {
  if (source === "@monyvi/db" || source.startsWith("@monyvi/db/")) {
    return true;
  }

  const resolved = resolveRelativeSource(fileName, source);
  return (
    resolved === "packages/db" ||
    resolved.startsWith("packages/db/") ||
    resolved.includes("/packages/db/")
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

function isUseDatabaseCall(node, useDatabaseFunctions) {
  return (
    node?.type === "CallExpression" &&
    node.callee.type === "Identifier" &&
    useDatabaseFunctions.has(node.callee.name)
  );
}

function isDatabaseNamespaceMember(node, databaseNamespaces) {
  return (
    node?.type === "MemberExpression" &&
    getPropertyName(node) === "database" &&
    node.object.type === "Identifier" &&
    databaseNamespaces.has(node.object.name)
  );
}

function isDatabaseSource(
  node,
  databaseVariables,
  databaseNamespaces,
  useDatabaseFunctions
) {
  return (
    (node?.type === "Identifier" && databaseVariables.has(node.name)) ||
    isUseDatabaseCall(node, useDatabaseFunctions) ||
    isDatabaseNamespaceMember(node, databaseNamespaces)
  );
}

function isDatabaseWriteMember(
  node,
  databaseVariables,
  databaseNamespaces,
  useDatabaseFunctions
) {
  return (
    node?.type === "MemberExpression" &&
    getPropertyName(node) === "write" &&
    isDatabaseSource(
      node.object,
      databaseVariables,
      databaseNamespaces,
      useDatabaseFunctions
    )
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
    const databaseNamespaces = new Set();
    const databaseWriteFunctions = new Set();
    const useDatabaseFunctions = new Set(["useDatabase"]);

    return {
      ImportDeclaration(node) {
        const source =
          typeof node.source.value === "string" ? node.source.value : "";
        if (!sourceTargetsDatabase(fileName, source)) {
          return;
        }

        for (const specifier of node.specifiers) {
          if (
            specifier.type === "ImportNamespaceSpecifier" &&
            specifier.local.type === "Identifier"
          ) {
            databaseNamespaces.add(specifier.local.name);
            continue;
          }

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
          isDatabaseSource(
            node.init,
            databaseVariables,
            databaseNamespaces,
            useDatabaseFunctions
          )
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
          useDatabaseFunctions.has(node.init.name)
        ) {
          useDatabaseFunctions.add(node.id.name);
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
          isUseDatabaseCall(node.init, useDatabaseFunctions) ||
          isDatabaseNamespaceMember(node.init, databaseNamespaces)
        ) {
          databaseVariables.add(node.id.name);
          return;
        }

        if (
          isDatabaseWriteMember(
            node.init,
            databaseVariables,
            databaseNamespaces,
            useDatabaseFunctions
          )
        ) {
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

        if (
          isDatabaseWriteMember(
            callee,
            databaseVariables,
            databaseNamespaces,
            useDatabaseFunctions
          )
        ) {
          context.report({
            node,
            messageId: "dbWriteOutsideService",
          });
        }
      },
    };
  },
};
