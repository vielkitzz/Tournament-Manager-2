
-- Create tournament_folders table
CREATE TABLE public.tournament_folders (
  id text NOT NULL DEFAULT (gen_random_uuid())::text PRIMARY KEY,
  user_id text,
  name text NOT NULL,
  parent_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tournament_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as team_folders)
CREATE POLICY "tfolders_select_owner" ON public.tournament_folders FOR SELECT TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "tfolders_insert_auth" ON public.tournament_folders FOR INSERT TO authenticated WITH CHECK ((auth.uid())::text = user_id);
CREATE POLICY "tfolders_update_owner" ON public.tournament_folders FOR UPDATE TO authenticated USING ((auth.uid())::text = user_id);
CREATE POLICY "tfolders_delete_owner" ON public.tournament_folders FOR DELETE TO authenticated USING ((auth.uid())::text = user_id);

-- Add folder_id column to tournaments
ALTER TABLE public.tournaments ADD COLUMN folder_id text;
