import { readFileSync } from "fs";
import path from "path";

import { migrations } from "../../../../packages/db/src/migrations";
import { schema } from "../../../../packages/db/src/schema";

function readMigrationSql(): string {
  return readFileSync(
    path.resolve(
      __dirname,
      "../../../../supabase/migrations/051_account_institution_senders.sql"
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

    expect(sql).toContain(
      "regexp_replace(btrim(bank_details.sms_sender_name), '\\s+', ' ', 'g')"
    );
    expect(sql).toContain("bank_details.id");
    expect(sql).toMatch(/DROP COLUMN IF EXISTS bank_name/m);
    expect(sql).toMatch(/DROP COLUMN IF EXISTS sms_sender_name/m);
    expect(bankDetailsColumns).not.toContain("bank_name");
    expect(bankDetailsColumns).not.toContain("sms_sender_name");
  });

  it("enforces provider-aware uniqueness for known and manual providers", () => {
    const sql = readMigrationSql();
    const providerBackfillIndex = sql.indexOf(
      "UPDATE public.accounts AS account"
    );
    const duplicatePreflightIndex = sql.indexOf(
      "Cannot create manual account uniqueness index"
    );

    expect(sql).toMatch(
      /RAISE EXCEPTION 'Cannot create manual account uniqueness index while duplicate active manual accounts exist'/m
    );
    expect(providerBackfillIndex).toBeGreaterThanOrEqual(0);
    expect(duplicatePreflightIndex).toBeGreaterThanOrEqual(0);
    expect(providerBackfillIndex).toBeLessThan(duplicatePreflightIndex);
    expect(sql).not.toMatch(/UPDATE public\.accounts[\s\S]*deleted = true/m);
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_unique_known_provider[\s\S]*ON public\.accounts \(user_id, lower\(btrim\(name\)\), currency, institution_id\)[\s\S]*WHERE deleted = false AND institution_id IS NOT NULL/m
    );
    expect(sql).toMatch(
      /CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_unique_manual_provider[\s\S]*ON public\.accounts \([\s\S]*user_id,[\s\S]*lower\(btrim\(name\)\),[\s\S]*currency,[\s\S]*COALESCE\([\s\S]*NULLIF\(lower\(regexp_replace\(btrim\(provider_display_name\), '\\s\+', ' ', 'g'\)\), ''\),[\s\S]*'__monyvi_no_provider__'[\s\S]*\)[\s\S]*\)[\s\S]*WHERE deleted = false AND institution_id IS NULL/m
    );
  });

  it("updates the WatermelonDB migration chain for the new local schema", () => {
    const serializedMigrations = JSON.stringify(migrations);

    expect(schema.version).toBeGreaterThanOrEqual(21);
    expect(serializedMigrations).toContain("account_sms_senders");
    expect(serializedMigrations).toContain("institution_id");
    expect(serializedMigrations).toContain("provider_display_name");
    expect(serializedMigrations).toContain("bank_name");
    expect(serializedMigrations).toContain("sms_sender_name");
    expect(serializedMigrations).toContain(
      "account_sms_senders_one_active_normalized"
    );
    expect(serializedMigrations).toContain("provider_display_name");
    expect(serializedMigrations).toContain("_status");
    expect(serializedMigrations).toContain("_changed");
    expect(serializedMigrations).toContain("'created'");
    expect(serializedMigrations).toContain("'deleted'");
    expect(serializedMigrations).toContain(
      'coalesce(\\"accounts\\".\\"deleted\\", 0) != 1'
    );
    expect(serializedMigrations).not.toContain(
      'and \\"accounts\\".\\"_status\\" = \'created\''
    );
    expect(serializedMigrations).toContain(
      'when \\"accounts\\".\\"_status\\" = \'created\' then 1'
    );
    expect(serializedMigrations).toContain(
      "coalesce(\\\"bank_details\\\".\\\"_status\\\", 'synced') != 'synced'"
    );
    expect(serializedMigrations).toContain("replace(replace(replace");
    expect(serializedMigrations).toContain(
      'group by\\n    \\"legacy_senders\\".\\"account_id\\",\\n    lower(\\"legacy_senders\\".\\"sender_name\\")'
    );
    expect(serializedMigrations).toContain(
      'min(\\"legacy_senders\\".\\"id\\") as \\"id\\"'
    );
    expect(serializedMigrations).toContain("else 'synced'");
    expect(serializedMigrations).not.toContain("lower(hex(randomblob(4))");
  });
});
