-- Coach Greta: row level security
--
-- Portability note: public.current_app_user_id() is the single point of
-- coupling to Supabase Auth. On self hosted Postgres, replace its body with
-- whatever resolves the authenticated user there (for a single user setup,
-- even a constant works).
--
-- RLS is ENABLEd but not FORCEd on purpose: the scheduling functions in the
-- engine migration run under pg_cron as the table owner, and Supabase does
-- not allow creating BYPASSRLS roles. Owner access never leaves the database;
-- every API path (PostgREST, client libraries) runs as anon or authenticated
-- and is fully policy gated.

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

-- profiles
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = public.current_app_user_id());

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = public.current_app_user_id())
  with check (id = public.current_app_user_id());

-- all user_id scoped tables share the same shape
do $$
declare
  t text;
begin
  foreach t in array array[
    'reminders',
    'reminder_occurrences',
    'challenges',
    'challenge_logs',
    'habits',
    'habit_logs',
    'push_subscriptions',
    'notification_deliveries'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      || 'using (user_id = public.current_app_user_id()) '
      || 'with check (user_id = public.current_app_user_id())',
      t || '_owner', t
    );
  end loop;
end;
$$;
