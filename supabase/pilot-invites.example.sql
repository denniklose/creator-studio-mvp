-- Run this only after the main migration. Replace the example addresses.
-- Each address must also exist as a Supabase Auth user before a magic link can work.

insert into public.pilot_invites (email, label, is_active)
values
  ('creator-one@example.com', 'Pilot 1', true),
  ('creator-two@example.com', 'Pilot 2', true)
on conflict (email) do update
set label = excluded.label,
    is_active = excluded.is_active;
