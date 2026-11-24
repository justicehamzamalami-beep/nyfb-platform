-- Clear sensitive one-time signup fields after they have been transferred into their protected NYFB records.
CREATE OR REPLACE FUNCTION private.clear_nyfb_signup_secrets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE public."user"
  SET "ninNumber" = NULL,
      "browserRegistrationKey" = NULL,
      "referralCode" = NULL
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.clear_nyfb_signup_secrets() FROM PUBLIC;
DROP TRIGGER IF EXISTS zzz_clear_nyfb_signup_secrets ON public."user";
CREATE TRIGGER zzz_clear_nyfb_signup_secrets
AFTER INSERT ON public."user"
FOR EACH ROW EXECUTE FUNCTION private.clear_nyfb_signup_secrets();
