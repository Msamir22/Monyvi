import type { Database } from "@nozbe/watermelondb";
import type { SyncDatabaseChangeSet } from "@nozbe/watermelondb/sync";
import applyRemoteChanges from "@nozbe/watermelondb/sync/impl/applyRemote";

export function applyRemoteChangeSetWithoutCursor(
  database: Database,
  changes: SyncDatabaseChangeSet
): Promise<void> {
  return database.write(async () => {
    await applyRemoteChanges(changes, {
      db: database,
      sendCreatedAsUpdated: true,
    });
  });
}
