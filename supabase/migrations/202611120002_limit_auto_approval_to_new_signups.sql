alter table private.member_auto_approval_settings
  add column if not exists started_at timestamptz;

update private.member_auto_approval_settings
set started_at = now()
where id = true and started_at is null;

create or replace function private.auto_approve_new_members()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_expires_at timestamptz;
  v_started_at timestamptz;
begin
  select enabled, expires_at, started_at
    into v_enabled, v_expires_at, v_started_at
  from private.member_auto_approval_settings
  where id = true;

  if not coalesce(v_enabled, false) then
    return;
  end if;

  if v_expires_at <= now() then
    update private.member_auto_approval_settings
       set enabled = false, updated_at = now()
     where id = true;
    return;
  end if;

  update public.members
     set status = 'approved',
         reviewed_at = now(),
         reviewed_by = null,
         rejection_reason = null
   where status = 'pending'
     and submitted_at >= v_started_at
     and submitted_at <= now() - interval '1 minute';
end;
$$;

revoke all on function private.auto_approve_new_members() from public, anon, authenticated;
