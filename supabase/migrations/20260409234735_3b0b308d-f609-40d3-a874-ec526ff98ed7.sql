
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.players ALTER COLUMN rating TYPE numeric(3,2) USING (CASE WHEN rating IS NOT NULL AND rating > 0 THEN LEAST(rating::numeric / 10.0, 9.99) ELSE 0.00 END);
ALTER TABLE public.players ALTER COLUMN rating SET DEFAULT 0.00;
