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

function sourceTargetsWatermelonReact(source) {
  return source === "@nozbe/watermelondb/react";
}

function unwrapExpression(node) {
  let current = node;

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

function getPropertyName(memberExpression) {
  const unwrapped = unwrapExpression(memberExpression);
  if (!unwrapped || unwrapped.type !== "MemberExpression") {
    return null;
  }

  const property = unwrapExpression(unwrapped.property);
  if (property.type === "Identifier") {
    return property.name;
  }

  if (property.type === "Literal" && typeof property.value === "string") {
    return property.value;
  }

  return null;
}

function getIdentifierName(node) {
  const unwrapped = unwrapExpression(node);
  return unwrapped?.type === "Identifier" ? unwrapped.name : null;
}

function isUseDatabaseNamespace(node, useDatabaseNamespaces) {
  const identifierName = getIdentifierName(node);
  return Boolean(identifierName && useDatabaseNamespaces.has(identifierName));
}

function isUseDatabaseCall(node, useDatabaseFunctions, useDatabaseNamespaces) {
  const unwrapped = unwrapExpression(node);
  if (unwrapped?.type !== "CallExpression") {
    return false;
  }

  const callee = unwrapExpression(unwrapped.callee);
  if (callee.type === "Identifier") {
    return useDatabaseFunctions.has(callee.name);
  }

  return (
    callee.type === "MemberExpression" &&
    getPropertyName(callee) === "useDatabase" &&
    isUseDatabaseNamespace(callee.object, useDatabaseNamespaces)
  );
}

function isDatabaseNamespaceMember(node, databaseNamespaces) {
  const unwrapped = unwrapExpression(node);
  return (
    unwrapped?.type === "MemberExpression" &&
    getPropertyName(unwrapped) === "database" &&
    unwrapExpression(unwrapped.object).type === "Identifier" &&
    databaseNamespaces.has(unwrapExpression(unwrapped.object).name)
  );
}

function isDatabaseSource(
  node,
  databaseVariables,
  databaseNamespaces,
  useDatabaseFunctions,
  useDatabaseNamespaces
) {
  const unwrapped = unwrapExpression(node);
  return (
    (unwrapped?.type === "Identifier" &&
      databaseVariables.has(unwrapped.name)) ||
    isUseDatabaseCall(unwrapped, useDatabaseFunctions, useDatabaseNamespaces) ||
    isDatabaseNamespaceMember(unwrapped, databaseNamespaces)
  );
}

function isDatabaseWriteMember(
  node,
  databaseVariables,
  databaseNamespaces,
  useDatabaseFunctions,
  useDatabaseNamespaces
) {
  const unwrapped = unwrapExpression(node);
  return (
    unwrapped?.type === "MemberExpression" &&
    getPropertyName(unwrapped) === "write" &&
    isDatabaseSource(
      unwrapped.object,
      databaseVariables,
      databaseNamespaces,
      useDatabaseFunctions,
      useDatabaseNamespaces
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
    const useDatabaseNamespaces = new Set();

    return {
      ImportDeclaration(node) {
        const source =
          typeof node.source.value === "string" ? node.source.value : "";
        if (sourceTargetsWatermelonReact(source)) {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === "ImportNamespaceSpecifier" &&
              specifier.local.type === "Identifier"
            ) {
              useDatabaseNamespaces.add(specifier.local.name);
              continue;
            }

            if (
              specifier.type === "ImportSpecifier" &&
              specifier.imported.type === "Identifier" &&
              specifier.imported.name === "useDatabase" &&
              specifier.local.type === "Identifier"
            ) {
              useDatabaseFunctions.add(specifier.local.name);
            }
          }

          return;
        }

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

        const init = unwrapExpression(node.init);

        if (
          node.id.type === "ObjectPattern" &&
          isDatabaseSource(
            init,
            databaseVariables,
            databaseNamespaces,
            useDatabaseFunctions,
            useDatabaseNamespaces
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

        if (
          node.id.type === "ObjectPattern" &&
          isUseDatabaseNamespace(init, useDatabaseNamespaces)
        ) {
          for (const property of node.id.properties) {
            if (
              property.type === "Property" &&
              property.key.type === "Identifier" &&
              property.key.name === "useDatabase" &&
              property.value.type === "Identifier"
            ) {
              useDatabaseFunctions.add(property.value.name);
            }
          }
          return;
        }

        if (node.id.type !== "Identifier") {
          return;
        }

        if (
          init?.type === "Identifier" &&
          useDatabaseFunctions.has(init.name)
        ) {
          useDatabaseFunctions.add(node.id.name);
          return;
        }

        if (isUseDatabaseNamespace(init, useDatabaseNamespaces)) {
          useDatabaseNamespaces.add(node.id.name);
          return;
        }

        if (init?.type === "Identifier" && databaseVariables.has(init.name)) {
          databaseVariables.add(node.id.name);
          return;
        }

        if (
          isUseDatabaseCall(
            init,
            useDatabaseFunctions,
            useDatabaseNamespaces
          ) ||
          isDatabaseNamespaceMember(init, databaseNamespaces)
        ) {
          databaseVariables.add(node.id.name);
          return;
        }

        if (
          isDatabaseWriteMember(
            init,
            databaseVariables,
            databaseNamespaces,
            useDatabaseFunctions,
            useDatabaseNamespaces
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
            useDatabaseFunctions,
            useDatabaseNamespaces
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
