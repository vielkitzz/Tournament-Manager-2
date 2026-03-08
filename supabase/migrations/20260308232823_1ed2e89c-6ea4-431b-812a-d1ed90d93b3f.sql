
-- Add defaults for published_tournaments
ALTER TABLE public.published_tournaments
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN share_token SET DEFAULT md5(gen_random_uuid()::text),
  ALTER COLUMN created_at SET DEFAULT now();

-- Also fix tournament_collaborators defaults
ALTER TABLE public.tournament_collaborators
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN created_at SET DEFAULT now();
