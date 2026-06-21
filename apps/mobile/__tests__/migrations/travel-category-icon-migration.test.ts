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
      "054_fix_travel_category_icon.sql"
    ),
    "utf8"
  );
}

describe("travel category icon migration", () => {
  it("normalizes shared travel category rows to the supported Ionicons airplane glyph", () => {
    const sql = readMigrationSql();

    expect(sql).toMatch(
      /UPDATE public\.categories[\s\S]*SET[\s\S]*icon = 'airplane'[\s\S]*icon_library = 'Ionicons'[\s\S]*updated_at = now\(\)[\s\S]*WHERE system_name = 'travel'[\s\S]*user_id IS NULL/m
    );
    expect(sql).not.toMatch(/level\s*=\s*1/m);
  });
});
