# Bloco B — Rivalidades e Clássicos (+ foto de partida)

Entrego agora a parte de rivalidades do Bloco B e, junto, a foto de uma partida. O calendário global de temporadas (a outra metade do Bloco B) fica para a entrega seguinte, para não misturar duas mudanças grandes na mesma rodada de testes.

## 1. Criar e gerenciar clássicos

- Nova página **Rivalidades**, acessível pelo menu lateral junto de Clubes.
- Botão **Criar clássico**: escolher Time A, Time B, um nível de 1/5 a 5/5 e um nome opcional (ex.: "Clássico dos Milhões").
- Lista de clássicos com nome, os dois escudos, o nível, e ações de editar e excluir.
- Não permite o mesmo par duas vezes nem um time contra ele mesmo.

## 2. Efeito na partida

- Quando os dois times de um jogo formam um clássico, a partida gera mais faltas e mais cartões conforme o nível: nível 1 quase igual ao normal, nível 5 bem mais faltoso.
- Força dos times, gols e resultado não mudam — só o clima do jogo.
- Vale em qualquer simulação: rodada, mata-mata, amistoso e simulação minuto a minuto.

## 3. Foguinho de clássico

- Jogos que são clássicos ganham um foguinho discreto no canto: na lista de jogos, na janela do jogo e nas fotos.

## 4. Foto de uma partida

- Botão de câmera dentro da janela do jogo, gerando uma imagem só daquele confronto: escudos, siglas, nomes, placar, gols com minuto e autor, cartões e o foguinho quando for clássico.
- Usa as mesmas configurações de foto já existentes (cores, fundo, ícone do torneio, qualidade) e abre a mesma prévia com copiar/baixar.

## Aceite

- Um clássico 5/5 mostra claramente mais cartões que o mesmo confronto sem rivalidade; o placar continua coerente.
- Excluir um clube remove os clássicos dele sem quebrar nada.
- A imagem da partida sai legível no celular e no computador.

## Detalhes técnicos

- Migração: `public.rivalries` (`id`, `user_id text`, `team_a_id text`, `team_b_id text`, `level int check 1..5`, `name text`, `created_at`), índice único no par normalizado (menor id primeiro), GRANTs para `authenticated`/`service_role` e RLS `auth.uid()::text = user_id`.
- Store: `rivalries` no `tournamentStore.ts` com load/add/update/delete e helper `getRivalryLevel(teamA, teamB)`.
- Simulação: parâmetro opcional `rivalryLevel` em `simulateFullMatch` e em `generateCardsAndFouls`/`generateMinuteByMinuteEvents`, multiplicando taxas de falta e cartão por `1 + 0,18 × nível`. Chamadas em `RoundsView.tsx`, `BracketView.tsx`, `MatchPopup.tsx` e `FriendlyMatchPage.tsx` passam o nível resolvido.
- UI: `src/pages/RivalriesPage.tsx` + rota em `App.tsx` + item no `AppSidebar.tsx`; badge de foguinho reutilizável com atributo `data-photo-rivalry` lido pelo `screenshotUtils.ts`.
- Foto de partida: novo layout `match` em `PhotoLayoutKind`/`PHOTO_PRESETS` (`photoMode.ts`), card dedicado renderizado dentro do `MatchPopup.tsx` e `ScreenshotButton mode="match"`; teste de preset em `src/test/photoMode.test.ts`.
