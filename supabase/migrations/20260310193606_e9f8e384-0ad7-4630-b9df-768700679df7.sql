
-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE for published_tournaments
DROP POLICY IF EXISTS "published_select_owner" ON public.published_tournaments;
DROP POLICY IF EXISTS "published_insert_auth" ON public.published_tournaments;
DROP POLICY IF EXISTS "published_update_owner" ON public.published_tournaments;
DROP POLICY IF EXISTS "published_delete_owner" ON public.published_tournaments;

CREATE POLICY "published_select_owner" ON public.published_tournaments
  FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "published_insert_auth" ON public.published_tournaments
  FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "published_update_owner" ON public.published_tournaments
  FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "published_delete_owner" ON public.published_tournaments
  FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE for tournaments
DROP POLICY IF EXISTS "tournaments_select_owner" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_select_published" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_insert_auth" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_update_owner" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_delete_owner" ON public.tournaments;

CREATE POLICY "tournaments_select_owner" ON public.tournaments
  FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "tournaments_select_published" ON public.tournaments
  FOR SELECT TO public USING (
    EXISTS (SELECT 1 FROM published_tournaments pt WHERE pt.tournament_id = tournaments.id)
  );

CREATE POLICY "tournaments_insert_auth" ON public.tournaments
  FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "tournaments_update_owner" ON public.tournaments
  FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "tournaments_delete_owner" ON public.tournaments
  FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE for teams
DROP POLICY IF EXISTS "teams_select_owner" ON public.teams;
DROP POLICY IF EXISTS "teams_select_published" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_auth" ON public.teams;
DROP POLICY IF EXISTS "teams_update_owner" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_owner" ON public.teams;

CREATE POLICY "teams_select_owner" ON public.teams
  FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "teams_select_published" ON public.teams
  FOR SELECT TO public USING (
    EXISTS (
      SELECT 1 FROM tournaments t
      JOIN published_tournaments pt ON pt.tournament_id = t.id
      WHERE t.team_ids @> to_jsonb(teams.id)
    )
  );

CREATE POLICY "teams_insert_auth" ON public.teams
  FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "teams_update_owner" ON public.teams
  FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "teams_delete_owner" ON public.teams
  FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE for tournament_collaborators
DROP POLICY IF EXISTS "collaborators_select_owner" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_auth" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "collaborators_update_owner" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "collaborators_delete_owner" ON public.tournament_collaborators;

CREATE POLICY "collaborators_select_owner" ON public.tournament_collaborators
  FOR SELECT TO authenticated USING (
    ((auth.uid())::text = user_id) OR
    EXISTS (SELECT 1 FROM published_tournaments pt WHERE pt.id = tournament_collaborators.published_tournament_id AND pt.user_id = (auth.uid())::text)
  );

CREATE POLICY "collaborators_insert_auth" ON public.tournament_collaborators
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM published_tournaments pt WHERE pt.id = tournament_collaborators.published_tournament_id AND pt.user_id = (auth.uid())::text)
  );

CREATE POLICY "collaborators_update_owner" ON public.tournament_collaborators
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM published_tournaments pt WHERE pt.id = tournament_collaborators.published_tournament_id AND pt.user_id = (auth.uid())::text)
  );

CREATE POLICY "collaborators_delete_owner" ON public.tournament_collaborators
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM published_tournaments pt WHERE pt.id = tournament_collaborators.published_tournament_id AND pt.user_id = (auth.uid())::text)
  );

-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE for team_folders
DROP POLICY IF EXISTS "folders_select_owner" ON public.team_folders;
DROP POLICY IF EXISTS "folders_insert_auth" ON public.team_folders;
DROP POLICY IF EXISTS "folders_update_owner" ON public.team_folders;
DROP POLICY IF EXISTS "folders_delete_owner" ON public.team_folders;

CREATE POLICY "folders_select_owner" ON public.team_folders
  FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "folders_insert_auth" ON public.team_folders
  FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "folders_update_owner" ON public.team_folders
  FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "folders_delete_owner" ON public.team_folders
  FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE for tournament_folders
DROP POLICY IF EXISTS "tfolders_select_owner" ON public.tournament_folders;
DROP POLICY IF EXISTS "tfolders_insert_auth" ON public.tournament_folders;
DROP POLICY IF EXISTS "tfolders_update_owner" ON public.tournament_folders;
DROP POLICY IF EXISTS "tfolders_delete_owner" ON public.tournament_folders;

CREATE POLICY "tfolders_select_owner" ON public.tournament_folders
  FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "tfolders_insert_auth" ON public.tournament_folders
  FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "tfolders_update_owner" ON public.tournament_folders
  FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "tfolders_delete_owner" ON public.tournament_folders
  FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- Drop all RESTRICTIVE policies and recreate as PERMISSIVE for team_histories
DROP POLICY IF EXISTS "histories_select_owner" ON public.team_histories;
DROP POLICY IF EXISTS "histories_insert_auth" ON public.team_histories;
DROP POLICY IF EXISTS "histories_update_owner" ON public.team_histories;
DROP POLICY IF EXISTS "histories_delete_owner" ON public.team_histories;

CREATE POLICY "histories_select_owner" ON public.team_histories
  FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "histories_insert_auth" ON public.team_histories
  FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);

CREATE POLICY "histories_update_owner" ON public.team_histories
  FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);

CREATE POLICY "histories_delete_owner" ON public.team_histories
  FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);
