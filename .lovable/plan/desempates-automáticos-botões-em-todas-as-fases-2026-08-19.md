# Desempates automáticos + botões em todas as fases

## O que muda

### 1. Toggle Manual / Automático
Novo ajuste em "Editar Sistemas" → bloco "Regras Gerais", junto do seletor de método de desempate:

- **Automático (padrão)**: ao simular um confronto que termina empatado, o desempate é resolvido na hora, sem cliques — conforme o método escolhido:
  - Pênaltis / Prorrogação+pênaltis / Gol de ouro: comportamento antigo, pênaltis disparam sozinhos.
  - Jogos extras (replay): o app cria e simula o jogo extra automaticamente, repetindo até o limite configurado; se o empate persistir e o sorteio estiver permitido, decide no cara ou coroa e registra "* decidido no sorteio".
- **Manual**: nada é gerado sozinho; permanecem os botões "+ Jogo extra", "Simular extra" e "Sorteio" na gaveta do card, como hoje.

### 2. Botões em todas as fases
Hoje a gaveta de desempate (agregado, jogos extras, sorteio) só aparece nos confrontos normais do chaveamento. Passa a aparecer também em:

- Disputa de 3º lugar
- Final
- Fases preliminares (a página de preliminares já reutiliza o mesmo componente de chaveamento, então herda a correção)

## Detalhes técnicos

- `src/types/tournament.ts`: novo campo `autoTiebreak?: boolean` em `TournamentSettings` (default `true` em `DEFAULT_SETTINGS`).
- `src/pages/TournamentSettingsPage.tsx`: `SettingToggle` "Resolver desempates automaticamente" dentro do card "Regras Gerais", logo abaixo do seletor de método, com descrição curta do que muda.
- `src/lib/tieBreaker.ts`: nova função `autoResolveTie(pair, settings, simulate)` que encapsula o loop — cria replay, simula, checa `resolveTie`, repete até `maxReplaysOf`, e cai no `coinTossWinner` quando `allowCoinToss` estiver ligado. Retorna a lista de partidas novas/atualizadas para gravar em lote.
- `src/components/tournament/BracketView.tsx`:
  - Após simular ida/volta ou jogo único (fluxos de simulação existentes, incluindo "simular fase"), quando `autoTiebreak` e o resultado exigir desempate, chamar `autoResolveTie` e persistir via `onBatchUpdateMatches`.
  - Manter a supressão de pênaltis automáticos no modo replay apenas no modo manual; no automático a cadeia completa é executada.
  - Extrair `renderTieDrawer` para ser usada também em `renderThirdPlaceMatch` (montando um `TiePair` de perna única com os replays daquele confronto).
- Sem mudança de banco de dados; tudo grava nos campos de partida já existentes (`isReplay`, `replayIndex`, `coinTossWinnerId`).
