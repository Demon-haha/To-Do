alter table public.todos
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists payload jsonb not null default '{"tasks":[],"lists":[]}'::jsonb,
  add column if not exists updated_at timestamp with time zone not null default timezone('utc'::text, now()),
  add column if not exists device_id text;

create unique index if not exists todos_user_id_uidx
  on public.todos(user_id);

alter table public.todos enable row level security;

drop policy if exists "todos_select_own" on public.todos;
drop policy if exists "todos_insert_own" on public.todos;
drop policy if exists "todos_update_own" on public.todos;
drop policy if exists "todos_delete_own" on public.todos;

create policy "todos_select_own"
  on public.todos for select
  using (auth.uid() = user_id);

create policy "todos_insert_own"
  on public.todos for insert
  with check (auth.uid() = user_id);

create policy "todos_update_own"
  on public.todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "todos_delete_own"
  on public.todos for delete
  using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.todos;
exception
  when duplicate_object then null;
end $$;
