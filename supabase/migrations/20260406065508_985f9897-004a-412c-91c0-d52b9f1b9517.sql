DROP POLICY IF EXISTS "collaborators_select_owner" ON public.tournament_collaborators;

CREATE POLICY "collaborators_select_owner"
ON public.tournament_collaborators
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.published_tournaments pt
    WHERE pt.id = tournament_collaborators.published_tournament_id
      AND pt.user_id = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Insert logos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir upload de logos para todos" ON storage.objects;
DROP POLICY IF EXISTS "Update logos" ON storage.objects;