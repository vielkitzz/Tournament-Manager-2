
-- Fix security regression: restore properly scoped RLS policies

-- 1. Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "published_select_public" ON public.published_tournaments;
DROP POLICY IF EXISTS "collaborators_select_public" ON public.tournament_collaborators;
DROP POLICY IF EXISTS "tournaments_select_public" ON public.tournaments;
DROP POLICY IF EXISTS "teams_select_public" ON public.teams;

-- 2. Restore secure SELECT policies

-- Published tournaments: owner can see their own, public can see via share_token (handled at app level)
CREATE POLICY "published_select_owner"
  ON public.published_tournaments FOR SELECT
  USING ((auth.uid())::text = user_id);

-- Also allow public read for shared tournaments (needed for SharedTournamentPage)
CREATE POLICY "published_select_by_token"
  ON public.published_tournaments FOR SELECT
  USING (share_token IS NOT NULL);

-- Tournaments: owner only
CREATE POLICY "tournaments_select_owner"
  ON public.tournaments FOR SELECT
  USING ((auth.uid())::text = user_id);

-- Also allow reading tournaments that are published (for shared view)
CREATE POLICY "tournaments_select_published"
  ON public.tournaments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.published_tournaments pt
      WHERE pt.tournament_id = tournaments.id
    )
  );

-- Teams: owner can see their own teams
CREATE POLICY "teams_select_owner"
  ON public.teams FOR SELECT
  USING ((auth.uid())::text = user_id);

-- Teams referenced by published tournaments should be visible
CREATE POLICY "teams_select_published"
  ON public.teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      JOIN public.published_tournaments pt ON pt.tournament_id = t.id
      WHERE t.team_ids @> to_jsonb(teams.id)
    )
  );

-- Collaborators: only tournament owner and the collaborator themselves
CREATE POLICY "collaborators_select_owner"
  ON public.tournament_collaborators FOR SELECT
  USING (
    (auth.uid())::text = user_id
    OR EXISTS (
      SELECT 1 FROM public.published_tournaments pt
      WHERE pt.id = tournament_collaborators.published_tournament_id
        AND pt.user_id = (auth.uid())::text
    )
  );
