drop trigger if exists on_auth_user_created on auth.users;
revoke all on function public.handle_new_user() from public, anon, authenticated;
alter function public.set_updated_at() set search_path = '';