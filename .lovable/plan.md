# Roteiro: correção do modo foto + 3 atualizações

## Correção antes de publicar — caixa do campeão no modo foto

Hoje, na captura do chaveamento, as colunas de fase, os cards de confronto e os conectores acompanham o valor de "Tamanho das informações" (scale), mas a coluna do campeão continua com largura fixa (220px). Com scale alto a fonte cresce e a caixa não, então o nome do campeão quebra letra a letra na vertical (como na imagem).

O que muda:
- Marcar a coluna/caixa do campeão com um atributo próprio de layout de foto.
- Na captura, aplicar a mesma multiplicação por `scale` na largura dessa caixa (e nas linhas de 2º/3º lugar), com largura mínima suficiente para o nome do clube.
- Garantir que o nome use quebra por palavra (não por caractere) e ganhe uma linha extra em vez de espremer.
- Nada muda fora da captura: a tela normal do chaveamento segue igual.

## Atualização 1 — Sala de troféus

- Botão de câmera (modo foto) na galeria de campeões, usando as mesmas preferências de Modo Foto da competição (paleta, escala, alto contraste, cabeçalho com nome do torneio).
- Restilização da sala: cards de temporada maiores e mais legíveis, faixa de destaque para o maior vencedor, escudos com tamanho consistente e ranking de títulos mais visual.
- Suporte a mais de um campeão por ano (títulos compartilhados): a estrutura da temporada passa a aceitar uma lista de campeões; o card cresce em altura em vez de espremer o conteúdo, e a contagem de títulos credita cada clube listado.
- Edição/adição na sala permite incluir ou remover campeões adicionais de um mesmo ano.

## Atualização 2 — Cores dos clubes com utilidade visual

- Liga/pontos corridos: 1º, 2º e 3º colocados recebem realce com as cores do próprio clube (faixa lateral ou fundo suave derivado da cor primária do time), com verificação automática de contraste para não prejudicar leitura em nenhum tema nem no modo foto.
- Mata-mata: a caixa do campeão passa a usar as cores do clube (fundo em degradê da cor primária + detalhe na secundária), mantendo o texto sempre legível.
- Sala de troféus: mesma lógica de cor aplicada aos cards de campeão.
- Interruptor nas configurações da competição para ligar/desligar o uso das cores dos clubes, caso o usuário prefira o visual neutro atual.

## Atualização 3 — Jogos extras e decisões alternativas

Novas opções de desempate no mata-mata, nas configurações da competição:
- Modo de decisão: pênaltis (atual), jogo extra (replay/desempate) ou cara ou coroa.
- Jogo extra: quando o empate persistir, o sistema cria uma partida de desempate ligada ao confronto, com número máximo de repetições configurável (ex.: até 2 ou 3 replays).
- Se o limite de jogos extras for atingido e o empate continuar, aplica-se o critério final escolhido: cara ou coroa (sorteio explícito, com registro do resultado) ou pênaltis.
- Os jogos extras entram no chaveamento e nas rodadas como partidas normais (contam para estatísticas e para as notas), sem quebrar o avanço de fases nem os snapshots de temporada.

## Detalhes técnicos

- Modo foto: ajuste em `src/lib/screenshotUtils.ts` (regras `data-photo-*` multiplicadas por `scale`) e novo atributo na caixa do campeão em `BracketView.tsx`.
- Sala de troféus: `GalleryView.tsx` / `TournamentGalleryPage.tsx`, com `ScreenshotButton` e `data-photo-layout="gallery"`; `SeasonRecord` ganha campo opcional de campeões adicionais, mantendo compatibilidade com os registros existentes.
- Cores: helper de contraste reaproveitado do modo foto, aplicado em `StandingsTable`, `GroupStandingsView`, `BracketView` e galeria; flag em `TournamentSettings`.
- Decisões: novos campos em `TournamentSettings` (`decisionMode`, `maxReplays`) e tratamento no avanço de fase (`BracketView` + utilitários de mata-mata), com o resultado do sorteio persistido na partida.

## Ordem sugerida

1. Correção da caixa do campeão (publicar).
2. Atualização 1, depois 2, depois 3 — cada uma como release estável separada.
