# Contract: RLS Authenticated Shared Reference Data

## Migration

Create a local SQL migration:

```text
supabase/migrations/046_authenticated_shared_reference_data_rls.sql
```

## Market Rates

Required access model:

```sql
grant select on table public.market_rates to authenticated;

create policy "Authenticated users can read market rates"
on public.market_rates
for select
to authenticated
using (true);
```

If an existing market-rate select policy conflicts, replace it in the migration
with an idempotent `DROP POLICY IF EXISTS` followed by the new policy.

## Categories

Required authenticated shared access model:

```sql
grant select on table public.categories to authenticated;

create policy "Authenticated users can read ownerless system categories"
on public.categories
for select
to authenticated
using (
  is_system = true
  and user_id is null
  and deleted = false
);
```

Required private custom access model:

```sql
create policy "Users can read own custom categories"
on public.categories
for select
to authenticated
using (
  user_id = (select auth.uid())
);
```

Existing insert/update/delete policies for custom categories must remain
authenticated and owner-scoped.

Do not filter authenticated owner-scoped SELECT policies by `deleted = false`.
The normal WatermelonDB sync pull needs soft-deleted rows so it can delete local
records. App-facing queries should filter deleted rows locally or in the sync
pull query where appropriate.

## Verification Queries

- Signed-out/pre-auth mobile startup does not request `categories` or
  `market_rates`.
- As authenticated user A, `select * from market_rates` succeeds.
- As authenticated user A, category reads include ownerless system categories
  and user A's custom categories.
- As authenticated user A, category reads do not include user B's custom
  categories.
- A row with `user_id is not null` and `is_system = true` is not visible to
  authenticated user B.
