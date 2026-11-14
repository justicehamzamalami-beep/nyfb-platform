alter table public.members
  add column if not exists voter_vin text;

comment on column public.members.voter_vin is
  'Optional voter card VIN supplied by the member for NYFB membership verification. Restrict access to authorised administrators.';

create or replace function private.handle_new_nyfb_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  n text := nullif(trim(d ->> 'full_name'), '');
  p text := nullif(trim(d ->> 'phone'), '');
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, n, p);

  insert into public.members (
    user_id, full_name, email, phone, gender, date_of_birth,
    state, lga, ward, occupation, voter_vin
  )
  values (
    new.id,
    coalesce(n, 'New member'),
    new.email,
    coalesce(p, ''),
    nullif(d ->> 'gender', ''),
    nullif(d ->> 'date_of_birth', '')::date,
    coalesce(nullif(trim(d ->> 'state'), ''), 'Not provided'),
    coalesce(nullif(trim(d ->> 'lga'), ''), 'Not provided'),
    nullif(trim(d ->> 'ward'), ''),
    nullif(trim(d ->> 'occupation'), ''),
    nullif(trim(d ->> 'voter_vin'), '')
  );

  return new;
end;
$$;

revoke all on function private.handle_new_nyfb_user() from public, anon, authenticated;