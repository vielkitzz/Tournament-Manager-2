# Clássicos em página própria e correção completa do 3º lugar

## Etapa 1 — Separar Clássicos e retirar Calendário

- Criar uma página exclusiva **Clássicos**, mantendo o cadastro já salvo e o impacto disciplinar existente.
- Trocar o item “Calendário e Clássicos” do menu por “Clássicos” e apontá-lo para a nova página.
- Remover a tela e o fluxo de avanço global de calendário, incluindo o código e testes que ficarem sem uso.
- Redirecionar o endereço antigo `/calendar` para a nova página, evitando um link quebrado para quem o tiver salvo.
- Nenhuma alteração de banco é necessária: a tabela `rivalries`, suas regras de acesso e validações já atendem ao cadastro.

## Etapa 2 — Melhorar a página de Clássicos

- Exibir cada clássico em um card próprio com escudos, nomes, nome personalizado e nível 1–5.
- Dividir a identidade visual do card entre as cores dos dois clubes, preservando contraste em temas claro, escuro e skins.
- Manter ações de editar e excluir em cada card e estados claros de carregamento, vazio e clube removido.
- Substituir os seletores fixos do formulário por seletores pesquisáveis por nome, sigla ou abreviação.
- Impedir a escolha do mesmo clube nos dois lados e manter a mensagem de clássico duplicado.
- Adaptar cards e formulário para celular sem reduzir a legibilidade.

## Etapa 3 — Unificar a decisão do 3º lugar

### Problemas confirmados no código atual

- O card de campeão/pódio calcula o terceiro colocado apenas pelo jogo principal com `singleMatchWinner`, ignorando jogos extras e sorteio.
- A exportação procura somente o primeiro jogo marcado como 3º lugar e também ignora a resolução completa do confronto.
- O chaveamento pode oferecer finalização quando a final está resolvida, mesmo que a disputa de 3º lugar ainda esteja empatada e sem decisão.

### Correção

- Criar uma única forma de montar e resolver a disputa de 3º lugar, reunindo partida principal, jogos extras atuais, registros antigos sem marcação completa e sorteio.
- Usar essa resolução única no card do pódio, no estado de finalização, na exportação e nos dados preservados da temporada.
- Só liberar a finalização quando a disputa de 3º lugar estiver decidida, caso ela esteja habilitada.
- Preservar a regra atual: empate abre a gaveta; apenas uma partida extra pendente por vez; novos jogos ou sorteio dependem de ação explícita.
- Não apagar nem reescrever resultados antigos; apenas interpretar corretamente os vínculos já salvos.

## Etapa 4 — Validação econômica por lotes

1. Validar a nova página: busca dos dois clubes, criação, edição, exclusão, conflito e visual no celular.
2. Testar 3º lugar decidido no tempo normal, pênaltis, primeiro jogo extra, vários jogos extras e sorteio.
3. Confirmar em cada cenário: nome do 3º colocado no pódio, bloqueio/liberação da finalização, temporada salva e exportação.
4. Adicionar testes focados no resolvedor do 3º lugar e executar apenas os testes relacionados e a checagem de tipos.

## Arquivos previstos

- `src/pages/RivalriesPage.tsx` (novo)
- `src/App.tsx`
- `src/components/AppSidebar.tsx`
- `src/pages/SeasonCalendarPage.tsx` (remoção)
- `src/lib/seasonAdvance.ts` e `src/test/seasonAdvance.test.ts` (remoção, após confirmar ausência de outros usos)
- `src/components/tournament/BracketView.tsx`
- `src/lib/tieBreaker.ts`
- `src/lib/exportResults.ts`
- `src/pages/TournamentDetailPage.tsx`
- testes focados em desempates e exportação
