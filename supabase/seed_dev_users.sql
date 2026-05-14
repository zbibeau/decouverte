-- =====================================================================
-- Local dev users — survives `supabase db reset`.
-- =====================================================================
-- Loaded after `seed.sql` (see config.toml → [db.seed] sql_paths).
-- The cloud dump only includes the `public` schema, so `auth.users` is
-- empty after a reset.
--
-- Two rows are needed for GoTrue (Supabase auth) to accept an email/
-- password login:
--   1. auth.users           — the account
--   2. auth.identities      — the (email-provider) ↔ user mapping
-- Skipping #2 yields "Database error querying schema" on login.
--
-- Idempotent: re-running this file is a no-op once the user exists.
-- Change the email/password by editing the values below and running
-- `pnpm supabase:reset`.
-- =====================================================================

do $$
declare
  v_user_id   uuid;
  v_email     text := 'vivien@local.dev';
  v_password  text := 'motdepasse';
begin
  -- Skip everything if the user already exists.
  if exists (select 1 from auth.users where email = v_email) then
    return;
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt(v_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '', '', '', '', '', ''
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );
end $$;
