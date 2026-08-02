-- Coach Greta: a name to greet you by on the Today screen.
alter table public.profiles
  add column display_name text;
