
-- 1. Fix collaborator email exposure: restrict self-select to user's own email AND tournaments they're collaborating on
DROP POLICY IF EXISTS "collaborators_select_self" ON public.tournament_collaborators;

CREATE POLICY "collaborators_select_self"
ON public.tournament_collaborators
FOR SELECT
TO authenticated
USING (
  email = (SELECT (auth.jwt() ->> 'email'))
  AND user_id = (auth.uid())::text
);

-- Backfill user_id for existing collaborator rows where missing, so the new policy works
UPDATE public.tournament_collaborators tc
SET user_id = u.id::text
FROM auth.users u
WHERE tc.user_id IS NULL
  AND lower(u.email) = lower(tc.email);

-- 2. Fix share token enumeration: remove broad anonymous read on published_tournaments.
-- Access is preserved via SECURITY DEFINER functions get_shared_tournament_full / get_tournament_by_share_token
-- which require knowing the share token.
DROP POLICY IF EXISTS "public_read_by_token" ON public.published_tournaments;

-- 3. Fix public bucket listing: remove overly broad anonymous SELECT/list policies on storage.objects for 'logos'.
-- Keep ownership-based modify policies. Individual files remain reachable via their public URL (bucket is public)
-- but the bucket can no longer be listed/enumerated.
DROP POLICY IF EXISTS "Permitir visualização pública de logos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "View logos" ON storage.objects;
