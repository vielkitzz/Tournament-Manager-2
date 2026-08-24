# Modo Foto: correção de responsividade e zoom

Patch dividido em 3 atualizações pequenas para não consumir créditos de uma vez. A 1 resolve a maior parte das queixas.

## Diagnóstico (verificado no código)

Em `src/lib/screenshotUtils.ts`:

1. **O zoom funciona ao contrário.** O conteúdo é montado sempre com `min-width` igual à largura escolhida (900/1100/1400 px) e depois o bloco inteiro recebe `transform: scale(zoom)`. Como largura da imagem e tamanho do texto crescem juntos, a proporção texto/imagem não muda — e ainda por cima o orçamento de pixels (`maxPixels`) reduz a imagem final quanto maior o zoom. Resultado: aumentar o zoom deixa o print mais pesado e o texto proporcionalmente igual ou menor no celular.
2. **Modo rodadas fica largo com texto pequeno.** As rodadas usam `min-width: 1100px`, mas as linhas de jogo são estreitas: sobra fundo vazio nas laterais e o conteúdo útil ocupa uma fração da imagem.
3. **Padding cresce com o zoom** (`padding * scale`), somando ainda mais moldura vazia.
4. **Piso de fonte fixo em 12px** é aplicado antes do transform, então em telas com muitas colunas ainda sai texto minúsculo em relação à largura total.

## Atualização 1 — Zoom correto e enquadramento (prioritária)

- Inverter a matemática do zoom: o conteúdo passa a ser montado em `largura / zoom` e depois escalado, de modo que a imagem final mantenha a largura alvo e o texto realmente aumente. Zoom máximo = conteúdo mais "perto".
- Largura de montagem deixa de ser fixa: usa `max-content` limitado pela largura alvo, eliminando faixas vazias no modo rodadas e em tabelas estreitas.
- Padding deixa de multiplicar pelo zoom (moldura constante e enxuta).
- Orçamento de pixels aplicado só como teto de nitidez, sem reduzir a leitura (mínimo de densidade garantido).
- Piso de fonte passa a ser relativo à largura final da imagem, não fixo em 12px.

## Atualização 2 — Presets por modo e prévia fiel

- Perfis automáticos de largura por tipo de conteúdo (tabela, rodadas, chaveamento, sala de troféus): cada modo tem largura ideal e zoom base, com o controle manual continuando disponível.
- A prévia em Configurações do torneio passa a usar exatamente a mesma matemática do capturador (hoje ela aproxima com uma fórmula própria), incluindo a simulação mobile.

## Atualização 3 — Varredura e testes por dispositivo

- Teste automatizado com navegador em viewports iPhone/Android/tablet/desktop, capturando tabela, rodadas, chaveamento e sala de troféus em cada uma, comparando: nada cortado, sem faixa branca, escudos presentes, tamanho de fonte mínimo legível.
- Correções pontuais que aparecerem na varredura (recortes, sobras, elementos de UI indevidos).

## Detalhes técnicos

Arquivos afetados: `src/lib/screenshotUtils.ts` (montagem/medição/escala), `src/lib/photoMode.ts` (presets por modo), `src/components/tournament/PhotoModeSettingsCard.tsx` (prévia), e o prop de modo nos botões de câmera (`ScreenshotButton`) na atualização 2. Nenhuma mudança de dados ou backend.
