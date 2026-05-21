"use strict";

const { RuleTester } = require("eslint");
const rule = require("./monyvi-no-hook-db-write");

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
});

ruleTester.run("monyvi-no-hook-db-write", rule, {
  valid: [
    {
      code: `await database.write(async () => {});`,
      filename: "apps/mobile/services/transaction-service.ts",
    },
    {
      code: `const rows = await database.get("accounts").query().fetch();`,
      filename: "apps/mobile/hooks/useAccounts.ts",
    },
    {
      code: `await database.write(async () => {});`,
      filename: "apps/mobile/hooks/useThing.test.ts",
    },
  ],
  invalid: [
    {
      code: `await database.write(async () => {});`,
      filename: "apps/mobile/hooks/useThing.ts",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `
        const db = useDatabase();
        await db.write(async () => {});
      `,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `await database.write(async () => {});`,
      filename: "apps/mobile/hooks/usePreferredCurrency.ts",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `await database.write(async () => {});`,
      filename: "apps/mobile/utils/transactions.ts",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `await useDatabase().write(async () => {});`,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `
        import { database as localDatabase } from "@monyvi/db";
        await localDatabase.write(async () => {});
      `,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `
        import { database as db } from "../../../../packages/db/src/database";
        await db.write(async () => {});
      `,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `
        import * as db from "@monyvi/db";
        await db.database.write(async () => {});
      `,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `
        const { write } = database;
        await write(async () => {});
      `,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `
        const { write: writeToDatabase } = useDatabase();
        await writeToDatabase(async () => {});
      `,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `
        const writeToDatabase = database.write;
        await writeToDatabase(async () => {});
      `,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `
        const getDatabase = useDatabase;
        const db = getDatabase();
        await db.write(async () => {});
      `,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `
        const getDatabase = useDatabase;
        await getDatabase().write(async () => {});
      `,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `
        import * as wm from "@nozbe/watermelondb/react";
        const db = wm.useDatabase();
        await db.write(async () => {});
      `,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `await (database as unknown as { write: Function }).write(async () => {});`,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
    {
      code: `await database.write!(async () => {});`,
      filename: "apps/mobile/components/Thing.tsx",
      errors: [{ messageId: "dbWriteOutsideService" }],
    },
  ],
});
