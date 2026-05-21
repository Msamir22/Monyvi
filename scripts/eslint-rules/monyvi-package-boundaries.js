"use strict";

const path = require("path");

const KNOWN_DEBT_FILE_SUFFIXES = [
  "packages/db/src/models/Account.ts",
  "packages/db/src/models/Budget.ts",
  "packages/db/src/models/Transaction.ts",
  "packages/logic/src/analytics/transaction-analytics.ts",
  "packages/logic/src/parsers/notification-parser.ts",
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

function isInsidePackage(fileName, packageName) {
  const normalized = normalizePath(fileName);
  return normalized.includes(`packages/${packageName}/`);
}

function resolveRelativeSource(fileName, source) {
  if (!source.startsWith(".")) {
    return source;
  }

  return path.posix.normalize(
    path.posix.join(path.posix.dirname(normalizePath(fileName)), source)
  );
}

function sourceTargetsPackage(fileName, source, packageName) {
  if (
    source === `@monyvi/${packageName}` ||
    source.startsWith(`@monyvi/${packageName}/`)
  ) {
    return true;
  }

  const resolved = resolveRelativeSource(fileName, source);
  return (
    resolved === `packages/${packageName}` ||
    resolved.startsWith(`packages/${packageName}/`) ||
    resolved.includes(`/packages/${packageName}/`)
  );
}

function sourceTargetsMobileApp(fileName, source) {
  if (source.startsWith("apps/mobile") || source.startsWith("@/")) {
    return true;
  }

  const resolved = resolveRelativeSource(fileName, source);
  return (
    resolved === "apps/mobile" ||
    resolved.startsWith("apps/mobile/") ||
    resolved.includes("/apps/mobile/")
  );
}

function isTypeOnlyImport(node) {
  if (node.importKind === "type") {
    return true;
  }

  return (
    node.specifiers.length > 0 &&
    node.specifiers.every((specifier) => specifier.importKind === "type")
  );
}

function isTypeOnlyExport(node) {
  return node.exportKind === "type";
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Enforce Monyvi package dependency direction: apps/mobile -> packages/logic -> packages/db.",
      recommended: false,
    },
    schema: [],
    messages: {
      dbReverseImport:
        "packages/db must not import from '{{source}}'. Move formatting/parsing/app concerns out of the DB package.",
      logicRuntimeDbImport:
        "packages/logic may import @monyvi/db for types only. Use import type or a plain interface instead of a runtime DB dependency.",
    },
  },

  create(context) {
    const fileName = context.getFilename();
    if (isKnownDebtFile(fileName) || isTestFile(fileName)) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        checkImportLikeNode(node, isTypeOnlyImport(node));
      },

      ExportNamedDeclaration(node) {
        checkImportLikeNode(node, isTypeOnlyExport(node));
      },

      ExportAllDeclaration(node) {
        checkImportLikeNode(node, isTypeOnlyExport(node));
      },

      CallExpression(node) {
        if (
          node.callee.type !== "Identifier" ||
          node.callee.name !== "require" ||
          node.arguments.length !== 1
        ) {
          return;
        }

        const sourceNode = node.arguments[0];
        if (
          sourceNode.type !== "Literal" ||
          typeof sourceNode.value !== "string"
        ) {
          return;
        }

        checkSource(node, sourceNode.value, false);
      },
    };

    function checkImportLikeNode(node, isTypeOnly) {
      if (!node.source || typeof node.source.value !== "string") {
        return;
      }

      checkSource(node, node.source.value, isTypeOnly);
    }

    function checkSource(node, source, isTypeOnly) {
      if (
        isInsidePackage(fileName, "db") &&
        (sourceTargetsPackage(fileName, source, "logic") ||
          sourceTargetsMobileApp(fileName, source))
      ) {
        context.report({
          node,
          messageId: "dbReverseImport",
          data: { source },
        });
        return;
      }

      if (
        isInsidePackage(fileName, "logic") &&
        sourceTargetsPackage(fileName, source, "db") &&
        !isTypeOnly
      ) {
        context.report({
          node,
          messageId: "logicRuntimeDbImport",
        });
      }
    }
  },
};
