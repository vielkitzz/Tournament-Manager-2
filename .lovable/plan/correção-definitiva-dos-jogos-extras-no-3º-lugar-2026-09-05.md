# Correção definitiva dos jogos extras no 3º lugar

## Causa confirmada

O vídeo mostra que, após criar o primeiro jogo extra do 3º lugar, ele aparece como outro cartão independente e passa a ser tratado como partida normal da final.

No código atual, `handleAddReplay` cria o replay sem copiar `isThirdPlace` e, quando o jogo original não possui `pairId`, ambos continuam sem um vínculo exclusivo. Além disso, a tela renderiza todos os itens marcados como 3º lugar como partidas principais. Assim, o jogo extra deixa de pertencer corretamente à gaveta e pode alimentar novas duplicações.

## Alterações

1. **Criar vínculo estável ao adicionar o primeiro jogo extra**
   - Gerar um `pairId` quando a partida de 3º lugar ainda não tiver um.
   - Atualizar a partida original e criar o replay com o mesmo `pairId`.
   - Copiar `isThirdPlace` para todo replay criado a partir dessa disputa.

2. **Separar partida principal e jogos extras na interface**
   - Renderizar como cartão de 3º lugar somente a partida principal (`!isReplay`).
   - Manter os replays exclusivamente dentro da gaveta da partida principal.
   - O botão geral “Simular” deve considerar apenas a partida principal, nunca um replay pendente.

3. **Compatibilidade com jogos já criados pelo bug**
   - Reconhecer como replay do 3º lugar registros antigos que tenham `isReplay` e correspondam ao mesmo confronto, mesmo que tenham sido salvos sem `isThirdPlace`/`pairId`.
   - Excluí-los da coluna da final e agrupá-los na gaveta correta, sem apagar resultados existentes.

4. **Preservar decisão manual do empate**
   - Continuar impedindo a criação automática de vários replays para o 3º lugar.
   - Após empate, abrir a gaveta para o usuário criar apenas um jogo extra por vez ou decidir no sorteio.

## Validação

- Testar no celular o fluxo exibido no vídeo: empatar o 3º lugar, abrir a gaveta, criar um jogo extra e confirmar que surge somente uma linha dentro dela.
- Confirmar que nenhum replay aparece como nova final ou novo cartão de 3º lugar.
- Confirmar que um novo jogo extra só pode ser criado por ação explícita após outro empate.
- Executar a checagem de tipos e os testes relacionados ao mata-mata.
