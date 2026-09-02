# Patch: mobile + modo foto + import/export de elencos

## 1. Funções inacessíveis no celular

**Gaveta de anos (temporadas)** — hoje é um `div` absoluto dentro do cabeçalho do torneio, com largura mínima de 220px alinhada à direita. Em telas estreitas ela sai do enquadramento e o campo "Novo ano" fica difícil de alcançar.

- Trocar por um menu em portal (Popover) que no celular abre como painel ancorado à tela, com largura total menos margens e rolagem interna.
- Aumentar as áreas de toque (botão do ano, excluir temporada, adicionar ano) para no mínimo 40px de altura no mobile.
- Fechar ao tocar fora e ao selecionar um ano.

**Varredura de controles do torneio no mobile** — o cabeçalho (nome + ícones de opções + ano + "Nova Temporada") empilha mal em telas pequenas. Reorganizar para duas linhas no mobile: título/identidade em cima, controles em uma barra rolável horizontal abaixo, sem cortar botões.

## 2. Modo foto em celulares

Problemas confirmados no código atual:
- A captura monta um iframe fora da tela e usa html-to-image; em Safari/iOS isso quebra por limite de área de canvas, `devicePixelRatio` alto e imagens/fontes não embutidas.
- O tamanho final da imagem é `ink * zoom`: com zoom maior o conteúdo é medido mais estreito, então a imagem final sai menor — na tela do celular parece que o zoom "diminuiu". É a inversão relatada.
- O card de configuração do modo foto (incluindo a opção de ícone do torneio) usa colunas lado a lado e prévia larga; no celular a coluna direita fica abaixo do fim útil e alguns controles não aparecem.

Correções:
- **Zoom correto**: fixar a largura exportada na largura escolhida sempre que houver zoom, para que aumentar o zoom aumente visivelmente os elementos e diminuir reduza. O recorte por "ink" passa a valer só para remover faixas vazias, nunca para encolher a saída.
- **Compatibilidade iOS/Android**: limitar `pixelRatio` e área total do canvas conforme o dispositivo (teto seguro para Safari), aguardar `document.fonts.ready` e o decode de todas as imagens, converter escudos/logos e background em data URL antes de renderizar, e usar um segundo caminho de captura (renderização direta do nó, sem iframe) como fallback automático se a primeira tentativa falhar ou vier em branco.
- **Sem fundo branco**: aplicar a cor de fundo resolvida no elemento raiz e no canvas final, também no caminho de fallback.
- **Prévia e download no celular**: no diálogo de prévia, garantir que a imagem caiba na tela e que, quando a área de transferência não for suportada (Safari), o app faça download com mensagem clara.
- **Card de ajustes responsivo**: uma coluna no mobile, prévia acima dos controles em bloco recolhível, e a seção de ícone do torneio (torneio / personalizado / nenhum + upload) visível e utilizável em telas pequenas.

## 3. Import/export total de elencos

Concluir o que ficou pendente:
- Opção própria **Elencos** tanto para exportar quanto para importar (botão de importação dedicado que aceita apenas arquivos de elenco), além da inclusão em "Tudo".
- No arquivo exportado, manter nome/abreviação do clube e todos os campos do jogador (nacionalidade, posição, idade, camisa, habilidade, foto, temporada).
- Na importação: casar por nome do clube ignorando acento/caixa, respeitar o limite de 30 jogadores por elenco, evitar números de camisa repetidos e informar em resumo quantos entraram, quantos foram ignorados e quais clubes não foram encontrados.
- Criação de elencos por texto (parser já escrito) exposta na aba de texto do diálogo de geração.

## Detalhes técnicos

- `src/pages/TournamentDetailPage.tsx`: gaveta de anos via Popover em portal + cabeçalho responsivo.
- `src/lib/screenshotUtils.ts`: largura de saída fixa sob zoom, teto de pixels por dispositivo, espera de fontes/imagens, embutir assets, caminho de fallback sem iframe, fundo garantido.
- `src/lib/photoMode.ts`: sem mudança de contrato; apenas clamps usados pelo novo cálculo.
- `src/components/ScreenshotPreviewDialog.tsx`: prévia responsiva e fallback de download.
- `src/components/tournament/PhotoModeSettingsCard.tsx`: layout de coluna única no mobile e seção de ícone acessível.
- `src/components/ImportExportDialog.tsx`, `src/lib/squadBackup.ts`, `src/lib/squadTextParser.ts`: opção dedicada de elencos e conclusão do fluxo por texto.
- Testes: estender `src/test/photoMode.test.ts` (zoom aumenta o tamanho aparente) e criar testes para `squadBackup`/`squadTextParser`.
