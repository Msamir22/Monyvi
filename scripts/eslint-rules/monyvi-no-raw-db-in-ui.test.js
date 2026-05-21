"use strict";

const { RuleTester } = require("eslint");
const rule = require("./monyvi-no-raw-db-in-ui");

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
});

ruleTester.run("monyvi-no-raw-db-in-ui", rule, {
  valid: [
    {
      code: `import type { Account } from "@monyvi/db";`,
      filename: "apps/mobile/components/accounts/AccountCard.tsx",
    },
    {
      code: `const database = useDatabase();`,
      filename: "apps/mobile/hooks/useAccounts.ts",
    },
    {
      code: `import { database } from "@monyvi/db";`,
      filename: "apps/mobile/app/(private)/startup.test.tsx",
    },
  ],
  invalid: [
    {
      code: `import { database } from "@monyvi/db";`,
      filename: "apps/mobile/app/(private)/new-screen.tsx",
      errors: [{ messageId: "rawDatabaseImport" }],
    },
    {
      code: `const database = useDatabase();`,
      filename: "apps/mobile/components/NewDrawer.tsx",
      errors: [{ messageId: "rawUseDatabase" }],
    },
    {
      code: `const database = useDatabase();`,
      filename: "apps/mobile/components/navigation/AppDrawer.tsx",
      errors: [{ messageId: "rawUseDatabase" }],
    },
    {
      code: `const database = useDatabase();`,
      filename: "apps/mobile/app/(private)/settings.tsx",
      errors: [{ messageId: "rawUseDatabase" }],
    },
  ],
});
