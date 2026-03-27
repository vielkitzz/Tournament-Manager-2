
-- 1. Add visibility column to published_tournaments
ALTER TABLE public.published_tournaments 
ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- 2. Add RLS policy for public/anonymous read via share_token
CREATE POLICY "public_read_by_token" ON public.published_tournaments
FOR SELECT TO anon, authenticated
USING (visibility = 'public');

-- 3. Create a SECURITY DEFINER function to get full shared tournament data
-- Returns tournament + teams + team_histories as JSON
CREATE OR REPLACE FUNCTION public.get_shared_tournament_full(p_token text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tournament record;
  v_pub record;
  v_team_ids jsonb;
  v_teams json;
  v_histories json;
  v_visibility text;
  v_owner_id text;
BEGIN
  -- Get published tournament info
  SELECT pt.*, t.*
  INTO v_pub
  FROM public.published_tournaments pt
  INNER JOIN public.tournaments t ON t.id = pt.tournament_id
  WHERE pt.share_token = p_token
  LIMIT 1;

  IF v_pub IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get the visibility and owner
  SELECT pt.visibility, pt.user_id 
  INTO v_visibility, v_owner_id
  FROM public.published_tournaments pt
  WHERE pt.share_token = p_token
  LIMIT 1;

  -- Get team_ids from tournament
  v_team_ids := COALESCE(v_pub.team_ids, '[]'::jsonb);

  -- Get teams that belong to the tournament owner
  SELECT json_agg(t.*)
  INTO v_teams
  FROM public.teams t
  WHERE t.user_id = v_owner_id;

  -- Get team histories that belong to the tournament owner
  SELECT json_agg(h.*)
  INTO v_histories
  FROM public.team_histories h
  WHERE h.user_id = v_owner_id;

  -- Return everything as JSON
  RETURN json_build_object(
    'tournament', row_to_json(v_pub),
    'teams', COALESCE(v_teams, '[]'::json),
    'team_histories', COALESCE(v_histories, '[]'::json),
    'visibility', v_visibility,
    'owner_id', v_owner_id
  );
END;
$$;

-- 4. Function to check collaborator role
CREATE OR REPLACE FUNCTION public.get_collaborator_role(p_token text, p_user_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tc.role
  FROM public.tournament_collaborators tc
  INNER JOIN public.published_tournaments pt ON pt.id = tc.published_tournament_id
  WHERE pt.share_token = p_token
    AND tc.email = p_user_email
  LIMIT 1;
$$;

-- 5. Function to update tournament from shared context (admin only)
CREATE OR REPLACE FUNCTION public.update_shared_tournament(p_token text, p_user_email text, p_updates jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
  v_tournament_id text;
BEGIN
  -- Check if user is admin
  SELECT tc.role INTO v_role
  FROM public.tournament_collaborators tc
  INNER JOIN public.published_tournaments pt ON pt.id = tc.published_tournament_id
  WHERE pt.share_token = p_token
    AND tc.email = p_user_email;

  IF v_role IS NULL OR v_role != 'admin' THEN
    RETURN false;
  END IF;

  -- Get tournament id
  SELECT pt.tournament_id INTO v_tournament_id
  FROM public.published_tournaments pt
  WHERE pt.share_token = p_token;

  IF v_tournament_id IS NULL THEN
    RETURN false;
  END IF;

  -- Apply updates
  UPDATE public.tournaments
  SET 
    matches = COALESCE((p_updates->>'matches')::jsonb, matches),
    settings = COALESCE(p_updates->>'settings', settings),
    finalized = COALESCE(p_updates->>'finalized', finalized),
    groups_finalized = COALESCE(p_updates->>'groups_finalized', groups_finalized),
    seasons = COALESCE((p_updates->>'seasons')::jsonb, seasons),
    team_ids = COALESCE((p_updates->>'team_ids')::jsonb, team_ids)
  WHERE id = v_tournament_id;

  RETURN true;
END;
$$;
