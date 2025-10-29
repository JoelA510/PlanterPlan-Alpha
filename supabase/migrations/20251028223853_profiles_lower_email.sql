alter table profiles
  add column if not exists lower_email text
  generated always as (lower(email)) stored;

create unique index if not exists profiles_lower_email_uq
  on profiles(lower_email);

update profiles set email = email where email is not null;
