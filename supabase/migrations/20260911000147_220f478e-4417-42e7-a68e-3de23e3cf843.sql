CREATE TABLE IF NOT EXISTS public.rivalries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  team_a_id text not null,
  team_b_id text not null,
  level integer not null default 3,
  name text,
  created_at timestamptz not null default now(),
  constraint rivalries_level_range check (level between 1 and 5),
  constraint rivalries_distinct_teams check (team_a_id <> team_b_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS rivalries_unique_pair
  ON public.rivalries (user_id, least(team_a_id, team_b_id), greatest(team_a_id, team_b_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rivalries TO authenticated;
GRANT ALL ON public.rivalries TO service_role;

ALTER TABLE public.rivalries ENABLE ROW LEVEL SECURITY;

CREATE POLICY rivalries_select_owner ON public.rivalries FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY rivalries_insert_owner ON public.rivalries FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY rivalries_update_owner ON public.rivalries FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id) WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY rivalries_delete_owner ON public.rivalries FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);