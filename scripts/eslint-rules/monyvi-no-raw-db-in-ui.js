"use strict";

const KNOWN_DEBT_FILE_SUFFIXES = [
  "apps/mobile/app/(private)/settings.tsx",
  "apps/mobile/app/(private)/startup.tsx",
  "apps/mobile/components/navigation/AppDrawer.tsx",
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

    return {
      ImportDeclaration(node) {
        const source =
          typeof node.source.value === "string" ? node.source.value : "";
        if (source !== "@monyvi/db" && !source.startsWith("@monyvi/db/")) {
          return;
        }

        const hasDatabaseImport = node.specifiers.some(
          (specifier) =>
            specifier.type === "ImportSpecifier" &&
            specifier.imported.type === "Identifier" &&
            specifier.imported.name === "database"
        );

        if (hasDatabaseImport) {
          context.report({
            node,
            messageId: "rawDatabaseImport",
          });
        }
      },

      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          node.callee.name === "useDatabase"
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
