# Modo Foto — Atualização 3: enquadramento justo + varredura

Foco: acabar com o espaço vazio (principalmente no modo rodadas), centralizar o conteúdo e validar em vários dispositivos. Plano de contingência incluído para o caso de algum ajuste piorar o resultado.

## O que foi verificado no código

Em `src/lib/screenshotUtils.ts`:

- O clone é montado com `width: max-content` dentro de um iframe de largura fixa (`photo.width / zoom`). As linhas de jogo do modo rodadas são botões `w-full`, então elas se esticam até a largura do bloco em vez de encolher para o tamanho do conteúdo.
- Dentro de cada linha (`src/components/tournament/RoundsView.tsx`), os dois lados usam `flex-1`, o que empurra os nomes para o centro e deixa faixas vazias à esquerda e à direita quando a linha é larga.
- A medição final (`measure()`) usa a borda mais à direita de **qualquer** descendente — inclusive divisórias (`flex-1 h-px`) e a barra do cabeçalho, que se esticam por toda a largura. Isso fixa a imagem na largura máxima mesmo quando o conteúdo útil é estreito.
- O cabeçalho de título e a navegação de rodada ("Rodada 1 / 15") também esticam a caixa, contribuindo para o recuo percebido.

## Atualização 3 — o que muda

1. **Enquadramento justo (trim automático)**
   - Medir a largura útil considerando só os elementos com conteúdo visível (texto, imagens, caixas com fundo), ignorando divisórias/linhas de 1px e elementos que apenas esticam.
   - Cortar a moldura para essa largura útil, com a margem constante do padding, eliminando as faixas vazias laterais.

2. **Modo rodadas compacto**
   - Durante a captura, neutralizar o `flex-1` das laterais das linhas de jogo: nome + escudo passam a ficar colados ao placar, com o conjunto centralizado no card.
   - As linhas deixam de ocupar largura total artificial: largura da imagem passa a ser a da linha mais larga (nome mais comprido), com o bloco centralizado.

3. **Centralização do conteúdo**
   - Blocos mais estreitos que a imagem (navegação de rodada, cabeçalho de grupo, tabela) ficam centralizados no quadro, sem recuo à esquerda.

4. **Varredura por dispositivo**
   - Teste automatizado com navegador em viewports iPhone (Safari-like), Android, tablet e desktop, capturando tabela, rodadas, chaveamento, estatísticas e sala de troféus.
   - Critérios: nada cortado, sem faixa vazia maior que a margem, escudos presentes, fonte mínima legível, sem elementos de UI (câmera, lixeira) na imagem.
   - Correções pontuais dos defeitos encontrados na varredura.

## Plano de contingência

- Cada mudança fica atrás de valores conservadores: se o trim automático medir uma largura inválida (muito pequena ou zero), o capturador volta ao comportamento atual de largura cheia, sem quebrar a imagem.
- O ajuste do modo rodadas é aplicado só ao conteúdo marcado como rodadas, sem tocar em chaveamento, tabela e sala de troféus.
- Se a varredura mostrar regressão em algum modo, o preset daquele modo é revertido individualmente em `PHOTO_PRESETS`, sem desfazer o restante.
- Nenhuma mudança de dados, backend ou de layout do app fora do modo foto.

## Detalhes técnicos

Arquivos afetados: `src/lib/screenshotUtils.ts` (medição útil, trim, regras CSS de captura por `data-photo-layout`), `src/components/tournament/RoundsView.tsx` (marcação `data-photo-layout="rounds"` nas linhas, sem mudar a UI do app), e ajustes finos em `src/lib/photoMode.ts` se a varredura indicar largura/zoom base diferente por modo.
