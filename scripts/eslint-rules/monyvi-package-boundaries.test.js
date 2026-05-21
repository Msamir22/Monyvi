"use strict";

const { RuleTester } = require("eslint");
const rule = require("./monyvi-package-boundaries");

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
});

ruleTester.run("monyvi-package-boundaries", rule, {
  valid: [
    {
      code: `import { BaseAccount } from "./base/base-account";`,
      filename: "packages/db/src/models/AccountClean.ts",
    },
    {
      code: `import type { CurrencyType } from "@monyvi/db";`,
      filename: "packages/logic/src/utils/currency.ts",
    },
    {
      code: `import { formatCurrency } from "@monyvi/logic";`,
      filename: "apps/mobile/hooks/useCurrency.ts",
    },
    {
      code: `import { Transaction } from "@monyvi/db";`,
      filename: "packages/logic/src/analytics/transaction-analytics.test.ts",
    },
  ],
  invalid: [
    {
      code: `import { formatCurrency } from "@monyvi/logic";`,
      filename: "packages/db/src/models/NewModel.ts",
      errors: [{ messageId: "dbReverseImport" }],
    },
    {
      code: `import { helper } from "@/services/helper";`,
      filename: "packages/db/src/models/NewModel.ts",
      errors: [{ messageId: "dbReverseImport" }],
    },
    {
      code: `import { Transaction } from "@monyvi/db";`,
      filename: "packages/logic/src/analytics/new-analytics.ts",
      errors: [{ messageId: "logicRuntimeDbImport" }],
    },
    {
      code: `import { formatCurrency } from "@monyvi/logic";`,
      filename: "packages/db/src/models/Account.ts",
      errors: [{ messageId: "dbReverseImport" }],
    },
    {
      code: `import { formatCurrency } from "../../../logic/src/utils/currency";`,
      filename: "packages/db/src/models/NewModel.ts",
      errors: [{ messageId: "dbReverseImport" }],
    },
    {
      code: `import { AppState } from "../../../../apps/mobile/services/app-state";`,
      filename: "packages/db/src/models/NewModel.ts",
      errors: [{ messageId: "dbReverseImport" }],
    },
    {
      code: `import { Transaction } from "../../../db/src/models/Transaction";`,
      filename: "packages/logic/src/analytics/new-analytics.ts",
      errors: [{ messageId: "logicRuntimeDbImport" }],
    },
    {
      code: `const logic = require("@monyvi/logic");`,
      filename: "packages/db/src/models/NewModel.ts",
      errors: [{ messageId: "dbReverseImport" }],
    },
    {
      code: `const db = require("../../../db/src");`,
      filename: "packages/logic/src/analytics/new-analytics.ts",
      errors: [{ messageId: "logicRuntimeDbImport" }],
    },
    {
      code: `export { formatCurrency } from "@monyvi/logic";`,
      filename: "packages/db/src/models/NewModel.ts",
      errors: [{ messageId: "dbReverseImport" }],
    },
    {
      code: `export * from "../../../db/src";`,
      filename: "packages/logic/src/analytics/new-analytics.ts",
      errors: [{ messageId: "logicRuntimeDbImport" }],
    },
    {
      code: `await import("@monyvi/logic");`,
      filename: "packages/db/src/models/NewModel.ts",
      errors: [{ messageId: "dbReverseImport" }],
    },
    {
      code: `await import("../../../db/src");`,
      filename: "packages/logic/src/analytics/new-analytics.ts",
      errors: [{ messageId: "logicRuntimeDbImport" }],
    },
  ],
});
