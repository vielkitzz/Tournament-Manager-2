# Próxima grande atualização — roteiro em partes

Objetivo: modernizar a criação e evolução de elencos sem comprometer o histórico, adicionar avanço global de temporadas e criar o formato “Fase de Liga + Mata-Mata”. O trabalho será entregue em partes independentes, com validação ao fim de cada uma.

## Estado atual verificado

- Jogadores já possuem nome, nacionalidade, posição, idade, camisa, habilidade e ano de temporada. A criação atual é individual, com aleatoriedade campo a campo e limite de 30 jogadores.
- A importação de elenco aceita JSON, mas hoje descarta parte dos campos e insere jogador por jogador.
- A força de partida compara a média dos 11 recebidos com a exigência derivada do rate do clube; a atualização do rate do clube ainda não recalibra os jogadores.
- Cada torneio guarda temporadas anteriores como snapshots em `seasons`; a criação da temporada seguinte hoje acontece torneio por torneio e já contém parte da lógica de promoção/rebaixamento.
- “Grupos + Mata-Mata” usa vários grupos. O sistema suíço usa uma tabela única, mas agenda apenas um número limitado de confrontos; portanto, nenhum dos dois representa exatamente a nova fase de liga todos-contra-todos seguida de mata-mata.
- No modo foto, o clone usa `transform: scale(...)`, dimensões medidas depois da transformação e regras globais de `overflow: visible`. Essa combinação pode contar o zoom duas vezes, ampliar caixas flexíveis e impedir um recorte confiável. Em “Maiores Campeões”, os anos ficam em uma linha com largura máxima fixa.

## Parte 1 — estabilização do Modo Foto

Prioridade imediata e isolada das demais funcionalidades.

- Reescrever a geometria da captura usando duas coordenadas explícitas: tamanho de layout sem transformação e tamanho final exportado. O controle de zoom deverá aumentar visualmente texto, escudos e placares, nunca reduzir sua proporção.
- Substituir a medição genérica de qualquer descendente por limites de conteúdo marcados por layout. Cada modo terá regras próprias para tabela, rodadas, chaveamento, estatísticas e galeria.
- No modo rodadas, remover a influência de `w-full`, `flex-1`, divisórias e controles na largura capturada; centralizar o maior confronto real e manter margem lateral constante.
- No chaveamento, preservar proporções entre cards, conectores e campeão sem dupla escala nem caixas esticadas.
- Na sala de troféus, permitir quebra organizada da lista de anos e altura automática nas linhas, sem texto fora da caixa.
- Fazer a prévia usar o mesmo pipeline e a mesma geometria da captura real, em vez de apenas aproximar o tamanho da fonte.
- Adicionar testes da matemática de zoom e enquadramento, além de uma varredura visual em larguras equivalentes a iPhone pequeno/grande, Android, tablet e desktop. Validar tema claro/escuro, nomes e listas longas, escudos e todos os níveis de zoom.
- Contingência: manter presets independentes por modo e fallback para a largura natural quando a medição específica resultar em zero, corte ou dimensão implausível.

**Critério de aceite:** aumentar o zoom sempre aumenta o conteúdo; não há grandes faixas vazias, conteúdo descentralizado, caixas deformadas ou texto cortado em nenhum modo.

## Parte 2 — núcleo do novo gerador de elencos

- Criar um motor puro e testável de geração com composição posicional configurável, quantidade total (respeitando 30), nacionalidade principal, mistura de estrangeiros, faixa/distribuição de idade, faixas de camisa e habilidade.
- Adicionar o botão **Gerar elenco** na página do clube, abrindo um fluxo de configuração com prévia antes de salvar.
- Incluir o toggle **Ajustar ao rate do clube**. Ligado, a distribuição de habilidade será ancorada na exigência já usada pela simulação (`rate × 7 + 42`); desligado, o usuário define a faixa de habilidade livremente.
- Validar duplicidade de camisa, mínimo por posição, goleiros, campos inválidos e limite do elenco antes da gravação.
- Salvar o lote de forma transacional ou em operação agrupada, evitando dezenas de estados intermediários e eventos de realtime.
- Corrigir a importação JSON atual para preservar nacionalidade, idade, camisa, foto, ano e vínculo de origem quando presentes.

**Critério de aceite:** um elenco completo e equilibrado pode ser revisado e criado em uma única operação, sem duplicações ou elenco parcial após erro.

## Parte 3 — criação de elencos via texto

- Adicionar um importador flexível por linhas, aceitando separadores comuns (`;`, vírgula, tabulação, hífen ou barra) e campos reconhecíveis: nome, posição, idade, nacionalidade, camisa e habilidade.
- Exibir uma tabela de prévia editável com o campo interpretado, avisos por linha e indicação clara do que será gerado automaticamente.
- Normalizar nomes de posições e países, detectar ambiguidades e nunca salvar linhas inválidas silenciosamente.
- Permitir completar campos ausentes usando as mesmas regras do gerador da Parte 2, inclusive o vínculo opcional ao rate do clube.

**Critério de aceite:** o usuário cola uma lista heterogênea, corrige apenas as exceções e cria todo o elenco de uma vez.

## Parte 4 — vínculo de rate e idade dinâmica

Escolhas definidas: ajuste proporcional de rate e envelhecimento com evolução/regressão.

- Persistir metadados mínimos para distinguir jogadores gerados com rate vinculado: âncora do rate, desvio individual de habilidade, potencial/desenvolvimento e identidade de carreira entre temporadas.
- Ao alterar o rate na página do clube, recalcular apenas jogadores vinculados da temporada ativa, preservando a diferença relativa entre titulares, reservas e promessas. Jogadores manuais ou gerados com o toggle desligado permanecem intactos.
- Manter elencos de anos anteriores imutáveis, seguindo o isolamento histórico já adotado pelo projeto.
- Ao avançar o calendário, criar o elenco do novo ano com `idade + 1` e curva moderada de habilidade: maior chance de evolução para jovens, estabilidade no auge e regressão gradual para veteranos, limitada ao intervalo 45–99.
- Mostrar uma prévia das alterações antes de confirmar: idade anterior/nova, habilidade anterior/nova, entradas, saídas e jogadores sem dados suficientes.
- Cobrir com testes determinísticos usando gerador aleatório injetável, para evitar testes instáveis.

**Critério de aceite:** mudar o rate mantém a hierarquia do elenco; avançar o ano não altera temporadas antigas e produz mudanças explicáveis e limitadas.

## Parte 5 — calendário global de temporadas

- Criar um fluxo central de **Avançar calendário** para selecionar quais torneios e clubes participarão da mudança de ano.
- Antes de gravar, validar torneios não finalizados, anos conflitantes, promoções/rebaixamentos pendentes e elencos sem temporada.
- Reutilizar a criação de snapshots existente, mas executar a transição em lote: preservar campanhas, limpar partidas do novo ano, transferir classificados/rebaixados e criar as novas versões de elenco.
- Exibir uma prévia global das mudanças por competição e clube, com opção de excluir itens do lote.
- Processar em ordem estável para que promoções e rebaixamentos não dependam de qual torneio foi avançado primeiro; impedir execução duplicada do mesmo ano.
- Não sincronizar automaticamente mudanças futuras para snapshots históricos.

**Critério de aceite:** todas as competições selecionadas chegam ao mesmo ano em uma operação previsível, mantendo histórico e movimentações consistentes.

## Parte 6 — novo formato “Fase de Liga + Mata-Mata”

- Adicionar um formato próprio, separado de grupos e suíço: todos os participantes ficam em uma tabela única e jogam todos contra todos em um ou mais turnos.
- Reutilizar regras de pontos, critérios de desempate, deduções/adições e tabela da liga.
- Permitir configurar número de classificados e fase inicial do mata-mata, validando quantidade par e estrutura compatível com a chave.
- Ao concluir a fase de liga, selecionar automaticamente os melhores colocados, permitir revisão manual e gerar o chaveamento com as regras existentes de ida/volta, final e disputa de terceiro.
- Integrar abas, finalização, histórico, exportação, estatísticas, modo foto, duplicação e temporadas ao novo formato.
- Adicionar testes de geração, classificação, transição de fase, campeão e snapshot histórico.

**Critério de aceite:** a fase inicial mostra uma única classificação completa e, após confirmação, os melhores avançam corretamente para o mata-mata.

## Ordem recomendada e controle de créditos

1. **Patch Foto** — entrega independente e prioritária.
2. **Gerador de elenco** — motor, interface e correções da importação atual.
3. **Texto** — reutiliza o motor já validado.
4. **Rate + idade** — inclui persistência e migração de dados.
5. **Calendário global** — usa a evolução anual pronta.
6. **Liga + Mata-Mata** — mudança transversal de formato.

Cada parte terá seu próprio teste e poderá ser publicada separadamente. Mudanças de banco ficam concentradas na Parte 4; as Partes 1–3 permanecem majoritariamente isoladas no frontend e na lógica de domínio.

## Detalhes técnicos principais

- Elencos: `ClubSquadPage`, `CreatePlayerPage`, `playerSkill`, store e um novo módulo puro de geração/importação.
- Persistência da carreira: migração segura da tabela `players`, mantendo RLS por proprietário e compatibilidade com jogadores existentes.
- Temporadas: extrair a transição hoje concentrada em `TournamentDetailPage` para funções reutilizáveis e uma ação em lote.
- Formatos: ampliar `TournamentFormat`, formulário, serialização do store, geração de jogos, classificação, abas e snapshot.
- Foto: `screenshotUtils`, presets, prévia e marcações `data-photo-*` específicas nos cinco layouts.
