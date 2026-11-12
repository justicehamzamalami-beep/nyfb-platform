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
  nin text := nullif(trim(d ->> 'nin_number'), '');
  incoming_referral_code text := nullif(upper(trim(d ->> 'referral_code')), '');
  own_referral_code text := 'NYFB' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  referrer_user_id uuid;
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, n, p);

  insert into public.members (
    user_id, full_name, email, phone, gender, date_of_birth,
    state, lga, ward, occupation, referral_code
  )
  values (
    new.id, coalesce(n, 'New member'), new.email, coalesce(p, ''),
    nullif(d ->> 'gender', ''),
    nullif(d ->> 'date_of_birth', '')::date,
    coalesce(nullif(trim(d ->> 'state'), ''), 'Not provided'),
    coalesce(nullif(trim(d ->> 'lga'), ''), 'Not provided'),
    nullif(trim(d ->> 'ward'), ''),
    nullif(trim(d ->> 'occupation'), ''),
    own_referral_code
  );

  if incoming_referral_code is not null then
    select m.user_id into referrer_user_id
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
$$;

revoke all on function private.handle_new_nyfb_user() from public, anon, authenticated;
