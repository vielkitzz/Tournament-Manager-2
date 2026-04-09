
CREATE TABLE public.players (
  id text NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  user_id text NOT NULL,
  team_id text DEFAULT NULL,
  name text NOT NULL,
  position text,
  shirt_number integer,
  rating integer DEFAULT 0,
  photo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select_owner" ON public.players FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "players_insert_auth" ON public.players FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "players_update_owner" ON public.players FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "players_delete_owner" ON public.players FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);
