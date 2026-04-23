-- Add new skill column (45-99) replacing rating
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS skill integer NOT NULL DEFAULT 70;

-- Constraint to enforce range
ALTER TABLE public.players
  DROP CONSTRAINT IF EXISTS players_skill_range_chk;
ALTER TABLE public.players
  ADD CONSTRAINT players_skill_range_chk CHECK (skill >= 45 AND skill <= 99);

-- Backfill existing rows to default 70 (in case any were null somehow)
UPDATE public.players SET skill = 70 WHERE skill IS NULL;

-- Drop deprecated rating column
ALTER TABLE public.players DROP COLUMN IF EXISTS rating;