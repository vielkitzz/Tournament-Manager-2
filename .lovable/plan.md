## Mudanças no `MatchPopup.tsx` + nova edge function

### 1. Nova edge function `get-solarahub-lineup`
- Input: `{ solarahub_club_id: string }`
- Server-side usa `SOLARAHUB_URL` + `SOLARAHUB_ANON_KEY` (já são secrets).
- Retorna `{ lineup: { formation, mentality, pitchIds, benchIds, estiloJogo, pressao, bolaAerea } | null }`.
- Sem dados de jogadores — usaremos `homePlayers`/`awayPlayers` já carregados no TM2 via `master_player_id` para casar starters.

### 2. Props novos no `MatchPopup`
```ts
homeMoral?: number; // -0.15..+0.15, default 0
awayMoral?: number; // -0.15..+0.15, default 0
```
Apenas estrutura — nenhum cálculo de moral agora.

### 3. Carregamento background do lineup
`useEffect` no mount do popup, em paralelo para os dois times:
1. `select` em `club_sync_links` para o `tm2_team_id` (RLS do TM2).
2. Se houver `solarahub_club_id`, chama `supabase.functions.invoke("get-solarahub-lineup", ...)`.
3. Salva em estado `homeLineup` / `awayLineup`. Popup abre imediatamente; simulação anterior à chegada do lineup usa os rates atuais (sem mods).

### 4. Cálculo de attackRate / defenseRate por time
Quando o lineup chega:
- Identifica starters fazendo lookup `pitchIds.values()` em `homePlayers` por `master_player_id`. Fallback para os 11 primeiros se vazio.
- `baseEffective = effectiveMatchRate(team.rate, starters)` (já existente).
- Modificadores aplicados em cima:
  - **Estilo:** Posse → atk×1.00, def×1.05 · Ligação Direta → atk×1.05, def×0.97 · Contra-ataque → atk×0.97, def×1.08
  - **Pressão:** Alta → atk×1.05, def×0.95 · Média → 1/1 · Baixa → atk×0.97, def×1.05
  - **Bola Aérea:** sem efeito agora (sem hook em `simulation.ts` — fica registrado em comentário).
- Resultado: `homeAttackRate`, `homeDefenseRate`, idem away.

### 5. Encaixe na `simulateHalf`
A assinatura atual é `simulateHalf(homeRate, awayRate, isET, momentum, homeAttackMod, awayAttackMod)`. Não dá pra passar atk/def separados sem refatorar. Estratégia minimamente invasiva:
- `homeRate` passado = `homeEffective × (1 + homeMoral)` (moral aqui).
- `homeAttackMod` final = `styleAttackMod_home × pressureAttackMod_home × (defesaInversa_away) × urgencyMod_home`
  - onde `defesaInversa_away = 1 / (styleDefenseMod_away × pressureDefenseMod_away)` (defesa boa do adversário reduz seu xG).
- Idem espelhado para o away.

### 6. Modificador de urgência (mata-mata 2ª perna)
Usar `getSecondLegModifiers` já exportado em `simulation.ts`:
- Calcular `aggregateDeficit` para cada time considerando `pairLeg1` + placar parcial atual.
- Time perdendo recebe `attackMod` aumentado; time ganhando recebe `attackMod` reduzido (`1/attackModDoOutro`) ou usar o `defenseMod` retornado.
- Aplicado **antes** de chamar `simulateHalf`, multiplicando no `attackMod` final do passo 5.
- Para partidas que não são 2ª perna mata-mata: nada (`1.0`).

### 7. Onde aplicar
- `handleSimulate` (simulação por tempo)
- `handleLiveSimulate` (minuto a minuto) — usa `simulateHalf` 2x
- `ensureStats` (cálculo de xG via `getExpectedGoals`) — passar mesmos atackMods

### 8. Não-objetivos
- Não tocar em `simulation.ts`.
- Não calcular moral.
- Não exibir UI dos novos campos.
- Não alterar persistência do match.

### Pontos abertos
- **Defesa inversa** é uma aproximação — se você quiser separação real atk/def precisaria refatorar `getExpectedGoals` pra aceitar `defenderRate` separado do `opponentRate`. Confirma se a aproximação serve.
- **Bola Aérea** fica sem efeito até `simulation.ts` ganhar hook (cartões de cabeçada, gols de bola parada).