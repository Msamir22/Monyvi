const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const migrationPaths = [
  "supabase/migrations/056_dedupe_system_categories.sql",
  "supabase/migrations/057_repair_system_category_dedupe.sql",
  "supabase/migrations/058_repair_deleted_parent_system_category_children.sql",
];

function readMigration(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

function assertCustomCategoryIndexesUseSystemName(sql, migrationPath) {
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_custom_root_typed\s+ON public\.categories \(user_id, system_name, type\)[\s\S]*?AND parent_id IS NULL[\s\S]*?AND type IS NOT NULL;/,
    `${migrationPath} should define typed custom root uniqueness by user, system name, and type`
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_custom_root_untyped\s+ON public\.categories \(user_id, system_name\)[\s\S]*?AND parent_id IS NULL[\s\S]*?AND type IS NULL;/,
    `${migrationPath} should define untyped custom root uniqueness by user and system name`
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_custom_child_typed\s+ON public\.categories \(user_id, parent_id, system_name, type\)[\s\S]*?AND parent_id IS NOT NULL[\s\S]*?AND type IS NOT NULL;/,
    `${migrationPath} should define typed custom child uniqueness by user, parent, system name, and type`
  );
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_custom_child_untyped\s+ON public\.categories \(user_id, parent_id, system_name\)[\s\S]*?AND parent_id IS NOT NULL[\s\S]*?AND type IS NULL;/,
    `${migrationPath} should define untyped custom child uniqueness by user, parent, and system name`
  );
  assert.doesNotMatch(
    sql,
    /ON public\.categories \(user_id, (?:parent_id, )?display_name, type\)/,
    `${migrationPath} should not use display_name for custom category uniqueness`
  );
}

for (const migrationPath of migrationPaths) {
  test(`${migrationPath} uses the approved custom category uniqueness keys`, () => {
    assertCustomCategoryIndexesUseSystemName(
      readMigration(migrationPath),
      migrationPath
    );
  });
}
