
-- Remove remaining old RESTRICTIVE policies that conflict
DROP POLICY IF EXISTS "Dono edita seus torneios" ON public.tournaments;
DROP POLICY IF EXISTS "Permitir leitura de competições para todos" ON public.tournaments;
DROP POLICY IF EXISTS "Permitir que usuários logados criem competições" ON public.tournaments;
DROP POLICY IF EXISTS "Permitir que usuários logados editem competições" ON public.tournaments;

DROP POLICY IF EXISTS "Dono gerencia seus times" ON public.teams;
DROP POLICY IF EXISTS "Permitir tudo para autenticados" ON public.teams;

DROP POLICY IF EXISTS "Dono gerencia suas pastas" ON public.team_folders;

DROP POLICY IF EXISTS "Dono edita torneios publicados" ON public.published_tournaments;
DROP POLICY IF EXISTS "Visitantes podem ver torneios publicados" ON public.published_tournaments;

DROP POLICY IF EXISTS "Dono gerencia colaboradores" ON public.tournament_collaborators;

-- Fix search_path on validation functions
ALTER FUNCTION public.validate_tournament() SET search_path = public;
ALTER FUNCTION public.validate_team() SET search_path = public;
