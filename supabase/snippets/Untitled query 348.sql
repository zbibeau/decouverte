select id, email, email_confirmed_at, encrypted_password is not null as has_password
  from auth.users
 where email = 'vivien@local.dev';