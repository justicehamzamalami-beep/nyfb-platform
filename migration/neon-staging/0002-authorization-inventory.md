# NYFB production authorization inventory

Extracted 2026-11-24 from Supabase production metadata. This is a reference for rebuilding the authorization model; Supabase RLS expressions are not automatically portable to the new app runtime.

- RLS policies: 58
- Tables represented: 20
- Non-internal public triggers: 12
- Public/private PostgreSQL functions: 13

## Row counts at extraction

| Table | Rows |
|---|---:|
| profiles | 32960 |
| members | 32960 |
| member_referrals | 26891 |
| reward_transactions | 45816 |
| member_bank_accounts | 9271 |
| member_nin_records | 30735 |
| user_notifications | 32720 |
| pvc_verifications | 32960 |

## RLS policy definitions

### announcements.National admins create announcements

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) AND (created_by = ( SELECT auth.uid() AS uid)))`

### announcements.National admins delete announcements

- Command: `DELETE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`
- WITH CHECK: `none`

### announcements.National admins update announcements

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`
- WITH CHECK: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`

### announcements.Users can read announcements for their audience

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR ((published = true) AND ((audience = 'all'::text) OR (audience = 'members'::text) OR ((audience = 'coordinators'::text) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role <> 'member'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE (ca.user_id = ( SELECT auth.uid() AS uid)))))) OR ((audience = 'state'::text) AND (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.state = announcements.target_state))))))))`
- WITH CHECK: `none`

### audit_logs.National admins can read audit logs

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`
- WITH CHECK: `none`

### campus_mobilizers.Members apply as campus mobilizers

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `false`

### campus_mobilizers.National and state admins review campus mobilizers

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (ca.role = 'state_coordinator'::app_role) AND (ca.state = campus_mobilizers.state)))))`
- WITH CHECK: `((reviewed_by = ( SELECT auth.uid() AS uid)) AND (reviewed_at IS NOT NULL) AND (((status = 'approved'::text) AND (approved_by = ( SELECT auth.uid() AS uid)) AND (approved_at IS NOT NULL)) OR ((status = ANY (ARRAY['rejected'::text, 'suspended'::text])) AND (approved_by IS NULL) AND (approved_at IS NULL))) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (ca.role = 'state_coordinator'::app_role) AND (ca.state = campus_mobilizers.state))))))`

### campus_mobilizers.Owners and admins read campus mobilizers

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (ca.role = 'state_coordinator'::app_role) AND (ca.state = campus_mobilizers.state)))))`
- WITH CHECK: `none`

### coordinator_assignments.National admins create coordinator assignments

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `((assigned_by = ( SELECT auth.uid() AS uid)) AND (role = ANY (ARRAY['state_coordinator'::app_role, 'lga_coordinator'::app_role, 'ward_coordinator'::app_role])) AND (((role = 'state_coordinator'::app_role) AND (state IS NOT NULL) AND (lga IS NULL) AND (ward IS NULL)) OR ((role = 'lga_coordinator'::app_role) AND (state IS NOT NULL) AND (lga IS NOT NULL) AND (ward IS NULL)) OR ((role = 'ward_coordinator'::app_role) AND (state IS NOT NULL) AND (lga IS NOT NULL) AND (ward IS NOT NULL))) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))))`

### coordinator_assignments.National admins delete coordinator assignments

- Command: `DELETE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`
- WITH CHECK: `none`

### coordinator_assignments.National admins read all coordinator assignments

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`
- WITH CHECK: `none`

### coordinator_assignments.Users can read their own coordinator assignment

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(user_id = ( SELECT auth.uid() AS uid))`
- WITH CHECK: `none`

### event_attendance.Members RSVP to published events

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `false`

### event_attendance.Members read own event attendance

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM (coordinator_assignments ca
     JOIN events e ON ((e.id = event_attendance.event_id)))
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = e.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = e.state) AND (ca.lga = e.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = e.state) AND (ca.lga = e.lga) AND (ca.ward = e.ward)))))))`
- WITH CHECK: `none`

### event_attendance.Scoped leaders check in attendees

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((checked_in_at IS NULL) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM (coordinator_assignments ca
     JOIN events e ON ((e.id = event_attendance.event_id)))
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = e.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = e.state) AND (ca.lga = e.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = e.state) AND (ca.lga = e.lga) AND (ca.ward = e.ward))))))))`
- WITH CHECK: `((checked_in_at IS NOT NULL) AND (checked_in_by = ( SELECT auth.uid() AS uid)) AND ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM (coordinator_assignments ca
     JOIN events e ON ((e.id = event_attendance.event_id)))
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = e.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = e.state) AND (ca.lga = e.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = e.state) AND (ca.lga = e.lga) AND (ca.ward = e.ward))))))))`

### events.Members read published events

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((status = ANY (ARRAY['published'::text, 'completed'::text])) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = events.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = events.state) AND (ca.lga = events.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = events.state) AND (ca.lga = events.lga) AND (ca.ward = events.ward)))))))`
- WITH CHECK: `none`

### events.National admins delete events

- Command: `DELETE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`
- WITH CHECK: `none`

### events.Scoped leaders create events

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `false`

### events.Scoped leaders update events

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = events.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = events.state) AND (ca.lga = events.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = events.state) AND (ca.lga = events.lga) AND (ca.ward = events.ward)))))))`
- WITH CHECK: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = events.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = events.state) AND (ca.lga = events.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = events.state) AND (ca.lga = events.lga) AND (ca.ward = events.ward)))))))`

### locations.Authenticated users can read locations

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `true`
- WITH CHECK: `none`

### member_bank_accounts.Approved members can insert own bank details

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'approved'::member_status)))))`

### member_bank_accounts.Authorised admins can read bank details

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (ca.role = ANY (ARRAY['national_admin'::app_role, 'state_coordinator'::app_role, 'lga_coordinator'::app_role, 'ward_coordinator'::app_role]))))))`
- WITH CHECK: `none`

### member_bank_accounts.Authorised admins can verify bank details

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (ca.role = ANY (ARRAY['national_admin'::app_role, 'state_coordinator'::app_role, 'lga_coordinator'::app_role, 'ward_coordinator'::app_role]))))))`
- WITH CHECK: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (ca.role = ANY (ARRAY['national_admin'::app_role, 'state_coordinator'::app_role, 'lga_coordinator'::app_role, 'ward_coordinator'::app_role]))))))`

### member_bank_accounts.Members can read own bank details

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(user_id = ( SELECT auth.uid() AS uid))`
- WITH CHECK: `none`

### member_bank_accounts.Members can update own bank details

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'approved'::member_status)))))`
- WITH CHECK: `((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM members m
  WHERE ((m.user_id = ( SELECT auth.uid() AS uid)) AND (m.status = 'approved'::member_status)))))`

### member_nin_records.Members manage own NIN record

- Command: `ALL`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(( SELECT auth.uid() AS uid) = user_id)`
- WITH CHECK: `(( SELECT auth.uid() AS uid) = user_id)`

### member_referrals.Members view own referrals

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((referrer_user_id = ( SELECT auth.uid() AS uid)) OR (referred_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))))`
- WITH CHECK: `none`

### members.Reviewers can read members in their assigned area

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `private.can_review_nyfb_member(id)`
- WITH CHECK: `none`

### members.Reviewers can suspend approved members in their assigned area

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(private.can_review_nyfb_member(id) AND (status = 'approved'::member_status))`
- WITH CHECK: `(private.can_review_nyfb_member(id) AND (status = 'suspended'::member_status) AND (reviewed_by = ( SELECT auth.uid() AS uid)) AND (reviewed_at IS NOT NULL))`

### members.Users can read their own membership record

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(( SELECT auth.uid() AS uid) = user_id)`
- WITH CHECK: `none`

### members.Users can submit their own membership application

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `((( SELECT auth.uid() AS uid) = user_id) AND (status = 'pending'::member_status) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL))`

### members.Users can update their own pending membership application

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((( SELECT auth.uid() AS uid) = user_id) AND (status = 'pending'::member_status))`
- WITH CHECK: `((( SELECT auth.uid() AS uid) = user_id) AND (status = 'pending'::member_status) AND (reviewed_by IS NULL) AND (reviewed_at IS NULL))`

### profiles.Users can read their own profile

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(( SELECT auth.uid() AS uid) = id)`
- WITH CHECK: `none`

### profiles.Users can update their own basic profile

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(( SELECT auth.uid() AS uid) = id)`
- WITH CHECK: `((( SELECT auth.uid() AS uid) = id) AND (role = 'member'::app_role))`

### pvc_verifications.LGA coordinators read PVC verification in assigned LGA

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((EXISTS ( SELECT 1
   FROM (members m
     JOIN coordinator_assignments ca ON (((ca.user_id = ( SELECT auth.uid() AS uid)) AND (ca.role = 'lga_coordinator'::app_role) AND (lower(TRIM(BOTH FROM ca.state)) = lower(TRIM(BOTH FROM m.state))) AND (lower(TRIM(BOTH FROM ca.lga)) = lower(TRIM(BOTH FROM m.lga))))))
  WHERE (m.user_id = pvc_verifications.member_user_id))) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))))`
- WITH CHECK: `none`

### pvc_verifications.LGA coordinators update PVC verification in assigned LGA

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(EXISTS ( SELECT 1
   FROM (members m
     JOIN coordinator_assignments ca ON (((ca.user_id = ( SELECT auth.uid() AS uid)) AND (ca.role = 'lga_coordinator'::app_role) AND (lower(TRIM(BOTH FROM ca.state)) = lower(TRIM(BOTH FROM m.state))) AND (lower(TRIM(BOTH FROM ca.lga)) = lower(TRIM(BOTH FROM m.lga))))))
  WHERE (m.user_id = pvc_verifications.member_user_id)))`
- WITH CHECK: `((verified_by = ( SELECT auth.uid() AS uid)) AND (verified_at IS NOT NULL) AND (verification_method = 'physical_sighting'::text) AND (verification_status = ANY (ARRAY['verified'::text, 'no_pvc'::text, 'unable_to_verify'::text])) AND (EXISTS ( SELECT 1
   FROM (members m
     JOIN coordinator_assignments ca ON (((ca.user_id = ( SELECT auth.uid() AS uid)) AND (ca.role = 'lga_coordinator'::app_role) AND (lower(TRIM(BOTH FROM ca.state)) = lower(TRIM(BOTH FROM m.state))) AND (lower(TRIM(BOTH FROM ca.lga)) = lower(TRIM(BOTH FROM m.lga))))))
  WHERE (m.user_id = pvc_verifications.member_user_id))))`

### reward_transactions.Members claim one daily login reward

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `false`

### reward_transactions.Members read own reward transactions

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(user_id = ( SELECT auth.uid() AS uid))`
- WITH CHECK: `none`

### site_content.National admins can delete site content

- Command: `DELETE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`
- WITH CHECK: `none`

### site_content.National admins can insert site content

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`

### site_content.National admins can update site content

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`
- WITH CHECK: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`

### site_content.National admins can view all site content

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`
- WITH CHECK: `none`

### site_content.Public can view published site content

- Command: `SELECT`
- Roles: `{anon,authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(is_published = true)`
- WITH CHECK: `none`

### support_groups.Members submit own support groups

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `false`

### support_groups.Owners and scoped admins read support groups

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((submitted_by = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = support_groups.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = support_groups.state) AND (ca.lga = support_groups.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = support_groups.state) AND (ca.lga = support_groups.lga) AND (ca.ward = support_groups.ward)))))))`
- WITH CHECK: `none`

### support_groups.Scoped admins update support groups

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = support_groups.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = support_groups.state) AND (ca.lga = support_groups.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = support_groups.state) AND (ca.lga = support_groups.lga) AND (ca.ward = support_groups.ward)))))))`
- WITH CHECK: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = support_groups.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = support_groups.state) AND (ca.lga = support_groups.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = support_groups.state) AND (ca.lga = support_groups.lga) AND (ca.ward = support_groups.ward)))))))`

### task_submissions.Members read own task submissions

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM (coordinator_assignments ca
     JOIN volunteer_tasks t ON ((t.id = task_submissions.task_id)))
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = t.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = t.state) AND (ca.lga = t.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = t.state) AND (ca.lga = t.lga) AND (ca.ward = t.ward)))))))`
- WITH CHECK: `none`

### task_submissions.Members submit tasks

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `false`

### task_submissions.Scoped leaders review task submissions

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM (coordinator_assignments ca
     JOIN volunteer_tasks t ON ((t.id = task_submissions.task_id)))
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = t.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = t.state) AND (ca.lga = t.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = t.state) AND (ca.lga = t.lga) AND (ca.ward = t.ward)))))))`
- WITH CHECK: `((status = ANY (ARRAY['approved'::text, 'rejected'::text])) AND (reviewed_by = ( SELECT auth.uid() AS uid)) AND (reviewed_at IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM volunteer_tasks t
  WHERE ((t.id = task_submissions.task_id) AND ((EXISTS ( SELECT 1
           FROM profiles p
          WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
           FROM coordinator_assignments ca
          WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = t.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = t.state) AND (ca.lga = t.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = t.state) AND (ca.lga = t.lga) AND (ca.ward = t.ward)))))))))))`

### user_notifications.National admins can create user notifications

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `(EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))`

### user_notifications.Users can mark their own notifications read

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(( SELECT auth.uid() AS uid) = user_id)`
- WITH CHECK: `(( SELECT auth.uid() AS uid) = user_id)`

### user_notifications.Users can read their own notifications

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `(( SELECT auth.uid() AS uid) = user_id)`
- WITH CHECK: `none`

### volunteer_tasks.Members read published volunteer tasks

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((status = ANY (ARRAY['published'::text, 'closed'::text])) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = volunteer_tasks.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = volunteer_tasks.state) AND (ca.lga = volunteer_tasks.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = volunteer_tasks.state) AND (ca.lga = volunteer_tasks.lga) AND (ca.ward = volunteer_tasks.ward)))))))`
- WITH CHECK: `none`

### volunteer_tasks.Scoped leaders create tasks

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `false`

### volunteer_tasks.Scoped leaders update tasks

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = volunteer_tasks.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = volunteer_tasks.state) AND (ca.lga = volunteer_tasks.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = volunteer_tasks.state) AND (ca.lga = volunteer_tasks.lga) AND (ca.ward = volunteer_tasks.ward)))))))`
- WITH CHECK: `(((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = volunteer_tasks.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = volunteer_tasks.state) AND (ca.lga = volunteer_tasks.lga)) OR ((ca.role = 'ward_coordinator'::app_role) AND (ca.state = volunteer_tasks.state) AND (ca.lga = volunteer_tasks.lga) AND (ca.ward = volunteer_tasks.ward))))))) AND ((reward_amount_ngn = 0) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role))))))`

### welfare_applications.Members submit welfare applications

- Command: `INSERT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `none`
- WITH CHECK: `false`

### welfare_applications.Owners and scoped reviewers read welfare applications

- Command: `SELECT`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = welfare_applications.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = welfare_applications.state) AND (ca.lga = welfare_applications.lga)))))))`
- WITH CHECK: `none`

### welfare_applications.Scoped reviewers decide welfare applications

- Command: `UPDATE`
- Roles: `{authenticated}`
- Permissive: `PERMISSIVE`
- USING: `((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.role = 'national_admin'::app_role)))) OR (EXISTS ( SELECT 1
   FROM coordinator_assignments ca
  WHERE ((ca.user_id = ( SELECT auth.uid() AS uid)) AND (((ca.role = 'state_coordinator'::app_role) AND (ca.state = welfare_applications.state)) OR ((ca.role = 'lga_coordinator'::app_role) AND (ca.state = welfare_applications.state) AND (ca.lga = welfare_applications.lga)))))))`
- WITH CHECK: `((reviewed_by = ( SELECT auth.uid() AS uid)) AND (reviewed_at IS NOT NULL) AND (status = ANY (ARRAY['under_review'::text, 'approved'::text, 'rejected'::text, 'fulfilled'::text])))`


## Trigger definitions

- `announcements.announcements_updated_at`: `CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION set_updated_at()`
- `campus_mobilizers.notify_campus_mobilizer_decision`: `CREATE TRIGGER notify_campus_mobilizer_decision AFTER UPDATE OF status ON public.campus_mobilizers FOR EACH ROW EXECUTE FUNCTION private.notify_user_status_change('status')`
- `member_bank_accounts.notify_bank_verification_decision`: `CREATE TRIGGER notify_bank_verification_decision AFTER UPDATE OF verification_status ON public.member_bank_accounts FOR EACH ROW EXECUTE FUNCTION private.notify_user_status_change('verification_status')`
- `member_bank_accounts.protect_member_bank_account_trigger`: `CREATE TRIGGER protect_member_bank_account_trigger BEFORE INSERT OR UPDATE ON public.member_bank_accounts FOR EACH ROW EXECUTE FUNCTION protect_member_bank_account()`
- `members.initialize_pvc_verification_after_member_insert`: `CREATE TRIGGER initialize_pvc_verification_after_member_insert AFTER INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION private.initialize_pvc_verification()`
- `members.members_updated_at`: `CREATE TRIGGER members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION set_updated_at()`
- `members.notify_member_status_change`: `CREATE TRIGGER notify_member_status_change AFTER UPDATE OF status ON public.members FOR EACH ROW EXECUTE FUNCTION private.notify_member_status_change()`
- `members.reward_approved_member_referral`: `CREATE TRIGGER reward_approved_member_referral AFTER UPDATE OF status ON public.members FOR EACH ROW EXECUTE FUNCTION private.reward_approved_member_referral()`
- `profiles.profiles_updated_at`: `CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at()`
- `task_submissions.notify_task_submission_decision`: `CREATE TRIGGER notify_task_submission_decision AFTER UPDATE OF status ON public.task_submissions FOR EACH ROW EXECUTE FUNCTION private.notify_user_status_change('status')`
- `task_submissions.reward_approved_content_task`: `CREATE TRIGGER reward_approved_content_task AFTER UPDATE OF status ON public.task_submissions FOR EACH ROW EXECUTE FUNCTION private.reward_approved_content_task()`
- `welfare_applications.notify_welfare_application_decision`: `CREATE TRIGGER notify_welfare_application_decision AFTER UPDATE OF status ON public.welfare_applications FOR EACH ROW EXECUTE FUNCTION private.notify_user_status_change('status')`

## Function inventory

- `private.auto_approve_new_members`
- `private.can_review_nyfb_member`
- `private.enforce_one_nyfb_registration_per_device`
- `private.handle_new_nyfb_user`
- `private.initialize_pvc_verification`
- `private.notify_member_status_change`
- `private.notify_user_status_change`
- `private.reward_approved_content_task`
- `private.reward_approved_member_referral`
- `public.activate_own_membership`
- `public.handle_new_user`
- `public.protect_member_bank_account`
- `public.set_updated_at`

## Security implementation requirement

Do not cut over while these rules are missing. Preserve member-only access to private records, coordinator scope by state/LGA/ward, national-admin review powers, bank/NIN/PVC privacy, and device-registration protections. Rebuild and test equivalent authorization in server-side handlers and/or a carefully designed trusted database session context before public deployment. Never expose privileged service credentials to browser code.
