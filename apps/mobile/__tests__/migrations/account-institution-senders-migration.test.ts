import { readFileSync } from "fs";
import path from "path";

import { migrations } from "../../../../packages/db/src/migrations";
import { schema } from "../../../../packages/db/src/schema";

function readMigrationSql(): string {
  return readFileSync(
    path.join(
      process.cwd(),
      "..",
      "..",
      "supabase",
      "migrations",
      "051_account_institution_senders.sql"
    ),
    "utf8"
  );
}

function getColumnNames(tableName: string): readonly string[] {
  return schema.tables[tableName].columnArray.map((column) => column.name);
}

describe("account institution and sender migration", () => {
  it("adds account-level institution identity and provider display columns", () => {
    const sql = readMigrationSql();
    const accountColumns = getColumnNames("accounts");

    expect(sql).toMatch(
      /ALTER TABLE public\.accounts[\s\S]*ADD COLUMN IF NOT EXISTS institution_id TEXT[\s\S]*ADD COLUMN IF NOT EXISTS provider_display_name TEXT/m
    );
    expect(accountColumns).toEqual(
      expect.arrayContaining(["institution_id", "provider_display_name"])
    );
  });

  it("creates account_sms_senders as an account-owned sync child table", () => {
    const sql = readMigrationSql();
    const senderColumns = getColumnNames("account_sms_senders");

    expect(sql).toMatch(
      /CREATE TABLE IF NOT EXISTS public\.account_sms_senders[\s\S]*account_id UUID NOT NULL REFERENCES public\.accounts\(id\)[\s\S]*sender_name TEXT NOT NULL[\s\S]*normalized_sender_name TEXT NOT NULL[\s\S]*created_at timestamptz NOT NULL DEFAULT now\(\)[\s\S]*updated_at timestamptz NOT NULL DEFAULT now\(\)[\s\S]*deleted boolean NOT NULL DEFAULT false/m
    );
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_account_sms_senders_unique_active_normalized[\s\S]*ON public\.account_sms_senders \(account_id, normalized_sender_name\)[\s\S]*WHERE deleted = false/m
    );
    expect(senderColumns).toEqual(
      expect.arrayContaining([
        "account_id",
        "sender_name",
        "normalized_sender_name",
        "created_at",
        "updated_at",
        "deleted",
      ])
    );
  });

  it("moves provider and sender ownership out of active bank_details columns", () => {
    const sql = readMigrationSql();
    const bankDetailsColumns = getColumnNames("bank_details");

    expect(sql).toMatch(/DROP COLUMN IF EXISTS bank_name/m);
    expect(sql).toMatch(/DROP COLUMN IF EXISTS sms_sender_name/m);
    expect(bankDetailsColumns).not.toContain("bank_name");
    expect(bankDetailsColumns).not.toContain("sms_sender_name");
  });

  it("enforces provider-aware uniqueness for known providers and legacy uniqueness for manual providers", () => {
    const sql = readMigrationSql();

    expect(sql).toMatch(
      /WITH duplicate_manual_accounts AS \([\s\S]*row_number\(\) OVER \([\s\S]*PARTITION BY user_id, lower\(name\), currency[\s\S]*UPDATE public\.accounts[\s\S]*deleted = true[\s\S]*duplicate_rank > 1/m
    );
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_unique_known_provider[\s\S]*ON public\.accounts \(user_id, lower\(name\), currency, institution_id\)[\s\S]*WHERE deleted = false AND institution_id IS NOT NULL/m
    );
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_unique_manual_provider[\s\S]*ON public\.accounts \(user_id, lower\(name\), currency\)[\s\S]*WHERE deleted = false AND institution_id IS NULL/m
    );
  });

  it("updates the WatermelonDB migration chain for the new local schema", () => {
    expect(schema.version).toBeGreaterThanOrEqual(21);
    expect(JSON.stringify(migrations)).toContain("account_sms_senders");
    expect(JSON.stringify(migrations)).toContain("institution_id");
    expect(JSON.stringify(migrations)).toContain("provider_display_name");
  });
});
