# Cores multicoloridas + Modo foto: vice, placar da final e pontos da campanha

## 1. Gradientes com 3+ cores

Hoje o sistema usa só as duas primeiras cores do clube (`teamPalette` devolve `primary`/`secondary`). Tricolores e quadricolores perdem identidade.

- `teamPalette` passa a devolver a lista completa (até 5 cores normalizadas), mantendo `primary`/`secondary` por compatibilidade.
- Novo gerador de paradas de gradiente distribui todas as cores igualmente (ex.: 3 cores = 0% / 50% / 100%).
- `podiumRowStyle`: faixa lateral com as duas primeiras cores e fundo em degradê com todas as cores, respeitando as intensidades atuais (1º 0,30 / 2º 0,22 / 3º 0,15) para não ficar forte demais.
- `championBoxStyle`: degradê diagonal com todas as cores; a cor do texto passa a ser calculada pela luminância média das cores dominantes (não só a primeira), garantindo contraste em times com cor clara + escura.
- `splitChampionStyle` (títulos compartilhados): cada clube recebe uma fatia do card e, dentro da fatia, todas as suas cores.

Nada muda para times com 1 ou 2 cores.

## 2. Modo foto: novas informações

Adicionadas à Sala de Troféus (aba "Títulos por Ano") e à caixa de campeão do Chaveamento, sempre como linhas/chips próprios para não espremer o nome do clube.

- **Vice-campeão do ano** (com co-vices quando o título/vice for compartilhado): escudo + nome, em linha secundária abaixo do campeão.
- **Placar da final** (mata-mata): exibido como chip, incluindo agregado de ida/volta, prorrogação e pênaltis quando existirem (ex.: `2 x 1`, `3 x 3 (5-4 pên.)`).
- **Pontos totais da campanha** (liga / grupos): chip com os pontos do campeão na temporada (ex.: `84 pts`).

Origem dos dados: derivados da própria temporada já salva (`season.matches` para a final, `season.standings` para pontos e vice), sem migração de dados. Entradas manuais da Sala de Troféus ganham campos opcionais para vice, co-vice e placar/pontos, usados quando não há partidas registradas.

## 3. Encaixe sem quebrar o layout

- Cada informação nova é uma linha/chip independente com quebra por palavra, nunca concatenada ao nome do clube.
- Chips usam tipografia menor porém acima do mínimo legível já aplicado na captura, e herdam as cores de contraste do card (`subtleText` / `accent`).
- A caixa do campeão no chaveamento continua com largura escalável pelo zoom do Modo Foto; as linhas novas crescem em altura, não em largura.
- Quando um dado não existir (sem final, sem pontos, sem vice), a linha simplesmente não é renderizada.

## Arquivos afetados

- `src/lib/teamColors.ts` — paleta multicolorida, contraste por luminância média.
- `src/lib/seasonSnapshot.ts` (helpers de leitura) — funções para extrair vice, placar da final e pontos do campeão.
- `src/components/tournament/GalleryView.tsx` — novas linhas/chips e campos manuais (vice/co-vice).
- `src/components/tournament/BracketView.tsx` — chip do placar da final na caixa do campeão.
- `src/components/tournament/StandingsTable.tsx` e `GroupStandingsView.tsx` — apenas o novo degradê multicolorido.
- `src/types/tournament.ts` — campos opcionais em `SeasonRecord` (`runnerUp`, `coRunnerUps`, `finalScore`, `championPoints`).
