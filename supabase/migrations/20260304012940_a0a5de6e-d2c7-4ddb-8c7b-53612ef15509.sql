CREATE TABLE public.team_histories (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  team_id text NOT NULL,
  user_id text NOT NULL,
  start_year int NOT NULL,
  end_year int NOT NULL,
  logo text,
  rating numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_year_range CHECK (end_year >= start_year)
);

CREATE INDEX idx_team_histories_team ON public.team_histories(team_id);
CREATE INDEX idx_team_histories_user ON public.team_histories(user_id);

ALTER TABLE public.team_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "histories_select_owner" ON public.team_histories FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "histories_insert_auth" ON public.team_histories FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "histories_update_owner" ON public.team_histories FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "histories_delete_owner" ON public.team_histories FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);