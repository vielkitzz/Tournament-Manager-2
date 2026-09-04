# Correção: disputa de 3º lugar cria vários jogos em vez de abrir a gaveta de desempate

## Causa confirmada (lida no código)

Em `src/components/tournament/BracketView.tsx`:

- `handleSimulateThirdPlace` (linha ~469) chama `withAutoTiebreaks(updated, thirdPlaceMatches, lineupMap)`.
- `withAutoTiebreaks` (linha ~418) roda `autoResolveTie` (de `src/lib/tieBreaker.ts`) sobre **todos** os pares do escopo — incluindo o jogo de 3º lugar (`isThirdPlace`).
- Quando o 3º lugar termina empatado, `autoResolveTie` cria e simula jogos extras em loop até o limite (`maxReplays`) e ainda pode aplicar sorteio — tudo automaticamente, sem abrir a gaveta de desempate (`renderTieDrawer`, controlada por `setOpenReplays`), que já existe para o 3º lugar (linha ~1026).

Resultado: vários jogos extras criados de uma vez na disputa de terceiro lugar.

## Correção (cirúrgica, só em `BracketView.tsx`)

1. **`withAutoTiebreaks`**: ignorar pares cujo `leg1.isThirdPlace` — o desempate automático nunca cria replays/sorteio para a disputa de 3º lugar.
2. **`handleSimulateThirdPlace`**: após simular, verificar com `resolveTie` se o confronto ficou empatado (`needsTiebreak`). Se sim:
   - abrir a gaveta de desempate: `setOpenReplays((prev) => ({ ...prev, [thirdPair.leg1.id]: true }))`;
   - exibir toast informando que o jogo empatou e a decisão está disponível na gaveta (jogo extra ou sorteio).
3. Manter o comportamento automático inalterado para todas as demais fases do mata-mata.

## Validação

- `bunx tsgo --noEmit -p tsconfig.app.json`
- Teste manual no preview: torneio mata-mata com `thirdPlaceMatch` ativo, simular o 3º lugar forçando empate (ou repetindo simulações), conferir que nenhum jogo extra é criado automaticamente e que a gaveta abre.
