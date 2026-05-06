# Contract: Sync Services

## Full Sync

Existing service:

```ts
export function syncDatabase(
  database: Database,
  forceFullSync?: boolean
): Promise<void>;
```

**Rules**:

- Remains the only path that advances WatermelonDB's global sync cursor.
- Runs in the background after bootstrap-based routing.
- Keeps the existing module-level concurrency guard.
- Pulls all syncable current-user data, ownerless system categories, market
  rates, and user-scoped snapshot data according to existing sync rules.
- Background failure after routing updates non-blocking sync status; it does not
  route back to startup recovery.

## Shared Reference Refresh

New service:

```ts
export interface SharedReferenceRefreshResult {
  readonly marketRates: "applied" | "skipped" | "failed";
  readonly systemCategories: "applied" | "skipped" | "failed";
}

export function refreshSharedReferenceDataAfterAuth(
  database: Database
): Promise<SharedReferenceRefreshResult>;
```

**Rules**:

- Runs only after authentication and successful profile bootstrap.
- Fetches only `market_rates` and ownerless system categories.
- Must not fetch custom categories.
- Must not fetch dashboard-specific user data.
- Must not block the startup route decision. In issue 381, dashboard content may
  still wait behind a dashboard-shaped skeleton until the first post-bootstrap
  dashboard dependency refresh settles because market rates and system
  categories are dashboard dependencies.
- Should reuse the same remote transform/apply adapter as profile bootstrap.

## Remote Apply Adapter

New local adapter:

```ts
export function applyRemoteChangeSetWithoutCursor(
  database: Database,
  changes: SyncDatabaseChangeSet
): Promise<void>;
```

**Rules**:

- Wraps WatermelonDB remote apply details in one file.
- Does not call `setLastPulledAt`.
- Uses `sendCreatedAsUpdated: true` for first-install/cache-clear cases.
- Has tests proving local records are not marked dirty after remote apply.
