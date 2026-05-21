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
      code: `import { database } from "@monyvi/db/database";`,
      filename: "apps/mobile/app/(private)/new-screen.tsx",
      errors: [{ messageId: "rawDatabaseImport" }],
    },
    {
      code: `import { database } from "../../../../packages/db/src/database";`,
      filename: "apps/mobile/app/(private)/new-screen.tsx",
      errors: [{ messageId: "rawDatabaseImport" }],
    },
    {
      code: `import * as db from "@monyvi/db";`,
      filename: "apps/mobile/components/NewDrawer.tsx",
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
    {
      code: `
        const getDatabase = useDatabase;
        const database = getDatabase();
      `,
      filename: "apps/mobile/components/NewDrawer.tsx",
      errors: [{ messageId: "rawUseDatabase" }],
    },
    {
      code: `
        import * as wm from "@nozbe/watermelondb/react";
        const database = wm.useDatabase();
      `,
      filename: "apps/mobile/components/NewDrawer.tsx",
      errors: [{ messageId: "rawUseDatabase" }],
    },
    {
      code: `
        import * as wm from "@nozbe/watermelondb/react";
        const database = (wm as unknown as typeof wm).useDatabase();
      `,
      filename: "apps/mobile/components/NewDrawer.tsx",
      errors: [{ messageId: "rawUseDatabase" }],
    },
    {
      code: `
        import * as wm from "@nozbe/watermelondb/react";
        const lib = wm;
        const database = lib.useDatabase();
      `,
      filename: "apps/mobile/components/NewDrawer.tsx",
      errors: [{ messageId: "rawUseDatabase" }],
    },
    {
      code: `
        import * as wm from "@nozbe/watermelondb/react";
        const { useDatabase: getDb } = wm;
        const database = getDb();
      `,
      filename: "apps/mobile/components/NewDrawer.tsx",
      errors: [{ messageId: "rawUseDatabase" }],
    },
    {
      code: `
        const getDatabase = useDatabase as unknown as (() => unknown);
        getDatabase();
      `,
      filename: "apps/mobile/components/NewDrawer.tsx",
      errors: [{ messageId: "rawUseDatabase" }],
    },
  ],
});
