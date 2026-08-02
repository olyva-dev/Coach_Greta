-- Local development seed only (supabase db reset). Production seeding is
-- documented in the README: create your user in the dashboard, then run
--   select public.seed_examples('<your-user-uuid>');
--
-- Creates a local test user (dev@local.test / password123) plus the example
-- reminders, challenge and habits.

insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'dev@local.test',
  crypt('password123', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}',
  now(), now()
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
values (
  gen_random_uuid(),
  'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001',
  '{"sub":"a0000000-0000-4000-8000-000000000001","email":"dev@local.test"}',
  'email', now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

-- the auth trigger created the profile; add the examples
select public.seed_examples('a0000000-0000-4000-8000-000000000001');
