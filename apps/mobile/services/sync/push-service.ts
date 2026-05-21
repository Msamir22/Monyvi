import type { Database } from "@nozbe/watermelondb";
import type {
  SyncPushArgs,
  SyncPushResult,
  SyncTableChangeSet,
} from "@nozbe/watermelondb/sync";

import { logger } from "@/utils/logger";

import { getCurrentUserId, supabase } from "../supabase";
import { SYNCABLE_TABLES, type SyncableTable } from "./config";
import { createSyncTableError } from "./errors";
import {
  assertPushRecordBelongsToCurrentUser,
  fetchOwnedParentIds,
} from "./ownership-guards";
import { getChildTableConfig, isWritableTable } from "./table-predicates";
import { transformToSupabase } from "./transforms";
import type { SupabaseWriteTable, WritableSupabaseTablesNames } from "./types";

function getSupabaseWriteTable(
  table: WritableSupabaseTablesNames
): SupabaseWriteTable {
  return supabase.from(table) as unknown as SupabaseWriteTable;
}

export async function pushChanges(
  database: Database,
  pushArgs: SyncPushArgs
): Promise<SyncPushResult | undefined | void> {
  const userId = await getCurrentUserId();
  if (!userId) {
    logger.debug("sync.push.skippedUnauthenticated");
    return;
  }

  const { changes } = pushArgs;
  for (const [tableName, rawTableChanges] of Object.entries(changes)) {
    const table = tableName as SyncableTable;
    if (!SYNCABLE_TABLES.includes(tableName as SyncableTable)) {
      continue;
    }
    const tableChanges = rawTableChanges as SyncTableChangeSet;

    if (!isWritableTable(table)) {
      continue;
    }

    const childConfig = getChildTableConfig(table);
    const isChildTable = childConfig !== undefined;

    try {
      const hasChildWrites =
        isChildTable &&
        (tableChanges.created.length > 0 || tableChanges.updated.length > 0);
      const hasChildDeletes = isChildTable && tableChanges.deleted.length > 0;
      const activeParentIds =
        childConfig && hasChildWrites
          ? await fetchOwnedParentIds(database, childConfig.parentTable, userId)
          : null;
      const deleteParentIds =
        childConfig && hasChildDeletes
          ? await fetchOwnedParentIds(
              database,
              childConfig.parentTable,
              userId,
              {
                includeDeleted: true,
              }
            )
          : null;

      if (tableChanges.created.length > 0) {
        const records: Array<Record<string, unknown>> =
          tableChanges.created.map((record) => {
            assertPushRecordBelongsToCurrentUser(
              table,
              record,
              userId,
              childConfig,
              activeParentIds
            );
            return transformToSupabase(table, record, userId, isChildTable);
          });

        const { error } = await getSupabaseWriteTable(table).insert(records);
        if (error) {
          throw createSyncTableError("insert", table, error);
        }
      }

      if (tableChanges.updated.length > 0) {
        for (const record of tableChanges.updated) {
          assertPushRecordBelongsToCurrentUser(
            table,
            record,
            userId,
            childConfig,
            activeParentIds
          );
          const transformed = transformToSupabase(
            table,
            record,
            userId,
            isChildTable
          );

          const { error } = await getSupabaseWriteTable(table).upsert(
            transformed,
            { onConflict: "id" }
          );
          if (error) {
            throw createSyncTableError("upsert", table, error);
          }
        }
      }

      if (tableChanges.deleted.length > 0) {
        let query = getSupabaseWriteTable(table).update({
          deleted: true,
          updated_at: new Date().toISOString(),
        });

        if (childConfig && deleteParentIds) {
          query = query.in(childConfig.foreignKey, deleteParentIds);
        } else if (!isChildTable) {
          query = query.eq("user_id", userId);
        }

        const { error } = await query.in("id", tableChanges.deleted);
        if (error) {
          throw createSyncTableError("delete", table, error);
        }
      }
    } catch (err) {
      logger.error("sync.push.table.failed", err, { table });
      throw err;
    }
  }
}
