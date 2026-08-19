# Correção do Modo Foto + Jogos Extras (Replays) e Desempates

## 1. Modo foto cortado (correção)

Na captura da Sala de Troféus (e demais telas largas) o conteúdo está sendo cortado à direita: a moldura interna é montada com largura fixa (`min-width` do preset) e o grid responsivo continua expandindo além dela, então parte das colunas fica fora da área rasterizada.

O que muda em `src/lib/screenshotUtils.ts`:
- Medir a largura real do conteúdo depois do layout assentar e usar `max(largura do preset, largura real)` como largura da moldura, em vez de fixar no preset.
- Fazer o mesmo para a altura, com uma segunda medição após o ajuste de fontes (hoje só há uma passada, o que arredonda para menos em listas longas).
- Forçar grids responsivos dentro da captura a um número de colunas estável (evita meia-coluna cortada), e impedir qualquer elemento de estourar a moldura (`max-width` interno).
- Recalcular o orçamento de pixels depois da medição final, para que ampliar a moldura não devolva um PNG borrado.

Resultado esperado: nenhum corte lateral ou inferior, em qualquer dispositivo (Android/iOS, Safari/Chrome), em Tabela, Rodadas, Chaveamento e Sala de Troféus.

## 2. Placar agregado em confrontos de ida e volta

- No card do confronto (Chaveamento) passa a aparecer uma linha “Agregado X x Y” quando o confronto tem duas partidas jogadas, com destaque para o classificado.
- Quando houver critério extra (gols fora, prorrogação, pênaltis, jogo extra), o rótulo indica qual decidiu: “Agregado 2 x 2 — vence nos pênaltis (4-3)”.
- A mesma linha agregada aparece no popup da partida e na exportação de resultados, com a mesma redação, para leitura consistente.

## 3. Jogos extras / replays e desempates históricos

Novo modo de desempate configurável por competição, em “Editar Sistema”:

- **Método de desempate**: Pênaltis (atual) | Prorrogação e pênaltis | **Jogos extras (replay)** | Gol de ouro.
- **Limite de replays**: 1, 2, 3, 4 ou personalizado. Ao atingir o limite, o desempate final é por **cara ou coroa** (sorteio), com uma pergunta ao usuário: “Empate persiste — jogar mais um jogo extra ou decidir no sorteio?”. O usuário nunca fica preso: sempre há a opção de encerrar no sorteio, e ao atingir o limite o sorteio é automático.
- Cada replay é gravado como uma partida do mesmo confronto (mesmo `pairId`), marcada como jogo extra, e não entra na contagem de rodadas nem duplica caixas no chaveamento.
- O sorteio fica registrado no confronto (“decidido no sorteio”) e aparece no card, no popup e na exportação.

### Gaveta de jogos extras no card

Abaixo do card da partida (mesma área onde hoje aparecem “AET / Pên”) surge uma gaveta recolhível:
- **Minimizada**: mostra o placar do jogo que definiu o vencedor, com o selo “* jogo extra” (ou “* sorteio”).
- **Expandida**: lista todos os replays na ordem (Jogo extra 1, Jogo extra 2, …) com placar, prorrogação e pênaltis de cada um, e o resultado final.
- A gaveta não altera a largura das colunas do chaveamento e é capturada corretamente no modo foto (sempre expandida na imagem, para não esconder informação).

## Detalhes técnicos

- Tipos (`src/types/tournament.ts`): `Match.isReplay?: boolean`, `Match.replayIndex?: number`, `Match.decidedByCoinToss?: boolean`, `Match.coinTossWinnerId?: string`; em `TournamentSettings`: `knockoutTiebreakMode`, `maxReplays`, `allowCoinToss`.
- Resolução do confronto centralizada num helper (`resolveTie`) usado por `BracketView`, `PreliminaryPhasesPage`, `MatchPopup` e `exportResults`, para que agregado, replays e sorteio tenham uma única fonte de verdade.
- Simulação automática respeita o modo escolhido: gera replays até o limite e então aplica o sorteio.
- Captura: gaveta marcada com `data-photo-expand="true"` para ser forçada aberta na imagem; cards de replay usam `data-photo-match` para herdar as regras de contraste já existentes.
