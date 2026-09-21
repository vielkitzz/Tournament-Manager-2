# Bloco C — modo foto de partida

Implementação em três passos curtos e verificáveis, sem alterar simulação, dados ou formatos de competição.

## Passo 1 — foto individual completa

- Adicionar o tipo de foto **Partida**, com enquadramento próprio e legível em celular e computador.
- Colocar o botão de câmera dentro do painel da partida.
- A imagem mostrará somente o conteúdo relevante do jogo: escudos, nomes e siglas, placar, etapa/rodada, agregado quando aplicável, prorrogação, pênaltis, sorteio e indicação de jogo extra.
- Incluir a lista de gols com minuto, autor e assistência disponível, além do resumo de cartões e o foguinho com nível quando for clássico.
- Reutilizar cores, cabeçalho, ícone e qualidade já configurados no modo foto geral.

## Passo 2 — captura estável e fiel

- Separar controles interativos do conteúdo capturado, sem fotografar botões, abas, classificação ou comandos de simulação.
- Garantir que listas ocultas ou roláveis necessárias à foto sejam expandidas na cópia, sem alterar a tela normal.
- Corrigir enquadramento, quebra de nomes, escudos remotos/monocromáticos, contraste, margens e altura dinâmica.
- Manter prévia, copiar, baixar e compartilhar funcionando em navegadores móveis compatíveis.

## Passo 3 — varredura e aceite

- Cobrir partida não jogada, resultado comum, clássico, prorrogação, pênaltis, ida e volta com agregado, jogo extra e sorteio.
- Validar a captura em larguras de celular e desktop, verificando cortes, imagem vazia, logos ausentes e texto ilegível.
- Executar testes focados do modo foto e checagem de compilação; corrigir somente regressões encontradas nesse escopo.

## Detalhes técnicos

- `PhotoLayoutKind` receberá `match` e um preset compacto específico.
- `MatchPopup` terá uma área dedicada marcada para captura e usará `ScreenshotButton mode="match"`.
- A fotografia será composta por dados já persistidos em `Match`; nenhuma alteração de banco será feita.
- Regras específicas em `screenshotUtils` serão limitadas a `data-photo-layout="match"`, preservando tabela, rodadas, chaveamento, estatísticas e galeria.
