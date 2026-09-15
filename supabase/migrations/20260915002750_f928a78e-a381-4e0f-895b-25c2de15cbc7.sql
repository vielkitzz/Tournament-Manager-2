GRANT SELECT, INSERT, UPDATE, DELETE ON public.rivalries TO authenticated;
GRANT ALL ON public.rivalries TO service_role;

ALTER TABLE public.rivalries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rivalries_select_owner ON public.rivalries;
DROP POLICY IF EXISTS rivalries_insert_owner ON public.rivalries;
DROP POLICY IF EXISTS rivalries_update_owner ON public.rivalries;
DROP POLICY IF EXISTS rivalries_delete_owner ON public.rivalries;

CREATE POLICY rivalries_select_owner ON public.rivalries
FOR SELECT TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY rivalries_insert_owner ON public.rivalries
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id AND team_a_id <> team_b_id AND level BETWEEN 1 AND 5);

CREATE POLICY rivalries_update_owner ON public.rivalries
FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id AND team_a_id <> team_b_id AND level BETWEEN 1 AND 5);

CREATE POLICY rivalries_delete_owner ON public.rivalries
FOR DELETE TO authenticated
USING (auth.uid()::text = user_id);

CREATE UNIQUE INDEX IF NOT EXISTS rivalries_unique_pair_per_user
ON public.rivalries (user_id, LEAST(team_a_id, team_b_id), GREATEST(team_a_id, team_b_id));

CREATE OR REPLACE FUNCTION public.validate_rivalry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.team_a_id = NEW.team_b_id THEN
    RAISE EXCEPTION 'A rivalry requires two different teams';
  END IF;
  IF NEW.level < 1 OR NEW.level > 5 THEN
    RAISE EXCEPTION 'Rivalry level must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_rivalry ON public.rivalries;
CREATE TRIGGER trg_validate_rivalry
BEFORE INSERT OR UPDATE ON public.rivalries
FOR EACH ROW EXECUTE FUNCTION public.validate_rivalry();