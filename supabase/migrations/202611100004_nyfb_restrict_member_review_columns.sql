revoke update on table public.members from authenticated;
revoke update (full_name,email,phone,gender,date_of_birth,state,lga,ward,polling_unit,occupation,photo_path) on public.members from authenticated;
grant update (status,reviewed_at,reviewed_by,rejection_reason) on public.members to authenticated;