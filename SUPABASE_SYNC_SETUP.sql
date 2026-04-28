create table if not exists public.todo_user_sync (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.todo_user_sync enable row level security;

drop policy if exists "todo_user_sync_select_own" on public.todo_user_sync;
drop policy if exists "todo_user_sync_insert_own" on public.todo_user_sync;
drop policy if exists "todo_user_sync_update_own" on public.todo_user_sync;
drop policy if exists "todo_user_sync_delete_own" on public.todo_user_sync;

create policy "todo_user_sync_select_own"
on public.todo_user_sync
for select
to authenticated
using (auth.uid() = user_id);

create policy "todo_user_sync_insert_own"
on public.todo_user_sync
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "todo_user_sync_update_own"
on public.todo_user_sync
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "todo_user_sync_delete_own"
on public.todo_user_sync
for delete
to authenticated
using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'todo_user_sync'
  ) then
    alter publication supabase_realtime add table public.todo_user_sync;
  end if;
end $$;
