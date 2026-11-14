create table if not exists public.pvc_verifications (
  id uuid primary key default gen_random_uuid(),
  member_user_id uuid not null unique references public.members(user_id) on delete cascade,
  verification_status text not null default 'pending'
    check (verification_status in ('pending','verified','no_pvc','unable_to_verify')),
  verification_method text
    check (verification_method in ('physical_sighting')),
  verified_by uuid references auth.users(id),
  verified_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint pvc_verification_state_consistency check (
    (verification_status = 'pending' and verified_by is null and verified_at is null)
    or
    (verification_status <> 'pending' and verified_by is not null and verified_at is not null)
  ),
  constraint pvc_verification_method_consistency check (
    (verification_status = 'pending' and verification_method is null)
    or
    (verification_status <> 'pending' and verification_method = 'physical_sighting')
  )
);

alter table public.pvc_verifications enable row level security;
grant select, update on public.pvc_verifications to authenticated;

drop policy if exists "LGA coordinators read PVC verification in assigned LGA" on public.pvc_verifications;
create policy "LGA coordinators read PVC verification in assigned LGA"
on public.pvc_verifications for select to authenticated
using (
  exists (
    select 1 from public.members m
    join public.coordinator_assignments ca
      on ca.user_id = (select auth.uid())
     and ca.role = 'lga_coordinator'
     and lower(trim(ca.state)) = lower(trim(m.state))
     and lower(trim(ca.lga)) = lower(trim(m.lga))
    where m.user_id = pvc_verifications.member_user_id
  )
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'national_admin'
  )
);

drop policy if exists "LGA coordinators update PVC verification in assigned LGA" on public.pvc_verifications;
create policy "LGA coordinators update PVC verification in assigned LGA"
on public.pvc_verifications for update to authenticated
using (
  exists (
    select 1 from public.members m
    join public.coordinator_assignments ca
      on ca.user_id = (select auth.uid())
     and ca.role = 'lga_coordinator'
     and lower(trim(ca.state)) = lower(trim(m.state))
     and lower(trim(ca.lga)) = lower(trim(m.lga))
    where m.user_id = pvc_verifications.member_user_id
  )
)
with check (
  verified_by = (select auth.uid())
  and verified_at is not null
  and verification_method = 'physical_sighting'
  and verification_status in ('verified','no_pvc','unable_to_verify')
  and exists (
    select 1 from public.members m
    join public.coordinator_assignments ca
      on ca.user_id = (select auth.uid())
     and ca.role = 'lga_coordinator'
     and lower(trim(ca.state)) = lower(trim(m.state))
     and lower(trim(ca.lga)) = lower(trim(m.lga))
    where m.user_id = pvc_verifications.member_user_id
  )
);

insert into public.pvc_verifications (member_user_id)
select user_id from public.members
on conflict (member_user_id) do nothing;

create or replace function private.initialize_pvc_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.pvc_verifications (member_user_id)
  values (new.user_id)
  on conflict (member_user_id) do nothing;
  return new;
end;
$function$;

revoke all on function private.initialize_pvc_verification() from public, anon, authenticated;
drop trigger if exists initialize_pvc_verification_after_member_insert on public.members;
create trigger initialize_pvc_verification_after_member_insert
after insert on public.members
for each row execute function private.initialize_pvc_verification();
