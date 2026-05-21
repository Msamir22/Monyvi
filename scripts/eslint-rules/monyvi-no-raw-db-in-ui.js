"use strict";

const path = require("path");

const KNOWN_DEBT_FILE_SUFFIXES = [
  "apps/mobile/app/(private)/settings.tsx",
  "apps/mobile/app/(private)/startup.tsx",
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

    return {
      ImportDeclaration(node) {
        const source =
          typeof node.source.value === "string" ? node.source.value : "";
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
        if (
          node.id.type === "Identifier" &&
          node.init?.type === "Identifier" &&
          useDatabaseFunctions.has(node.init.name)
        ) {
          useDatabaseFunctions.add(node.id.name);
        }
      },

      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          useDatabaseFunctions.has(node.callee.name)
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
