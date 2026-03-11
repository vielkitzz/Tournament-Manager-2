
-- Drop ALL restrictive policies and recreate as PERMISSIVE

-- published_tournaments
DROP POLICY IF EXISTS "published_delete_owner" ON public.published_tournaments;
DROP POLICY IF EXISTS "published_insert_auth" ON public.published_tournaments;
DROP POLICY IF EXISTS "published_select_owner" ON public.published_tournaments;
DROP POLICY IF EXISTS "published_update_owner" ON public.published_tournaments;

CREATE POLICY "published_select_owner" ON public.published_tournaments AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "published_insert_auth" ON public.published_tournaments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "published_update_owner" ON public.published_tournaments AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "published_delete_owner" ON public.published_tournaments AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- tournaments
DROP POLICY IF EXISTS "tournaments_delete_owner" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_insert_auth" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_select_owner" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_select_published" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_update_owner" ON public.tournaments;

CREATE POLICY "tournaments_select_owner" ON public.tournaments AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "tournaments_insert_auth" ON public.tournaments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "tournaments_update_owner" ON public.tournaments AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "tournaments_delete_owner" ON public.tournaments AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- teams
DROP POLICY IF EXISTS "teams_delete_owner" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_auth" ON public.teams;
DROP POLICY IF EXISTS "teams_select_owner" ON public.teams;
DROP POLICY IF EXISTS "teams_select_published" ON public.teams;
DROP POLICY IF EXISTS "teams_update_owner" ON public.teams;

CREATE POLICY "teams_select_owner" ON public.teams AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "teams_insert_auth" ON public.teams AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "teams_update_owner" ON public.teams AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "teams_delete_owner" ON public.teams AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- team_folders
DROP POLICY IF EXISTS "folders_delete_owner" ON public.team_folders;
DROP POLICY IF EXISTS "folders_insert_auth" ON public.team_folders;
DROP POLICY IF EXISTS "folders_select_owner" ON public.team_folders;
DROP POLICY IF EXISTS "folders_update_owner" ON public.team_folders;

CREATE POLICY "folders_select_owner" ON public.team_folders AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "folders_insert_auth" ON public.team_folders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "folders_update_owner" ON public.team_folders AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "folders_delete_owner" ON public.team_folders AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- tournament_folders
DROP POLICY IF EXISTS "tfolders_delete_owner" ON public.tournament_folders;
DROP POLICY IF EXISTS "tfolders_insert_auth" ON public.tournament_folders;
DROP POLICY IF EXISTS "tfolders_select_owner" ON public.tournament_folders;
DROP POLICY IF EXISTS "tfolders_update_owner" ON public.tournament_folders;

CREATE POLICY "tfolders_select_owner" ON public.tournament_folders AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "tfolders_insert_auth" ON public.tournament_folders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "tfolders_update_owner" ON public.tournament_folders AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "tfolders_delete_owner" ON public.tournament_folders AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- tournament_collaborators
DROP POLICY IF EXISTS "collaborators_delete_owner" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "collaborators_insert_auth" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "collaborators_select_owner" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "collaborators_update_owner" ON public.tournament_collaborators;

CREATE POLICY "collaborators_select_owner" ON public.tournament_collaborators AS PERMISSIVE FOR SELECT TO authenticated USING (((auth.uid())::text = user_id) OR EXISTS (SELECT 1 FROM published_tournaments pt WHERE pt.id = tournament_collaborators.published_tournament_id AND pt.user_id = (auth.uid())::text));
CREATE POLICY "collaborators_insert_auth" ON public.tournament_collaborators AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM published_tournaments pt WHERE pt.id = tournament_collaborators.published_tournament_id AND pt.user_id = (auth.uid())::text));
CREATE POLICY "collaborators_update_owner" ON public.tournament_collaborators AS PERMISSIVE FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM published_tournaments pt WHERE pt.id = tournament_collaborators.published_tournament_id AND pt.user_id = (auth.uid())::text));
CREATE POLICY "collaborators_delete_owner" ON public.tournament_collaborators AS PERMISSIVE FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM published_tournaments pt WHERE pt.id = tournament_collaborators.published_tournament_id AND pt.user_id = (auth.uid())::text));

-- team_histories
DROP POLICY IF EXISTS "histories_delete_owner" ON public.team_histories;
DROP POLICY IF EXISTS "histories_insert_auth" ON public.team_histories;
DROP POLICY IF EXISTS "histories_select_owner" ON public.team_histories;
DROP POLICY IF EXISTS "histories_update_owner" ON public.team_histories;

CREATE POLICY "histories_select_owner" ON public.team_histories AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "histories_insert_auth" ON public.team_histories AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "histories_update_owner" ON public.team_histories AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "histories_delete_owner" ON public.team_histories AS PERMISSIVE FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);
