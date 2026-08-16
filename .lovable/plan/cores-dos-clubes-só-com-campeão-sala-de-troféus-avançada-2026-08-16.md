# Cores dos clubes só com campeão + Sala de Troféus avançada

## 1. Cores aparecem sem campeão (liga e grupos)

Hoje o destaque de pódio é aplicado assim que a tabela existe, mesmo com a competição em andamento. Vai passar a depender do campeonato estar finalizado com campeão confirmado.

- `StandingsTable` e `GroupStandingsView` recebem uma flag `showPodiumColors` que só é verdadeira quando a competição está finalizada (ou quando se está vendo uma temporada passada já registrada) e existe campeão.
- Em `TournamentDetailPage`, essa flag combina `settings.useTeamColors !== false` com `tournament.finalized` / `seasonData` (mesma fonte já usada para o `championRecord`).
- No mata-mata, a caixa do campeão já só aparece quando há campeão definido — mantém o comportamento, apenas alinha a intensidade.

## 2. Gradiente mais presente, sem exagero

Em `src/lib/teamColors.ts`:
- Pódio: aumentar a presença da cor (1º ~0.30, 2º ~0.22, 3º ~0.15 de opacidade), com barra lateral um pouco mais grossa e o degradê indo até ~85% da linha antes de se dissolver, mantendo o texto do tema legível.
- Caixa do campeão: degradê de duas cores do clube mais saturado, porém com uma camada de suavização para não virar bloco chapado; texto continua com contraste automático.

## 3. Sala de Troféus: modo foto + edição avançada

`GalleryView` ganha:

**Modo foto**
- Botão de câmera nas duas abas (Títulos por Ano e Maiores Campeões), usando o mesmo `ScreenshotButton` das demais telas.
- Cada aba com um contêiner próprio de captura, marcado com os atributos de modo foto (`data-photo-layout="gallery"`), incluindo cabeçalho com nome da competição, para que a escala e o contraste do Modo Foto já existentes se apliquem.
- Botões de editar/excluir marcados como `data-photo-control` para sumirem na captura.

**Campeões compartilhados (2+ por ano)**
- O registro de temporada passa a aceitar campeões adicionais (lista opcional `coChampions` com id/nome/escudo), sem alterar o campo de campeão principal já existente — snapshots antigos continuam válidos.
- No formulário: botão "Adicionar co-campeão", permitindo escolher outro clube para o mesmo ano.
- A linha do ano exibe os campeões lado a lado, com o card dividido em faixas de cor de cada clube, sem quebrar o layout (empilha em telas estreitas).
- Em Maiores Campeões, cada co-campeão soma um título.

**Versões históricas retroativas**
- Ao renderizar um ano, o escudo/nome/cores vêm de `resolveTeamForYear` (helper já existente) usando o ano da temporada, e não do estado atual do clube.
- Interruptor na Sala de Troféus: "Usar versões históricas dos clubes" (ligado por padrão), permitindo voltar à identidade atual.
- O nome personalizado gravado no registro continua tendo prioridade sobre o resolvido.

## Detalhes técnicos

- `src/types/tournament.ts`: `SeasonRecord.coChampions?: { id: string; name: string; logo?: string }[]`.
- `src/lib/teamColors.ts`: ajuste de intensidades em `podiumRowStyle` e `championBoxStyle`; nova `splitChampionStyle` para cards com dois clubes.
- `src/components/tournament/StandingsTable.tsx`, `GroupStandingsView.tsx`: prop de gate do pódio.
- `src/pages/TournamentDetailPage.tsx`: cálculo do gate e repasse.
- `src/components/tournament/GalleryView.tsx`: refs de captura, botões de screenshot, co-campeões, resolução histórica via `src/lib/teamHistoryUtils.ts`.
- `src/pages/TournamentGalleryPage.tsx`: passa o nome/ano da competição e o histórico dos clubes ao `GalleryView`.
- Nada muda em simulação, dados de partidas ou nas configurações do Modo Foto.
