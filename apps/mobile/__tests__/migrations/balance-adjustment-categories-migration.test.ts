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
      "053_fix_balance_adjustment_categories.sql"
    ),
    "utf8"
  );
}

describe("balance adjustment categories migration", () => {
  it("replaces invalid balance adjustment category icons and long labels", () => {
    const sql = readMigrationSql();

    expect(sql).toMatch(
      /UPDATE public\.categories[\s\S]*SET[\s\S]*display_name = 'Adj\. Income'[\s\S]*icon = 'trending-up'[\s\S]*icon_library = 'Ionicons'[\s\S]*WHERE system_name = 'balance_adjustment_income'[\s\S]*user_id IS NULL/m
    );
    expect(sql).toMatch(
      /UPDATE public\.categories[\s\S]*SET[\s\S]*display_name = 'Adj\. Expense'[\s\S]*icon = 'trending-down'[\s\S]*icon_library = 'Ionicons'[\s\S]*WHERE system_name = 'balance_adjustment_expense'[\s\S]*user_id IS NULL/m
    );
  });
});
