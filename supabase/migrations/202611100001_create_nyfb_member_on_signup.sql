create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create or replace function private.handle_new_nyfb_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  d jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  n text := nullif(trim(d ->> 'full_name'), '');
  p text := nullif(trim(d ->> 'phone'), '');
begin
  insert into public.profiles (id, full_name, phone) values (new.id, n, p);
  insert into public.members (user_id, full_name, email, phone, gender, date_of_birth, state, lga, ward, occupation)
  values (new.id, coalesce(n, 'New member'), new.email, coalesce(p, ''),
    nullif(d ->> 'gender', ''), nullif(d ->> 'date_of_birth', '')::date,
    coalesce(nullif(trim(d ->> 'state'), ''), 'Not provided'),
    coalesce(nullif(trim(d ->> 'lga'), ''), 'Not provided'),
    nullif(trim(d ->> 'ward'), ''), nullif(trim(d ->> 'occupation'), ''));
  return new;
end;
$$;
revoke all on function private.handle_new_nyfb_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_nyfb on auth.users;
create trigger on_auth_user_created_nyfb after insert on auth.users
for each row execute function private.handle_new_nyfb_user();