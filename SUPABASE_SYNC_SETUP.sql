create table if not exists public.todo_sync (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.todo_sync enable row level security;

drop policy if exists "todo_sync_select" on public.todo_sync;
drop policy if exists "todo_sync_insert" on public.todo_sync;
drop policy if exists "todo_sync_update" on public.todo_sync;

create policy "todo_sync_select"
on public.todo_sync
for select
to anon
using (true);

create policy "todo_sync_insert"
on public.todo_sync
for insert
to anon
with check (true);

create policy "todo_sync_update"
on public.todo_sync
for update
to anon
using (true)
with check (true);

alter publication supabase_realtime add table public.todo_sync;
