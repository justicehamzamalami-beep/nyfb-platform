create table if not exists public.member_bank_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bank_name text not null,
  account_number text not null check (account_number ~ '^[0-9]{10}$'),
  account_name text not null check (length(trim(account_name)) between 2 and 120),
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.member_bank_accounts enable row level security;
create policy "Members can read own bank details" on public.member_bank_accounts
 for select to authenticated using (user_id = (select auth.uid()));
create policy "Authorised admins can read bank details" on public.member_bank_accounts
 for select to authenticated using (
   exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'national_admin')
   or exists (select 1 from public.coordinator_assignments ca where ca.user_id = (select auth.uid()) and ca.role in ('national_admin','state_coordinator','lga_coordinator','ward_coordinator'))
 );
create policy "Approved members can insert own bank details" on public.member_bank_accounts
 for insert to authenticated with check (
   user_id = (select auth.uid())
   and exists (select 1 from public.members m where m.user_id = (select auth.uid()) and m.status = 'approved')
 );
create policy "Members can update own bank details" on public.member_bank_accounts
 for update to authenticated using (
   user_id = (select auth.uid())
   and exists (select 1 from public.members m where m.user_id = (select auth.uid()) and m.status = 'approved')
 ) with check (
   user_id = (select auth.uid())
   and exists (select 1 from public.members m where m.user_id = (select auth.uid()) and m.status = 'approved')
 );
create policy "Authorised admins can verify bank details" on public.member_bank_accounts
 for update to authenticated using (
   exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'national_admin')
   or exists (select 1 from public.coordinator_assignments ca where ca.user_id = (select auth.uid()) and ca.role in ('national_admin','state_coordinator','lga_coordinator','ward_coordinator'))
 ) with check (
   exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'national_admin')
   or exists (select 1 from public.coordinator_assignments ca where ca.user_id = (select auth.uid()) and ca.role in ('national_admin','state_coordinator','lga_coordinator','ward_coordinator'))
 );
create or replace function public.protect_member_bank_account()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and auth.uid() = new.user_id then
    if tg_op = 'UPDATE' and new.verification_status is distinct from old.verification_status then
      raise exception 'Members cannot change bank verification status';
    end if;
    new.verification_status := 'pending';
    new.submitted_at := coalesce(old.submitted_at, now());
    new.updated_at := now();
  else
    new.updated_at := now();
  end if;
  return new;
end;
$$;
create trigger protect_member_bank_account_trigger
before insert or update on public.member_bank_accounts
for each row execute function public.protect_member_bank_account();
grant select, insert, update on public.member_bank_accounts to authenticated;
