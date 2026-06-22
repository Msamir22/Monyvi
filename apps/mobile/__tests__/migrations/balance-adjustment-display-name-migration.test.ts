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
      "055_rename_balance_adjustment_categories.sql"
    ),
    "utf8"
  );
}

describe("balance adjustment display name migration", () => {
  it("uses the shared Balance Adjustment display name for both balance adjustment categories", () => {
    const sql = readMigrationSql();

    expect(sql).toMatch(
      /UPDATE public\.categories[\s\S]*SET[\s\S]*display_name = 'Balance Adjustment'[\s\S]*updated_at = now\(\)[\s\S]*WHERE system_name IN \('balance_adjustment_income', 'balance_adjustment_expense'\)[\s\S]*user_id IS NULL/m
    );
  });
});
