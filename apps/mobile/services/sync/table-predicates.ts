import { CHILD_TABLE_NAMES, CHILD_TABLES_MAP, SNAPSHOT_TABLES } from "./config";
import type {
  ChildTableConfig,
  ChildTableName,
  ReadOnlyTableName,
  SnapshotTableName,
  SupabaseTablesNames,
  WritableSupabaseTablesNames,
} from "./types";

export function isSnapshotTable(
  table: SupabaseTablesNames
): table is SnapshotTableName {
  return (SNAPSHOT_TABLES as readonly SupabaseTablesNames[]).includes(table);
}

export function isReadOnlyTable(
  table: SupabaseTablesNames
): table is ReadOnlyTableName {
  return table === "market_rates" || isSnapshotTable(table);
}

export function isWritableTable(
  table: SupabaseTablesNames
): table is WritableSupabaseTablesNames {
  return !isReadOnlyTable(table);
}

export function getChildTableConfig(
  table: SupabaseTablesNames
): ChildTableConfig | undefined {
  return CHILD_TABLE_NAMES.includes(table as ChildTableName)
    ? CHILD_TABLES_MAP[table as ChildTableName]
    : undefined;
}
