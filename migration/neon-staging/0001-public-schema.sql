-- NYFB staging schema baseline extracted from production metadata on 2026-11-24.

-- Apply only to the isolated Neon staging branch. Do not apply to production without review.

-- auth.users is a compatibility key table only; authentication schema, identities and password credentials are NOT migrated by this file.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.users (id uuid PRIMARY KEY);

CREATE SEQUENCE public."member_number_seq";

CREATE TYPE public."app_role" AS ENUM ('member', 'ward_coordinator', 'lga_coordinator', 'state_coordinator', 'national_admin');

CREATE TYPE public."member_status" AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TABLE public."announcements" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "audience" text DEFAULT 'all'::text NOT NULL,
  "target_state" text,
  "published" bool DEFAULT false NOT NULL,
  "published_at" timestamptz,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."audit_logs" (
  "id" int8 GENERATED ALWAYS AS IDENTITY NOT NULL,
  "actor_id" uuid,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."campus_mobilizers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "institution" text NOT NULL,
  "institution_type" text NOT NULL,
  "state" text NOT NULL,
  "campus_location" text,
  "referral_code" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz
);

CREATE TABLE public."coordinator_assignments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "role" app_role NOT NULL,
  "state" text,
  "lga" text,
  "ward" text,
  "assigned_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."event_attendance" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "event_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "checked_in_at" timestamptz,
  "checked_in_by" uuid,
  "points_awarded" int4 DEFAULT 0 NOT NULL,
  "rsvped_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."events" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "venue" text,
  "event_type" text DEFAULT 'community'::text NOT NULL,
  "starts_at" timestamptz NOT NULL,
  "ends_at" timestamptz,
  "state" text,
  "lga" text,
  "ward" text,
  "capacity" int4,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "attendance_points" int4 DEFAULT 5 NOT NULL
);

CREATE TABLE public."locations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "state" text NOT NULL,
  "lga" text NOT NULL,
  "ward" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."member_bank_accounts" (
  "user_id" uuid NOT NULL,
  "bank_name" text NOT NULL,
  "account_number" text NOT NULL,
  "account_name" text NOT NULL,
  "verification_status" text DEFAULT 'pending'::text NOT NULL,
  "submitted_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."member_nin_records" (
  "user_id" uuid NOT NULL,
  "nin_number" text NOT NULL,
  "submitted_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."member_referrals" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "referrer_user_id" uuid NOT NULL,
  "referred_user_id" uuid NOT NULL,
  "referral_code" text NOT NULL,
  "status" text DEFAULT 'registered'::text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "verified_at" timestamptz
);

CREATE TABLE public."members" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "member_number" text DEFAULT ('NYFB-'::text || lpad((nextval('member_number_seq'::regclass))::text, 6, '0'::text)) NOT NULL,
  "full_name" text NOT NULL,
  "email" text,
  "phone" text NOT NULL,
  "gender" text,
  "date_of_birth" date,
  "state" text NOT NULL,
  "lga" text NOT NULL,
  "ward" text,
  "polling_unit" text,
  "occupation" text,
  "photo_path" text,
  "status" member_status DEFAULT 'pending'::member_status NOT NULL,
  "submitted_at" timestamptz DEFAULT now() NOT NULL,
  "reviewed_at" timestamptz,
  "reviewed_by" uuid,
  "rejection_reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "referral_code" text
);

CREATE TABLE public."profiles" (
  "id" uuid NOT NULL,
  "full_name" text,
  "phone" text,
  "role" app_role DEFAULT 'member'::app_role NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "avatar_url" text
);

CREATE TABLE public."pvc_verifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "member_user_id" uuid NOT NULL,
  "verification_status" text DEFAULT 'pending'::text NOT NULL,
  "verification_method" text,
  "verified_by" uuid,
  "verified_at" timestamptz,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."reward_transactions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "amount_ngn" int4 NOT NULL,
  "reward_type" text NOT NULL,
  "description" text NOT NULL,
  "source_key" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."site_content" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "content_type" text NOT NULL,
  "title" text NOT NULL,
  "subtitle" text,
  "body" text,
  "image_url" text,
  "image_path" text,
  "sort_order" int4 DEFAULT 0 NOT NULL,
  "is_published" bool DEFAULT false NOT NULL,
  "created_by" uuid,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."support_groups" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "group_name" text NOT NULL,
  "category" text NOT NULL,
  "description" text,
  "contact_name" text NOT NULL,
  "contact_email" text,
  "contact_phone" text NOT NULL,
  "state" text NOT NULL,
  "lga" text NOT NULL,
  "ward" text,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "submitted_by" uuid NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "review_note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."task_submissions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "task_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "submission_note" text,
  "evidence_url" text,
  "status" text DEFAULT 'submitted'::text NOT NULL,
  "points_awarded" int4 DEFAULT 0 NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "review_note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."user_notifications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "notification_type" text DEFAULT 'general'::text NOT NULL,
  "read_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE public."volunteer_tasks" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "instructions" text,
  "points" int4 DEFAULT 0 NOT NULL,
  "state" text,
  "lga" text,
  "ward" text,
  "due_at" timestamptz,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "created_by" uuid NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "reward_amount_ngn" int4 DEFAULT 0 NOT NULL
);

CREATE TABLE public."welfare_applications" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "programme" text NOT NULL,
  "household_size" int4 DEFAULT 1 NOT NULL,
  "phone" text NOT NULL,
  "address" text NOT NULL,
  "state" text NOT NULL,
  "lga" text NOT NULL,
  "needs_summary" text NOT NULL,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "reviewed_by" uuid,
  "reviewed_at" timestamptz,
  "review_note" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "consent_given" bool DEFAULT false NOT NULL
);

ALTER TABLE public."announcements" ADD CONSTRAINT "announcements_audience_check" CHECK ((audience = ANY (ARRAY['all'::text, 'members'::text, 'coordinators'::text, 'state'::text])));

ALTER TABLE public."campus_mobilizers" ADD CONSTRAINT "campus_mobilizers_institution_type_check" CHECK ((institution_type = ANY (ARRAY['university'::text, 'polytechnic'::text, 'college_of_education'::text, 'monotechnic'::text, 'other'::text])));

ALTER TABLE public."campus_mobilizers" ADD CONSTRAINT "campus_mobilizers_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])));

ALTER TABLE public."coordinator_assignments" ADD CONSTRAINT "coordinator_assignments_check" CHECK ((((role = 'ward_coordinator'::app_role) AND (state IS NOT NULL) AND (lga IS NOT NULL) AND (ward IS NOT NULL)) OR ((role = 'lga_coordinator'::app_role) AND (state IS NOT NULL) AND (lga IS NOT NULL) AND (ward IS NULL)) OR ((role = 'state_coordinator'::app_role) AND (state IS NOT NULL) AND (lga IS NULL) AND (ward IS NULL)) OR ((role = 'national_admin'::app_role) AND (state IS NULL) AND (lga IS NULL) AND (ward IS NULL))));

ALTER TABLE public."coordinator_assignments" ADD CONSTRAINT "coordinator_assignments_role_check" CHECK ((role <> 'member'::app_role));

ALTER TABLE public."event_attendance" ADD CONSTRAINT "event_attendance_points_awarded_check" CHECK ((points_awarded >= 0));

ALTER TABLE public."events" ADD CONSTRAINT "events_attendance_points_check" CHECK ((attendance_points >= 0));

ALTER TABLE public."events" ADD CONSTRAINT "events_capacity_check" CHECK (((capacity IS NULL) OR (capacity > 0)));

ALTER TABLE public."events" ADD CONSTRAINT "events_check" CHECK (((ends_at IS NULL) OR (ends_at >= starts_at)));

ALTER TABLE public."events" ADD CONSTRAINT "events_event_type_check" CHECK ((event_type = ANY (ARRAY['community'::text, 'training'::text, 'meeting'::text, 'outreach'::text, 'conference'::text, 'other'::text])));

ALTER TABLE public."events" ADD CONSTRAINT "events_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'cancelled'::text, 'completed'::text])));

ALTER TABLE public."member_bank_accounts" ADD CONSTRAINT "member_bank_accounts_account_name_check" CHECK (((length(TRIM(BOTH FROM account_name)) >= 2) AND (length(TRIM(BOTH FROM account_name)) <= 120)));

ALTER TABLE public."member_bank_accounts" ADD CONSTRAINT "member_bank_accounts_account_number_check" CHECK ((account_number ~ '^[0-9]{10}$'::text));

ALTER TABLE public."member_bank_accounts" ADD CONSTRAINT "member_bank_accounts_verification_status_check" CHECK ((verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'rejected'::text])));

ALTER TABLE public."member_nin_records" ADD CONSTRAINT "member_nin_records_nin_number_check" CHECK ((nin_number ~ '^[0-9]{11}$'::text));

ALTER TABLE public."member_referrals" ADD CONSTRAINT "member_referrals_check" CHECK ((referrer_user_id <> referred_user_id));

ALTER TABLE public."member_referrals" ADD CONSTRAINT "member_referrals_status_check" CHECK ((status = ANY (ARRAY['registered'::text, 'verified'::text])));

ALTER TABLE public."pvc_verifications" ADD CONSTRAINT "pvc_verification_method_consistency" CHECK ((((verification_status = 'pending'::text) AND (verification_method IS NULL)) OR ((verification_status <> 'pending'::text) AND (verification_method = 'physical_sighting'::text))));

ALTER TABLE public."pvc_verifications" ADD CONSTRAINT "pvc_verification_state_consistency" CHECK ((((verification_status = 'pending'::text) AND (verified_by IS NULL) AND (verified_at IS NULL)) OR ((verification_status <> 'pending'::text) AND (verified_by IS NOT NULL) AND (verified_at IS NOT NULL))));

ALTER TABLE public."pvc_verifications" ADD CONSTRAINT "pvc_verifications_verification_method_check" CHECK ((verification_method = 'physical_sighting'::text));

ALTER TABLE public."pvc_verifications" ADD CONSTRAINT "pvc_verifications_verification_status_check" CHECK ((verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'no_pvc'::text, 'unable_to_verify'::text])));

ALTER TABLE public."reward_transactions" ADD CONSTRAINT "reward_transactions_amount_ngn_check" CHECK ((amount_ngn > 0));

ALTER TABLE public."reward_transactions" ADD CONSTRAINT "reward_transactions_reward_type_check" CHECK ((reward_type = ANY (ARRAY['referral'::text, 'sub_referral'::text, 'daily_login'::text, 'content_publish'::text])));

ALTER TABLE public."site_content" ADD CONSTRAINT "site_content_content_type_check" CHECK ((content_type = ANY (ARRAY['logo'::text, 'executive'::text, 'programme'::text])));

ALTER TABLE public."support_groups" ADD CONSTRAINT "support_groups_category_check" CHECK ((category = ANY (ARRAY['professional'::text, 'religious'::text, 'artisan'::text, 'humanitarian'::text, 'community'::text, 'student'::text, 'other'::text])));

ALTER TABLE public."support_groups" ADD CONSTRAINT "support_groups_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])));

ALTER TABLE public."task_submissions" ADD CONSTRAINT "task_submissions_points_awarded_check" CHECK ((points_awarded >= 0));

ALTER TABLE public."task_submissions" ADD CONSTRAINT "task_submissions_status_check" CHECK ((status = ANY (ARRAY['submitted'::text, 'approved'::text, 'rejected'::text])));

ALTER TABLE public."user_notifications" ADD CONSTRAINT "user_notifications_notification_type_check" CHECK ((notification_type = ANY (ARRAY['general'::text, 'approval'::text, 'rejection'::text, 'membership'::text, 'bank'::text, 'nin'::text, 'welfare'::text, 'task'::text, 'event'::text])));

ALTER TABLE public."volunteer_tasks" ADD CONSTRAINT "volunteer_tasks_points_check" CHECK ((points >= 0));

ALTER TABLE public."volunteer_tasks" ADD CONSTRAINT "volunteer_tasks_reward_amount_nonnegative" CHECK ((reward_amount_ngn >= 0));

ALTER TABLE public."volunteer_tasks" ADD CONSTRAINT "volunteer_tasks_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'closed'::text])));

ALTER TABLE public."welfare_applications" ADD CONSTRAINT "welfare_applications_household_size_check" CHECK (((household_size >= 1) AND (household_size <= 30)));

ALTER TABLE public."welfare_applications" ADD CONSTRAINT "welfare_applications_programme_check" CHECK ((programme = ANY (ARRAY['food_support'::text, 'medical_care'::text, 'essential_care'::text, 'enterprise_support'::text, 'skills_training'::text, 'empowerment'::text, 'other'::text])));

ALTER TABLE public."welfare_applications" ADD CONSTRAINT "welfare_applications_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'fulfilled'::text])));

ALTER TABLE public."announcements" ADD CONSTRAINT "announcements_pkey" PRIMARY KEY (id);

ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);

ALTER TABLE public."campus_mobilizers" ADD CONSTRAINT "campus_mobilizers_pkey" PRIMARY KEY (id);

ALTER TABLE public."coordinator_assignments" ADD CONSTRAINT "coordinator_assignments_pkey" PRIMARY KEY (id);

ALTER TABLE public."event_attendance" ADD CONSTRAINT "event_attendance_pkey" PRIMARY KEY (id);

ALTER TABLE public."events" ADD CONSTRAINT "events_pkey" PRIMARY KEY (id);

ALTER TABLE public."locations" ADD CONSTRAINT "locations_pkey" PRIMARY KEY (id);

ALTER TABLE public."member_bank_accounts" ADD CONSTRAINT "member_bank_accounts_pkey" PRIMARY KEY (user_id);

ALTER TABLE public."member_nin_records" ADD CONSTRAINT "member_nin_records_pkey" PRIMARY KEY (user_id);

ALTER TABLE public."member_referrals" ADD CONSTRAINT "member_referrals_pkey" PRIMARY KEY (id);

ALTER TABLE public."members" ADD CONSTRAINT "members_pkey" PRIMARY KEY (id);

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);

ALTER TABLE public."pvc_verifications" ADD CONSTRAINT "pvc_verifications_pkey" PRIMARY KEY (id);

ALTER TABLE public."reward_transactions" ADD CONSTRAINT "reward_transactions_pkey" PRIMARY KEY (id);

ALTER TABLE public."site_content" ADD CONSTRAINT "site_content_pkey" PRIMARY KEY (id);

ALTER TABLE public."support_groups" ADD CONSTRAINT "support_groups_pkey" PRIMARY KEY (id);

ALTER TABLE public."task_submissions" ADD CONSTRAINT "task_submissions_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_notifications" ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY (id);

ALTER TABLE public."volunteer_tasks" ADD CONSTRAINT "volunteer_tasks_pkey" PRIMARY KEY (id);

ALTER TABLE public."welfare_applications" ADD CONSTRAINT "welfare_applications_pkey" PRIMARY KEY (id);

ALTER TABLE public."campus_mobilizers" ADD CONSTRAINT "campus_mobilizers_referral_code_key" UNIQUE (referral_code);

ALTER TABLE public."campus_mobilizers" ADD CONSTRAINT "campus_mobilizers_user_id_key" UNIQUE (user_id);

ALTER TABLE public."event_attendance" ADD CONSTRAINT "event_attendance_event_id_user_id_key" UNIQUE (event_id, user_id);

ALTER TABLE public."locations" ADD CONSTRAINT "locations_state_lga_ward_key" UNIQUE (state, lga, ward);

ALTER TABLE public."member_referrals" ADD CONSTRAINT "member_referrals_referred_user_id_key" UNIQUE (referred_user_id);

ALTER TABLE public."members" ADD CONSTRAINT "members_member_number_key" UNIQUE (member_number);

ALTER TABLE public."members" ADD CONSTRAINT "members_user_id_key" UNIQUE (user_id);

ALTER TABLE public."pvc_verifications" ADD CONSTRAINT "pvc_verifications_member_user_id_key" UNIQUE (member_user_id);

ALTER TABLE public."reward_transactions" ADD CONSTRAINT "reward_transactions_unique_source" UNIQUE (user_id, reward_type, source_key);

ALTER TABLE public."task_submissions" ADD CONSTRAINT "task_submissions_task_id_user_id_key" UNIQUE (task_id, user_id);

ALTER TABLE public."announcements" ADD CONSTRAINT "announcements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."campus_mobilizers" ADD CONSTRAINT "campus_mobilizers_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES auth.users(id);

ALTER TABLE public."campus_mobilizers" ADD CONSTRAINT "campus_mobilizers_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

ALTER TABLE public."campus_mobilizers" ADD CONSTRAINT "campus_mobilizers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."coordinator_assignments" ADD CONSTRAINT "coordinator_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."coordinator_assignments" ADD CONSTRAINT "coordinator_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."event_attendance" ADD CONSTRAINT "event_attendance_checked_in_by_fkey" FOREIGN KEY (checked_in_by) REFERENCES auth.users(id);

ALTER TABLE public."event_attendance" ADD CONSTRAINT "event_attendance_event_id_fkey" FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE public."event_attendance" ADD CONSTRAINT "event_attendance_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public."member_bank_accounts" ADD CONSTRAINT "member_bank_accounts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."member_nin_records" ADD CONSTRAINT "member_nin_records_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."member_referrals" ADD CONSTRAINT "member_referrals_referred_user_id_fkey" FOREIGN KEY (referred_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."member_referrals" ADD CONSTRAINT "member_referrals_referrer_user_id_fkey" FOREIGN KEY (referrer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."members" ADD CONSTRAINT "members_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."pvc_verifications" ADD CONSTRAINT "pvc_verifications_member_user_id_fkey" FOREIGN KEY (member_user_id) REFERENCES members(user_id) ON DELETE CASCADE;

ALTER TABLE public."pvc_verifications" ADD CONSTRAINT "pvc_verifications_verified_by_fkey" FOREIGN KEY (verified_by) REFERENCES auth.users(id);

ALTER TABLE public."reward_transactions" ADD CONSTRAINT "reward_transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."site_content" ADD CONSTRAINT "site_content_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public."support_groups" ADD CONSTRAINT "support_groups_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

ALTER TABLE public."support_groups" ADD CONSTRAINT "support_groups_submitted_by_fkey" FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."task_submissions" ADD CONSTRAINT "task_submissions_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

ALTER TABLE public."task_submissions" ADD CONSTRAINT "task_submissions_task_id_fkey" FOREIGN KEY (task_id) REFERENCES volunteer_tasks(id) ON DELETE CASCADE;

ALTER TABLE public."task_submissions" ADD CONSTRAINT "task_submissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."user_notifications" ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."volunteer_tasks" ADD CONSTRAINT "volunteer_tasks_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id);

ALTER TABLE public."welfare_applications" ADD CONSTRAINT "welfare_applications_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);

ALTER TABLE public."welfare_applications" ADD CONSTRAINT "welfare_applications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX announcements_created_by_idx ON public.announcements USING btree (created_by);

CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs USING btree (actor_id);

CREATE INDEX campus_mobilizers_approved_by_idx ON public.campus_mobilizers USING btree (approved_by);

CREATE INDEX campus_mobilizers_reviewed_by_idx ON public.campus_mobilizers USING btree (reviewed_by);

CREATE INDEX campus_mobilizers_scope_idx ON public.campus_mobilizers USING btree (state, status);

CREATE UNIQUE INDEX coordinator_assignment_scope_unique ON public.coordinator_assignments USING btree (user_id, role, COALESCE(state, ''::text), COALESCE(lga, ''::text), COALESCE(ward, ''::text));

CREATE INDEX coordinator_assignments_assigned_by_idx ON public.coordinator_assignments USING btree (assigned_by);

CREATE INDEX event_attendance_checked_in_by_idx ON public.event_attendance USING btree (checked_in_by);

CREATE INDEX event_attendance_user_idx ON public.event_attendance USING btree (user_id, checked_in_at DESC);

CREATE INDEX events_created_by_idx ON public.events USING btree (created_by);

CREATE INDEX events_scope_idx ON public.events USING btree (state, lga, ward);

CREATE INDEX events_status_starts_idx ON public.events USING btree (status, starts_at);

CREATE INDEX member_referrals_referrer_idx ON public.member_referrals USING btree (referrer_user_id, created_at DESC);

CREATE INDEX members_full_name_idx ON public.members USING gin (to_tsvector('simple'::regconfig, full_name));

CREATE UNIQUE INDEX members_referral_code_uidx ON public.members USING btree (referral_code);

CREATE INDEX members_reviewed_by_idx ON public.members USING btree (reviewed_by);

CREATE INDEX members_state_lga_ward_idx ON public.members USING btree (state, lga, ward);

CREATE INDEX members_status_idx ON public.members USING btree (status);

CREATE INDEX reward_transactions_user_created_idx ON public.reward_transactions USING btree (user_id, created_at DESC);

CREATE INDEX site_content_created_by_idx ON public.site_content USING btree (created_by);

CREATE INDEX support_groups_reviewed_by_idx ON public.support_groups USING btree (reviewed_by);

CREATE INDEX support_groups_scope_idx ON public.support_groups USING btree (state, lga, ward);

CREATE INDEX support_groups_status_created_idx ON public.support_groups USING btree (status, created_at DESC);

CREATE INDEX support_groups_submitted_by_idx ON public.support_groups USING btree (submitted_by);

CREATE INDEX task_submissions_reviewed_by_idx ON public.task_submissions USING btree (reviewed_by);

CREATE INDEX task_submissions_user_idx ON public.task_submissions USING btree (user_id, created_at DESC);

CREATE INDEX user_notifications_user_created_idx ON public.user_notifications USING btree (user_id, created_at DESC);

CREATE INDEX volunteer_tasks_created_by_idx ON public.volunteer_tasks USING btree (created_by);

CREATE INDEX volunteer_tasks_scope_idx ON public.volunteer_tasks USING btree (state, lga, ward);

CREATE INDEX volunteer_tasks_status_due_idx ON public.volunteer_tasks USING btree (status, due_at);

CREATE INDEX welfare_applications_reviewed_by_idx ON public.welfare_applications USING btree (reviewed_by);

CREATE INDEX welfare_applications_scope_status_idx ON public.welfare_applications USING btree (state, lga, status);

CREATE INDEX welfare_applications_user_idx ON public.welfare_applications USING btree (user_id, created_at DESC);
