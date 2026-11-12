create table if not exists private.nyfb_device_registration_claims (
  device_hash text primary key,
  user_id uuid not null unique,
  created_at timestamptz not null default now()
);

revoke all on table private.nyfb_device_registration_claims from public, anon, authenticated;

create or replace function private.enforce_one_nyfb_registration_per_device()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  supplied_token text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'browser_registration_key', '')), '');
  token_hash text;
begin
  if supplied_token is null or length(supplied_token) < 32 or length(supplied_token) > 200 then
    raise exception 'Browser verification is missing. Please refresh the registration page and try again.'
      using errcode = '22023';
  end if;
  token_hash := encode(extensions.digest(convert_to(supplied_token, 'UTF8'), 'sha256'), 'hex');
  insert into private.nyfb_device_registration_claims (device_hash, user_id)
  values (token_hash, new.id)
  on conflict (device_hash) do nothing;
  if not found then
    raise exception 'Only one NYFB account can be registered from this browser/device. Sign in to your existing account or contact NYFB support if this is a shared device.'
      using errcode = '23505';
  end if;
  return new;
end;
$function$;

revoke all on function private.enforce_one_nyfb_registration_per_device() from public, anon, authenticated;

drop trigger if exists zzz_nyfb_limit_one_registration_per_device on auth.users;
create trigger zzz_nyfb_limit_one_registration_per_device
after insert on auth.users
for each row execute function private.enforce_one_nyfb_registration_per_device();
