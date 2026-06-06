
-- 1. club_sync_links: drop unrestricted policy
DROP POLICY IF EXISTS "Permitir tudo para usuários autenticados" ON public.club_sync_links;

-- 2. players: drop unrestricted policy (edge function uses service role)
DROP POLICY IF EXISTS "Liberar Insercao Edge Function" ON public.players;

-- 3. player_season_stats: scope writes to player owner
DROP POLICY IF EXISTS "Estatísticas editáveis por autenticados" ON public.player_season_stats;

CREATE POLICY "player_season_stats_insert_owner"
ON public.player_season_stats
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = player_season_stats.player_id
      AND p.user_id = (auth.uid())::text
  )
);

CREATE POLICY "player_season_stats_update_owner"
ON public.player_season_stats
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = player_season_stats.player_id
      AND p.user_id = (auth.uid())::text
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = player_season_stats.player_id
      AND p.user_id = (auth.uid())::text
  )
);

CREATE POLICY "player_season_stats_delete_owner"
ON public.player_season_stats
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = player_season_stats.player_id
      AND p.user_id = (auth.uid())::text
  )
);

-- 4. fonts bucket: restrict writes to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload fonts" ON storage.objects;

CREATE POLICY "Users can upload own fonts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'fonts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own fonts"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'fonts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. sync_logs: deny client access (only service role inside edge functions)
DROP POLICY IF EXISTS "sync_logs_no_client_access" ON public.sync_logs;
CREATE POLICY "sync_logs_no_client_access"
ON public.sync_logs
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
