create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.can_review_nyfb_member(target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    join public.profiles p on p.id = (select auth.uid())
    where m.id = target_member_id
      and (
        p.role = 'national_admin'::public.app_role
        or exists (
          select 1 from public.coordinator_assignments ca
          where ca.user_id = (select auth.uid())
            and (
              ca.role = 'national_admin'::public.app_role
              or (ca.role = 'state_coordinator'::public.app_role and ca.state = m.state)
              or (ca.role = 'lga_coordinator'::public.app_role and ca.state = m.state and ca.lga = m.lga)
              or (ca.role = 'ward_coordinator'::public.app_role and ca.state = m.state and ca.lga = m.lga and ca.ward = m.ward)
            )
        )
      )
  );
$$;
revoke all on function private.can_review_nyfb_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_review_nyfb_member(uuid) to authenticated;

drop policy if exists "Reviewers can read members in their assigned area" on public.members;
create policy "Reviewers can read members in their assigned area"
on public.members for select to authenticated
using (private.can_review_nyfb_member(id));

drop policy if exists "Reviewers can update member decisions in their assigned area" on public.members;
create policy "Reviewers can update member decisions in their assigned area"
on public.members for update to authenticated
using (private.can_review_nyfb_member(id))
with check (
  private.can_review_nyfb_member(id)
  and status in ('approved'::public.member_status, 'rejected'::public.member_status, 'suspended'::public.member_status)
  and reviewed_by = (select auth.uid())
  and reviewed_at is not null
);

drop policy if exists "Users can read their own coordinator assignment" on public.coordinator_assignments;
create policy "Users can read their own coordinator assignment"
on public.coordinator_assignments for select to authenticated
using (user_id = (select auth.uid()));

grant select on public.members to authenticated;
grant update (status, reviewed_at, reviewed_by, rejection_reason) on public.members to authenticated;
grant select on public.profiles to authenticated;
grant select on public.coordinator_assignments to authenticated;
grant select on public.announcements to authenticated;
