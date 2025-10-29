alter table users
  add column if not exists lower_email text
  generated always as (lower(email)) stored;

create unique index if not exists users_lower_email_uq
  on users(lower_email);

update users set email = email where email is not null;
