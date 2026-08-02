-- Coach Greta: THE platform specific migration.
--
-- Everything in this file couples to Supabase (auth schema trigger, pg_cron,
-- pg_net, Vault). When migrating to self hosted Postgres, replace this file:
--   * create profiles rows yourself when creating users
--   * run the two schedules below from any scheduler (systemd timer, cron):
--       every minute:   call the send-due-reminders endpoint with the secret
--       every 15 min:   select public.maintain_schedules();

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- auto create a profile row for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Cron jobs. Both secrets are read from Supabase Vault at run time, so this
-- migration applies cleanly before the secrets exist; create them right after
-- (see README):
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<random>', 'cron_secret');
-- cron.schedule upserts by job name, re-running this migration is safe.
-- ---------------------------------------------------------------------------
select cron.schedule(
  'coach-greta-maintain',
  '*/15 * * * *',
  $$ select public.maintain_schedules() $$
);

select cron.schedule(
  'coach-greta-send-due',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'project_url') || '/functions/v1/send-due-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets
                        where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  )
  $$
);
