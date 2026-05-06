begin;

grant select on table public.market_rates to authenticated;
grant select on table public.categories to authenticated;

drop policy if exists "Allow authenticated read access" on public.market_rates;
drop policy if exists "Authenticated users can read market rates" on public.market_rates;

create policy "Authenticated users can read market rates"
on public.market_rates
for select
to authenticated
using (true);

drop policy if exists "Users can view system categories" on public.categories;
drop policy if exists "Authenticated users can read ownerless system categories" on public.categories;

create policy "Authenticated users can read ownerless system categories"
on public.categories
for select
to authenticated
using (
  is_system = true
  and user_id is null
  and deleted = false
);

drop policy if exists "Users can view own custom categories" on public.categories;

create policy "Users can view own custom categories"
on public.categories
for select
to authenticated
using (user_id = (select auth.uid()));

commit;
