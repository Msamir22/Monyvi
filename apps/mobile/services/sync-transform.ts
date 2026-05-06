const DATE_ONLY_COLUMNS = [
  "date",
  "due_date",
  "start_date",
  "end_date",
  "next_due_date",
  "purchase_date",
  "period_start",
  "period_end",
  "snapshot_date",
] as const;

const TIMESTAMP_COLUMNS = ["created_at", "updated_at"] as const;

const ALL_DATE_COLUMNS = [...DATE_ONLY_COLUMNS, ...TIMESTAMP_COLUMNS] as const;
const JSON_STRING_COLUMNS = [
  "notification_settings",
  "onboarding_flags",
  "pause_intervals",
] as const;

export { DATE_ONLY_COLUMNS, TIMESTAMP_COLUMNS };

export function transformFromSupabase(
  record: Record<string, unknown>
): Record<string, unknown> {
  const transformed: Record<string, unknown> = { ...record };

  for (const col of ALL_DATE_COLUMNS) {
    if (typeof record[col] === "string") {
      const timestamp = new Date(record[col]).getTime();
      if (!Number.isNaN(timestamp)) {
        transformed[col] = timestamp;
      }
    }
  }

  for (const col of JSON_STRING_COLUMNS) {
    const value = record[col];
    if (value !== null && typeof value === "object") {
      transformed[col] = JSON.stringify(value);
    }
  }

  return transformed;
}
