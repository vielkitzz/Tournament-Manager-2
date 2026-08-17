# Suavizar cores dos clubes + correções do Modo Foto

## O problema
Nas capturas enviadas o gradiente do clube toma a caixa inteira e escurece o fundo, deixando o texto (nome do campeão, vice, chips) praticamente invisível. Além disso aparecem informações que não fazem sentido em certos formatos, e a prévia do Modo Foto nas configurações está sem gradiente e vira uma lista infinita.

## 1. Cores legíveis em qualquer combinação
- Trocar o gradiente "cor pura de ponta a ponta" por um **tint suave sobre a superfície do tema**: as cores do clube passam a ter opacidade controlada (forte na borda esquerda, dissolvendo até transparente), preservando o fundo do card.
- O texto deixa de ser preto/branco calculado sobre a média das cores e passa a usar o **foreground do tema**, com verificação de contraste: se em algum ponto o tint reduzir o contraste abaixo de 4.5:1, a intensidade do tint é reduzida automaticamente até voltar ao nível legível.
- Manter a identidade visual: barra lateral sólida com todas as cores do clube (tri/quadricolores continuam representados) + brilho suave ao fundo, sem "faixa preta diagonal".
- Aplicar a mesma regra na caixa de campeão do chaveamento, nas linhas de pódio e nos cards da Sala de Troféus (inclusive títulos compartilhados).

## 2. Pontos totais só onde fazem sentido
- O chip "X pts" só aparece em competições por pontos corridos (liga/suíço). Em grupos+mata-mata e mata-mata puro ele é omitido, porque o campeão é definido na final.
- O placar da final continua aparecendo apenas em formatos com final.

## 3. Regras de destaque colorido
- **Pontos corridos finalizados**: mantém o destaque das 3 primeiras posições na tabela.
- **Grupos + mata-mata**: sem destaque colorido nas tabelas de grupos. O destaque acontece somente no card final (campeão, vice e 3º lugar) do chaveamento.

## 4. Prévia do Modo Foto reestilizada
- Corrigir a ausência de gradiente: a prévia passa a aplicar os mesmos estilos de cores de clube usados na captura real.
- Substituir a lista corrida por uma amostra limitada e organizada: cabeçalho do torneio, bloco de exemplo com poucas linhas/rodadas/confrontos representativos, com altura máxima e recorte visual indicando que é uma amostra.
- Layout em cartão com moldura e proporção do dispositivo escolhido (desktop/mobile), para dar noção real do resultado.

## Detalhes técnicos
- `src/lib/teamColors.ts`: reescrever `podiumRowStyle`, `championBoxStyle` e `splitChampionStyle` para gerar tint com alpha limitado + auto-ajuste por `contrastRatio`; texto herda `hsl(var(--foreground))`.
- `src/pages/TournamentDetailPage.tsx`: `podiumColorsEnabled` passa a exigir formato por pontos corridos finalizado; grupos+mata-mata deixam de propagar `useTeamColors` para `GroupStandingsView`/`StandingsTable`.
- `src/components/tournament/BracketView.tsx`: caixa de campeão mantém as cores (campeão/vice/3º) com o novo estilo suave.
- `src/components/tournament/GalleryView.tsx` + `src/lib/seasonSnapshot.ts`: ocultar `championPoints` quando o formato tiver mata-mata.
- `src/components/tournament/PhotoModeSettingsCard.tsx`: prévia com dados de amostra, gradientes aplicados e contêiner com altura limitada.
