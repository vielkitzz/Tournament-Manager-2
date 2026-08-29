# Elencos via texto + import/export geral

## O que será entregue

### 1. Criar elenco via texto
Nova aba **"Por texto"** dentro do diálogo *Gerar elenco* (na página do clube), ao lado da configuração por controles.

O campo aceita dois estilos, detectados automaticamente:

**a) Regras em linguagem natural** (uma frase ou várias linhas):
```text
23 jogadores brasileiros
20% argentinos e uruguaios
idade entre 18 e 32
formação 4-3-3
habilidade 70-85
seguir o rate do clube
```
Interpretação: quantidade, nacionalidade base, percentual + países estrangeiros, faixa etária, composição por posição (a partir de formações como 4-4-2 / 4-3-3 / 3-5-2 ou de contagens explícitas tipo "3 GOL, 4 ZAG"), faixa de habilidade e toggle de vínculo ao rate.

**b) Lista de jogadores**, uma por linha, campos separados por vírgula em ordem livre:
```text
10, Rivaldo, MEI, 28, Brasil, 88
Ederson, GOL, 30, Brasil
Julián Álvarez
```
Campos ausentes são preenchidos pelo gerador (nome por nacionalidade, idade na faixa, habilidade pela âncora do rate, número de camisa livre).

Em ambos os casos o resultado cai na **mesma prévia em tabela** já existente, com edição possível pelos controles antes de salvar, e respeita o limite de 30 jogadores e os números de camisa já usados.

O parser mostra o que entendeu (resumo: "23 jogadores · Brasil · 20% estrangeiros · 18–32 · 4-3-3") e avisos quando alguma linha não for reconhecida.

### 2. Import/export geral de todos os elencos
No diálogo de **Importar/Exportar** das configurações:
- Nova opção de exportar **Elencos (todos os times)** — um único `.json` com jogadores agrupados por time (nome + identificação do time, temporada, e todos os campos do jogador).
- A importação passa a reconhecer esse arquivo: casa cada bloco pelo nome do time existente (cria o time quando não existir, opcional por confirmação), respeita o limite de 30 por elenco, evita camisas duplicadas e grava em lote.
- A opção "Tudo" passa a incluir os elencos.

## Detalhes técnicos

- Novo módulo `src/lib/squadTextParser.ts`: funções puras `parseSquadText(text)` → `{ mode: "rules" | "roster", configPatch: Partial<SquadGeneratorConfig>, players: PartialPlayerSpec[], warnings: string[] }`. Sem React, sem Supabase.
- Reaproveita `POSITION_CODES`, `normalizeComposition`, `generateSquad` e `clampSkill` de `squadGenerator.ts`; aliases de posição PT/EN (goleiro/GK→GOL, zagueiro/CB→ZAG, etc.) e nomes de países via `COUNTRIES_DATA`.
- `GenerateSquadDialog.tsx`: adiciona `Tabs` (Controles | Texto), textarea, botão "Interpretar", resumo e avisos; a prévia e o salvamento (`onConfirm` → `addPlayers`) permanecem os mesmos.
- Export geral: novo helper em `src/lib/` usado por `ImportExportDialog.tsx`, lendo `players`/`teams` do store; import usa `playersFromJson` por time + `addPlayers` em lote.
- Testes em `src/test/squadTextParser.test.ts`: frases de regras, formações, listas de jogadores, campos faltando, entradas inválidas.
