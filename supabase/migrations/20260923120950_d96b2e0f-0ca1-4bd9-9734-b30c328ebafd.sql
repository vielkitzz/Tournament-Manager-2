ALTER TABLE public.team_folders ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
ALTER TABLE public.tournament_folders ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY parent_id ORDER BY created_at, id) - 1 AS position
  FROM public.team_folders
)
UPDATE public.team_folders AS folder
SET sort_order = ranked.position
FROM ranked
WHERE folder.id = ranked.id;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY parent_id ORDER BY created_at, id) - 1 AS position
  FROM public.tournament_folders
)
UPDATE public.tournament_folders AS folder
SET sort_order = ranked.position
FROM ranked
WHERE folder.id = ranked.id;