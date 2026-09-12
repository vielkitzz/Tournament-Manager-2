# Conclusão do Bloco B — rivalidades, clássicos e foto de partida

## Objetivo

Concluir o sistema de clássicos já iniciado, fazendo o nível da rivalidade afetar faltas e cartões em todas as simulações, identificar esses jogos visualmente e permitir fotografar uma partida específica.

## Entrega

- Manter a página **Rivalidades** já adicionada, com criação, edição e exclusão de pares de times e nível de 1 a 5.
- Propagar o nível do clássico para simulações por rodada, mata-mata e simulação dentro da partida.
- Aplicar o aumento somente a faltas e cartões; gols, força e resultado continuam sem alteração.
- Exibir uma chama nos confrontos identificados como clássico e no painel da partida.
- Adicionar câmera ao painel da partida, com imagem dedicada contendo escudos, nomes/siglas, placar, gols, cartões e identificação do clássico.
- Reutilizar as configurações existentes do modo foto e acrescentar um enquadramento próprio para partidas.
- Validar criação/edição/exclusão, simulações normais versus clássicos, captura em celular/computador e ausência de regressões.

## Detalhes técnicos

- Usar a lista `rivalries` da store e `getRivalryLevel` para resolver o par sem depender da ordem casa/fora.
- Passar o nível opcional para `generateMatchStats` em `RoundsView`, `BracketView` e `MatchPopup`.
- Criar uma área de captura isolada no `MatchPopup`, marcada para o pipeline existente de screenshot.
- Adicionar `match` aos presets de `photoMode` e cobrir o preset com teste.
- Não incluir o calendário global nesta entrega; ele permanece para a próxima etapa do Bloco B.
