-- Global admin publishing is not used by the current app. Remove the legacy
-- RPCs so no admin verifier or owner identifier needs to live in executable DB code.
DROP FUNCTION IF EXISTS public.publish_global_admin_config(text, jsonb);
DROP FUNCTION IF EXISTS private.publish_global_admin_config_impl(text, jsonb);
