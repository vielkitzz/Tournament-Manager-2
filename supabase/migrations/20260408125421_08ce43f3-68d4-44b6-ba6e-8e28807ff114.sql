
-- Fix 1: Harden check_logo_ownership to validate UUID format
CREATE OR REPLACE FUNCTION public.check_logo_ownership(object_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  entity_id uuid;
BEGIN
  IF object_name IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    entity_id := substring(object_name from '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;

  IF entity_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.teams WHERE id::uuid = entity_id AND user_id = auth.uid()::text
  ) OR EXISTS (
    SELECT 1 FROM public.tournaments WHERE id::uuid = entity_id AND user_id = auth.uid()::text
  );
END;
$function$;

-- Fix 2: Allow collaborators to view their own records
CREATE POLICY "collaborators_select_self"
ON public.tournament_collaborators
FOR SELECT
TO authenticated
USING (email = (SELECT auth.jwt()->>'email'));
