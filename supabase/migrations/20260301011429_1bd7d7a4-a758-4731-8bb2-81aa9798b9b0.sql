
-- =============================================
-- 1. INDEXES for performance
-- =============================================

-- tournaments indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_user_id ON public.tournaments (user_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_format ON public.tournaments (format);

-- teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_user_id ON public.teams (user_id);
CREATE INDEX IF NOT EXISTS idx_teams_folder_id ON public.teams (folder_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams (name);

-- team_folders indexes
CREATE INDEX IF NOT EXISTS idx_team_folders_user_id ON public.team_folders (user_id);
CREATE INDEX IF NOT EXISTS idx_team_folders_parent_id ON public.team_folders (parent_id);

-- published_tournaments indexes
CREATE INDEX IF NOT EXISTS idx_published_tournaments_user_id ON public.published_tournaments (user_id);
CREATE INDEX IF NOT EXISTS idx_published_tournaments_tournament_id ON public.published_tournaments (tournament_id);
CREATE INDEX IF NOT EXISTS idx_published_tournaments_share_token ON public.published_tournaments (share_token);

-- tournament_collaborators indexes
CREATE INDEX IF NOT EXISTS idx_tournament_collaborators_user_id ON public.tournament_collaborators (user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_collaborators_published_tournament_id ON public.tournament_collaborators (published_tournament_id);

-- JSONB indexes for nested queries
CREATE INDEX IF NOT EXISTS idx_tournaments_team_ids ON public.tournaments USING GIN (team_ids);
CREATE INDEX IF NOT EXISTS idx_tournaments_matches ON public.tournaments USING GIN (matches);

-- =============================================
-- 2. CLEANUP redundant RLS policies
-- =============================================

-- tournaments: remove redundant SELECT/INSERT/UPDATE policies (keep owner + public select + auth insert/update)
DROP POLICY IF EXISTS "Allow All" ON public.tournaments;
DROP POLICY IF EXISTS "Allow All Update" ON public.tournaments;
DROP POLICY IF EXISTS "Auth Insert" ON public.tournaments;
DROP POLICY IF EXISTS "Auth Update" ON public.tournaments;
DROP POLICY IF EXISTS "Public Select" ON public.tournaments;
DROP POLICY IF EXISTS "Visitantes podem ver os torneios" ON public.tournaments;

-- teams: remove redundant policies
DROP POLICY IF EXISTS "Allow All" ON public.teams;
DROP POLICY IF EXISTS "Allow All Update" ON public.teams;
DROP POLICY IF EXISTS "Auth Insert" ON public.teams;
DROP POLICY IF EXISTS "Auth Update" ON public.teams;
DROP POLICY IF EXISTS "Public Select" ON public.teams;
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
DROP POLICY IF EXISTS "Users can insert teams" ON public.teams;

-- team_folders: remove redundant policies
DROP POLICY IF EXISTS "Allow All" ON public.team_folders;
DROP POLICY IF EXISTS "Allow All Folders" ON public.team_folders;
DROP POLICY IF EXISTS "Allow All Update" ON public.team_folders;
DROP POLICY IF EXISTS "Auth Insert" ON public.team_folders;
DROP POLICY IF EXISTS "Auth Update" ON public.team_folders;
DROP POLICY IF EXISTS "Public Select" ON public.team_folders;

-- published_tournaments: remove redundant policies
DROP POLICY IF EXISTS "Allow All" ON public.published_tournaments;
DROP POLICY IF EXISTS "Allow All Update" ON public.published_tournaments;
DROP POLICY IF EXISTS "Auth Insert" ON public.published_tournaments;
DROP POLICY IF EXISTS "Auth Update" ON public.published_tournaments;
DROP POLICY IF EXISTS "Public Select" ON public.published_tournaments;

-- tournament_collaborators: remove redundant policies
DROP POLICY IF EXISTS "Allow All" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "Allow All Update" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "Auth Insert" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "Auth Update" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "Public Select" ON public.tournament_collaborators;

-- =============================================
-- 3. RECREATE clean PERMISSIVE RLS policies
-- =============================================

-- TOURNAMENTS
CREATE POLICY "tournaments_select_public" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "tournaments_insert_auth" ON public.tournaments FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "tournaments_update_owner" ON public.tournaments FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "tournaments_delete_owner" ON public.tournaments FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- TEAMS
CREATE POLICY "teams_select_public" ON public.teams FOR SELECT USING (true);
CREATE POLICY "teams_insert_auth" ON public.teams FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "teams_update_owner" ON public.teams FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "teams_delete_owner" ON public.teams FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- TEAM_FOLDERS
CREATE POLICY "folders_select_owner" ON public.team_folders FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "folders_insert_auth" ON public.team_folders FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "folders_update_owner" ON public.team_folders FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "folders_delete_owner" ON public.team_folders FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- PUBLISHED_TOURNAMENTS
CREATE POLICY "published_select_public" ON public.published_tournaments FOR SELECT USING (true);
CREATE POLICY "published_insert_auth" ON public.published_tournaments FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "published_update_owner" ON public.published_tournaments FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "published_delete_owner" ON public.published_tournaments FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- TOURNAMENT_COLLABORATORS
CREATE POLICY "collaborators_select_public" ON public.tournament_collaborators FOR SELECT USING (true);
CREATE POLICY "collaborators_insert_auth" ON public.tournament_collaborators FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "collaborators_update_owner" ON public.tournament_collaborators FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "collaborators_delete_owner" ON public.tournament_collaborators FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- =============================================
-- 4. VALIDATION TRIGGERS (instead of CHECK constraints)
-- =============================================

-- Validate tournament data before insert/update
CREATE OR REPLACE FUNCTION public.validate_tournament()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Tournament name cannot be empty';
  END IF;
  IF NEW.format IS NOT NULL AND NEW.format NOT IN ('liga', 'grupos', 'mata-mata', 'suico') THEN
    RAISE EXCEPTION 'Invalid tournament format: %', NEW.format;
  END IF;
  IF NEW.number_of_teams IS NOT NULL AND NEW.number_of_teams::int < 2 THEN
    RAISE EXCEPTION 'Tournament must have at least 2 teams';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_tournament ON public.tournaments;
CREATE TRIGGER trg_validate_tournament
  BEFORE INSERT OR UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.validate_tournament();

-- Validate team data before insert/update
CREATE OR REPLACE FUNCTION public.validate_team()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.name IS NULL OR trim(NEW.name) = '' THEN
    RAISE EXCEPTION 'Team name cannot be empty';
  END IF;
  IF NEW.rate IS NOT NULL AND (NEW.rate < 0 OR NEW.rate > 100) THEN
    RAISE EXCEPTION 'Team rate must be between 0 and 100';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_team ON public.teams;
CREATE TRIGGER trg_validate_team
  BEFORE INSERT OR UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.validate_team();
