const assert = require("node:assert/strict");
const test = require("node:test");

const {
  filterSchemaChangesAlreadyInWatermelon,
  parseSql,
} = require("./sql-to-watermelon-migration");

test("filters ADD COLUMN IF NOT EXISTS when the column already exists in schema.ts", () => {
  const sql = `
    ALTER TABLE public.user_category_settings
      ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
  `;
  const schema = `
    tableSchema({
      name: "user_category_settings",
      columns: [
        { name: "category_id", type: "string", isIndexed: true },
        { name: "deleted", type: "boolean" },
      ],
    }),
  `;

  const parsed = parseSql(sql);
  const filtered = filterSchemaChangesAlreadyInWatermelon(
    schema,
    parsed.addColumns,
    parsed.createTables
  );

  assert.deepEqual(filtered.addColumns, {});
  assert.deepEqual(filtered.createTables, {});
  assert.deepEqual(filtered.skipped, ["user_category_settings.deleted"]);
});

test("keeps ADD COLUMN IF NOT EXISTS when the column is missing from schema.ts", () => {
  const sql = `
    ALTER TABLE public.accounts
      ADD COLUMN IF NOT EXISTS provider_display_name TEXT;
  `;
  const schema = `
    tableSchema({
      name: "accounts",
      columns: [
        { name: "name", type: "string" },
      ],
    }),
  `;

  const parsed = parseSql(sql);
  const filtered = filterSchemaChangesAlreadyInWatermelon(
    schema,
    parsed.addColumns,
    parsed.createTables
  );

  assert.deepEqual(Object.keys(filtered.addColumns), ["accounts"]);
  assert.equal(filtered.addColumns.accounts[0].name, "provider_display_name");
  assert.deepEqual(filtered.skipped, []);
});

test("filters CREATE TABLE when the table already exists in schema.ts", () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.categories (
      id UUID PRIMARY KEY,
      system_name TEXT NOT NULL
    );
  `;
  const schema = `
    tableSchema({
      name: "categories",
      columns: [
        { name: "system_name", type: "string" },
      ],
    }),
  `;

  const parsed = parseSql(sql);
  const filtered = filterSchemaChangesAlreadyInWatermelon(
    schema,
    parsed.addColumns,
    parsed.createTables
  );

  assert.deepEqual(filtered.addColumns, {});
  assert.deepEqual(filtered.createTables, {});
  assert.deepEqual(filtered.skipped, ["categories"]);
});
