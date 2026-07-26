
DROP POLICY IF EXISTS "Permitir leitura pública" ON public.team_roster_player_links;
DROP POLICY IF EXISTS "Permitir inserção de usuários autenticados" ON public.team_roster_player_links;

REVOKE ALL ON public.team_roster_player_links FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_roster_player_links TO authenticated;
GRANT ALL ON public.team_roster_player_links TO service_role;

CREATE POLICY "roster_links_select_owner"
ON public.team_roster_player_links FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_roster_player_links.target_team_id::text AND t.user_id = (auth.uid())::text)
);

CREATE POLICY "roster_links_insert_owner"
ON public.team_roster_player_links FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_roster_player_links.target_team_id::text AND t.user_id = (auth.uid())::text)
  AND EXISTS (SELECT 1 FROM public.players p WHERE p.id = team_roster_player_links.target_player_id::text AND p.user_id = (auth.uid())::text)
);

CREATE POLICY "roster_links_update_owner"
ON public.team_roster_player_links FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_roster_player_links.target_team_id::text AND t.user_id = (auth.uid())::text)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_roster_player_links.target_team_id::text AND t.user_id = (auth.uid())::text)
);

CREATE POLICY "roster_links_delete_owner"
ON public.team_roster_player_links FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_roster_player_links.target_team_id::text AND t.user_id = (auth.uid())::text)
);
