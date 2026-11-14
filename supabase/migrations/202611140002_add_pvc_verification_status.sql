alter table public.members
  add column if not exists pvc_claim text not null default 'not_disclosed'
    check (pvc_claim in ('has_pvc', 'no_pvc', 'not_disclosed')),
  add column if not exists pvc_verification_status text not null default 'not_required'
    check (pvc_verification_status in ('pending', 'verified', 'not_verified', 'not_required')),
  add column if not exists pvc_verified_at timestamptz,
  add column if not exists pvc_verified_by uuid references auth.users(id);

comment on column public.members.pvc_claim is
  'Optional member self-attestation about PVC possession. No VIN is collected or stored.';
comment on column public.members.pvc_verification_status is
  'PVC sight-check outcome only; no voter-card identifier is retained.';

create or replace function private.handle_new_nyfb_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  d jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  n text := nullif(trim(d ->> 'full_name'), '');
  p text := nullif(trim(d ->> 'phone'), '');
  nin text := nullif(trim(d ->> 'nin_number'), '');
  incoming_referral_code text := nullif(upper(trim(d ->> 'referral_code')), '');
  own_referral_code text := 'NYFB' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  referrer_user_id uuid;
  pvc_claim_value text := coalesce(nullif(d ->> 'pvc_claim', ''), 'not_disclosed');
begin
  if pvc_claim_value not in ('has_pvc', 'no_pvc', 'not_disclosed') then
    pvc_claim_value := 'not_disclosed';
  end if;

  insert into public.profiles (id, full_name, phone)
  values (new.id, n, p);

  insert into public.members (
    user_id, full_name, email, phone, gender, date_of_birth,
    state, lga, ward, occupation, referral_code,
    pvc_claim, pvc_verification_status
  )
  values (
    new.id, coalesce(n, 'New member'), new.email, coalesce(p, ''),
    nullif(d ->> 'gender', ''),
    nullif(d ->> 'date_of_birth', '')::date,
    coalesce(nullif(trim(d ->> 'state'), ''), 'Not provided'),
    coalesce(nullif(trim(d ->> 'lga'), ''), 'Not provided'),
    nullif(trim(d ->> 'ward'), ''),
    nullif(trim(d ->> 'occupation'), ''),
    own_referral_code,
    pvc_claim_value,
    case when pvc_claim_value = 'has_pvc' then 'pending' else 'not_required' end
  );

  if incoming_referral_code is not null then
    select m.user_id
      into referrer_user_id
      from public.members m
     where upper(m.referral_code) = incoming_referral_code
       and m.user_id <> new.id
     limit 1;

    if referrer_user_id is not null then
      insert into public.member_referrals (
        referrer_user_id, referred_user_id, referral_code, status
      )
      values (
        referrer_user_id, new.id, incoming_referral_code, 'registered'
      )
      on conflict (referred_user_id) do nothing;
    end if;
  end if;

  if nin is not null then
    insert into public.member_nin_records (user_id, nin_number)
    values (new.id, nin);
  end if;

  return new;
end;
$function$;

revoke all on function private.handle_new_nyfb_user() from public, anon, authenticated;
