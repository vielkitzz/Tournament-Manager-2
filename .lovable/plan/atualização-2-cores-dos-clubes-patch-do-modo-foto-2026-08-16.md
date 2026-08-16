# Atualização 2 (cores dos clubes) + patch do modo foto

## Parte A — Patch do modo foto (zoom que realmente funciona)

Hoje a captura aplica o zoom mudando só o tamanho da fonte-raiz (rem). Boa parte da tabela, das rodadas e do chaveamento usa medidas fixas em pixel (`text-[10px]`, `w-[220px]`, `min-w-[100px]`, alturas de escudo), então esses trechos **não crescem** — por isso muitas vezes "o zoom não acontece". Além disso o quadro da imagem é forçado a ter no mínimo a largura configurada (1100px por padrão): quando o conteúdo é menor, sobra fundo vazio e tudo parece pequeno e distante mesmo no zoom máximo.

O que muda:
- O zoom passa a escalar o conteúdo inteiro (fontes, escudos, caixas, espaçamentos), não só o texto em rem. Assim nada quebra de proporção: as caixas crescem junto.
- O quadro da foto passa a se ajustar ao conteúdo já ampliado, em vez de ficar preso a uma largura mínima. Some a borda enorme de fundo vazio; a informação ocupa a imagem.
- Chaveamento: colunas, cards e conectores continuam com largura proporcional ao zoom, agora coerente com o resto (sem colunas espremidas nem vãos gigantes).
- Rodadas: as colunas de placar e nomes deixam de usar larguras travadas na captura, para acompanharem o zoom sem cortar nome de clube.
- Trava de segurança: limite de largura/altura final para o PNG continuar leve o suficiente para o Discord, reduzindo a resolução em vez de encolher a leitura.
- Revisão rápida em tabela, rodadas e chaveamento com zoom mínimo, médio e máximo, verificando escudos, siglas, placares e caixa do campeão.

## Parte B — Cores dos clubes com utilidade real

- **Liga / pontos corridos e grupos**: 1º, 2º e 3º colocados ganham realce com as cores do próprio clube — faixa lateral na cor primária do time e fundo suave derivado dela. Contraste verificado automaticamente: se a cor do clube prejudicar a leitura, o texto e o fundo são ajustados (vale para tema claro, escuro e modo foto).
- **Mata-mata**: a caixa do campeão passa a usar as cores do clube (degradê da cor primária com detalhe na secundária), com o nome sempre legível.
- **Sala de troféus**: os cards de campeão usam a mesma lógica de cor.
- **Interruptor** em *Editar Sistemas* da competição para ligar/desligar as cores dos clubes, mantendo o visual neutro atual para quem preferir. Padrão: ligado.

## Detalhes técnicos

- `src/lib/screenshotUtils.ts`: substituir o zoom por font-size por uma transformação de escala aplicada ao clone (`transform: scale(scale)` com `transform-origin: top left` e dimensões do container recalculadas a partir de `scrollWidth/Height * scale`), removendo `min-width: ${width}px` de `html/body/#capture-root`; `photo.width` passa a ser apenas largura de layout base do frame (viewport de renderização), não da imagem final. Regras `data-photo-*` do chaveamento voltam a usar as larguras base (sem multiplicar por scale, já que a escala global cobre isso). Recalcular `pixelRatio` sobre as dimensões já escaladas para respeitar `maxPixels`.
- Helper de cor: novo `src/lib/teamColors.ts` com leitura das cores resolvidas por ano (`teamHistoryUtils`), cálculo de luminância/contraste (reaproveitando a lógica de `readableOn`) e geração de estilos (`accentBar`, `softBackground`, `onColorText`).
- Aplicação: `StandingsTable.tsx`, `GroupStandingsView.tsx` (top 3), `BracketView.tsx` (caixa do campeão), `GalleryView.tsx` (cards).
- Flag `useTeamColors?: boolean` em `settings` (`src/types/tournament.ts`), controle em `TournamentSettingsPage.tsx`.
- Sem mudanças em simulação, dados de torneio ou no fluxo prévia/copiar/baixar.

## Ordem

1. Patch do modo foto (zoom) e verificação nas três telas.
2. Cores dos clubes + interruptor nas configurações.
