"use strict";

const path = require("path");

const KNOWN_DEBT_FILE_SUFFIXES = ["apps/mobile/app/(private)/startup.tsx"];

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
    unwrapExpression(callee.object).type === "Identifier" &&
    useDatabaseNamespaces.has(unwrapExpression(callee.object).name)
  );
}

function isUiFile(fileName) {
  const normalized = normalizePath(fileName);
  return (
    normalized.includes("apps/mobile/app/") ||
    normalized.includes("apps/mobile/components/")
  );
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prevent routes and components from owning raw WatermelonDB access.",
      recommended: false,
    },
    schema: [],
    messages: {
      rawDatabaseImport:
        "Components and routes must not import the raw database object. Use hooks/facades or services instead.",
      rawUseDatabase:
        "Components and routes must not call useDatabase() directly. Move data access behind a hook/facade or service.",
    },
  },

  create(context) {
    const fileName = context.getFilename();
    if (
      !isUiFile(fileName) ||
      isKnownDebtFile(fileName) ||
      isTestFile(fileName)
    ) {
      return {};
    }

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

        const hasDatabaseImport = node.specifiers.some(
          (specifier) =>
            specifier.type === "ImportNamespaceSpecifier" ||
            (specifier.type === "ImportSpecifier" &&
              specifier.imported.type === "Identifier" &&
              specifier.imported.name === "database")
        );

        if (hasDatabaseImport) {
          context.report({
            node,
            messageId: "rawDatabaseImport",
          });
        }
      },

      VariableDeclarator(node) {
        const init = unwrapExpression(node.init);
        if (
          node.id.type === "Identifier" &&
          init?.type === "Identifier" &&
          useDatabaseFunctions.has(init.name)
        ) {
          useDatabaseFunctions.add(node.id.name);
        }
      },

      CallExpression(node) {
        if (
          isUseDatabaseCall(node, useDatabaseFunctions, useDatabaseNamespaces)
        ) {
          context.report({
            node,
            messageId: "rawUseDatabase",
          });
        }
      },
    };
  },
};
