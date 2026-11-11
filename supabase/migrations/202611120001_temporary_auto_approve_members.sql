create extension if not exists pg_cron with schema pg_catalog;

create table if not exists private.member_auto_approval_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

revoke all on private.member_auto_approval_settings from public, anon, authenticated;

-- Temporary registration window: automatically return to manual approval after 24 hours.
insert into private.member_auto_approval_settings (id, enabled, expires_at, updated_at)
values (true, true, now() + interval '24 hours', now())
on conflict (id) do update
set enabled = true,
    expires_at = now() + interval '24 hours',
    updated_at = now();

create or replace function private.auto_approve_new_members()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enabled boolean;
  v_expires_at timestamptz;
begin
  select enabled, expires_at
    into v_enabled, v_expires_at
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
     and submitted_at <= now() - interval '1 minute';
end;
$$;

revoke all on function private.auto_approve_new_members() from public, anon, authenticated;

select cron.schedule(
  'nyfb-temporary-auto-approve-members',
  '* * * * *',
  'select private.auto_approve_new_members();'
);
