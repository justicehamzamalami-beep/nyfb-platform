-- Neon staging: Better Auth registration fields and NYFB account bootstrap.
-- Additive migration. Existing migrated accounts are not rewritten.
CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public."user"
  ADD COLUMN IF NOT EXISTS "phone" text,
  ADD COLUMN IF NOT EXISTS "gender" text,
  ADD COLUMN IF NOT EXISTS "dateOfBirth" text,
  ADD COLUMN IF NOT EXISTS "state" text,
  ADD COLUMN IF NOT EXISTS "lga" text,
  ADD COLUMN IF NOT EXISTS "ward" text,
  ADD COLUMN IF NOT EXISTS "occupation" text,
  ADD COLUMN IF NOT EXISTS "ninNumber" text,
  ADD COLUMN IF NOT EXISTS "referralCode" text,
  ADD COLUMN IF NOT EXISTS "browserRegistrationKey" text;

CREATE TABLE IF NOT EXISTS private.nyfb_device_registration_claims (
  device_hash text PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE private.nyfb_device_registration_claims FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.handle_better_auth_nyfb_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_name text := coalesce(nullif(trim(NEW.name), ''), 'New member');
  v_phone text := coalesce(nullif(trim(NEW."phone"), ''), '');
  v_nin text := nullif(trim(coalesce(NEW."ninNumber", '')), '');
  v_device_key text := nullif(trim(coalesce(NEW."browserRegistrationKey", '')), '');
  v_referral_code text := nullif(upper(trim(coalesce(NEW."referralCode", ''))), '');
  v_own_referral_code text := 'NYFB' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  v_referrer_user_id uuid;
  v_device_hash text;
BEGIN
  IF NEW.id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RAISE EXCEPTION 'Invalid NYFB account identifier.' USING ERRCODE = '22023';
  END IF;
  IF v_device_key IS NULL OR length(v_device_key) < 32 OR length(v_device_key) > 200 THEN
    RAISE EXCEPTION 'Browser verification is missing. Refresh the registration page and try again.'
      USING ERRCODE = '22023';
  END IF;
  IF v_phone = '' OR nullif(trim(NEW."state"), '') IS NULL OR nullif(trim(NEW."lga"), '') IS NULL THEN
    RAISE EXCEPTION 'Phone number, state and local government area are required.'
      USING ERRCODE = '22023';
  END IF;

  -- Maintain UUID compatibility with existing NYFB application-table foreign keys.
  INSERT INTO auth.users(id) VALUES (NEW.id::uuid);

  v_device_hash := encode(extensions.digest(convert_to(v_device_key, 'UTF8'), 'sha256'), 'hex');
  BEGIN
    INSERT INTO private.nyfb_device_registration_claims(device_hash, user_id)
    VALUES (v_device_hash, NEW.id::uuid);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Only one NYFB account can be registered from this browser/device. Sign in to your existing account or contact NYFB support if this is a shared device.'
      USING ERRCODE = '23505';
  END;

  INSERT INTO public.profiles(id, full_name, phone)
  VALUES (NEW.id::uuid, v_name, nullif(v_phone, ''));

  INSERT INTO public.members(
    user_id, full_name, email, phone, gender, date_of_birth,
    state, lga, ward, occupation, referral_code
  )
  VALUES (
    NEW.id::uuid, v_name, NEW.email, v_phone, nullif(NEW."gender", ''),
    nullif(NEW."dateOfBirth", '')::date,
    coalesce(nullif(trim(NEW."state"), ''), 'Not provided'),
    coalesce(nullif(trim(NEW."lga"), ''), 'Not provided'),
    nullif(trim(NEW."ward"), ''), nullif(trim(NEW."occupation"), ''),
    v_own_referral_code
  );

  IF v_nin IS NOT NULL THEN
    INSERT INTO public.member_nin_records(user_id, nin_number)
    VALUES (NEW.id::uuid, v_nin);
  END IF;

  INSERT INTO public.pvc_verifications(member_user_id)
  VALUES (NEW.id::uuid)
  ON CONFLICT (member_user_id) DO NOTHING;

  IF v_referral_code IS NOT NULL THEN
    SELECT m.user_id INTO v_referrer_user_id
    FROM public.members m
    WHERE upper(m.referral_code) = v_referral_code
      AND m.user_id <> NEW.id::uuid
    LIMIT 1;
    IF v_referrer_user_id IS NOT NULL THEN
      INSERT INTO public.member_referrals(referrer_user_id, referred_user_id, referral_code, status)
      VALUES (v_referrer_user_id, NEW.id::uuid, v_referral_code, 'registered')
      ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.handle_better_auth_nyfb_user() FROM PUBLIC;
DROP TRIGGER IF EXISTS on_better_auth_user_created_nyfb ON public."user";
CREATE TRIGGER on_better_auth_user_created_nyfb
AFTER INSERT ON public."user"
FOR EACH ROW EXECUTE FUNCTION private.handle_better_auth_nyfb_user();
