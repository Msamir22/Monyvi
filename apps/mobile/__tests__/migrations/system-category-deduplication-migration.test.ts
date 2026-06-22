import { readFileSync } from "fs";
import path from "path";

function readMigrationSql(): string {
  return readFileSync(
    path.join(
      process.cwd(),
      "..",
      "..",
      "supabase",
      "migrations",
      "056_dedupe_system_categories.sql"
    ),
    "utf8"
  );
}

describe("system category deduplication migration", () => {
  it("builds a canonical duplicate map for active shared system categories", () => {
    const sql = readMigrationSql();

    expect(sql).toMatch(
      /CREATE TEMP TABLE duplicate_system_categories_to_merge/m
    );
    expect(sql).toMatch(
      /PARTITION BY[\s\S]*parent_id[\s\S]*system_name[\s\S]*level[\s\S]*type/m
    );
    expect(sql).toMatch(
      /WHERE[\s\S]*user_id IS NULL[\s\S]*is_system = true[\s\S]*deleted = false/m
    );
  });

  it("repoints category references before soft-deleting duplicate category rows", () => {
    const sql = readMigrationSql();

    expect(sql).toMatch(
      /UPDATE public\.transactions[\s\S]*SET[\s\S]*category_id = duplicate_map\.canonical_id/m
    );
    expect(sql).toMatch(
      /UPDATE public\.recurring_payments[\s\S]*SET[\s\S]*category_id = duplicate_map\.canonical_id/m
    );
    expect(sql).toMatch(
      /UPDATE public\.budgets[\s\S]*SET[\s\S]*category_id = duplicate_map\.canonical_id/m
    );
    expect(sql).toMatch(
      /UPDATE public\.categories[\s\S]*SET[\s\S]*parent_id = duplicate_map\.canonical_id/m
    );
    expect(sql).toMatch(
      /UPDATE public\.categories[\s\S]*SET[\s\S]*deleted = true[\s\S]*WHERE categories\.id = duplicate_map\.duplicate_id/m
    );
  });

  it("merges duplicate user category settings without violating active uniqueness", () => {
    const sql = readMigrationSql();

    expect(sql).toMatch(
      /ALTER TABLE public\.user_category_settings[\s\S]*ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false/m
    );
    expect(sql).toMatch(
      /UPDATE public\.user_category_settings[\s\S]*SET[\s\S]*deleted = true[\s\S]*settings_to_merge\.rank_in_logical_category > 1/m
    );
    expect(sql).toMatch(
      /UPDATE public\.user_category_settings[\s\S]*SET[\s\S]*category_id = settings_to_merge\.canonical_id[\s\S]*settings_to_merge\.rank_in_logical_category = 1/m
    );
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_user_category_settings_unique_active/m
    );
  });

  it("replaces the nullable system category uniqueness guard with partial indexes", () => {
    const sql = readMigrationSql();

    expect(sql).toMatch(
      /DROP INDEX IF EXISTS public\.idx_categories_unique_name/m
    );
    expect(sql).toMatch(/idx_categories_unique_active_system_root_typed/m);
    expect(sql).toMatch(/idx_categories_unique_active_system_child_typed/m);
    expect(sql).toMatch(/idx_categories_unique_active_system_root_untyped/m);
    expect(sql).toMatch(/idx_categories_unique_active_system_child_untyped/m);
    expect(sql).toMatch(/idx_categories_unique_active_custom_root/m);
    expect(sql).toMatch(/idx_categories_unique_active_custom_child/m);
  });
});
