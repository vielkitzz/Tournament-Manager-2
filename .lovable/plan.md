# Estatísticas gerais (por time e de todos os tempos)

Nova página **"Estatísticas"** no menu lateral (logo abaixo de "Competições"), limpa e minimalista, sem alterar o banco: tudo é calculado a partir das partidas já salvas em todas as competições.

## O que a página mostra

Topo com dois filtros simples: **Competição** (Todas / uma específica) e **Time** (Todos / um específico). Abaixo, três abas:

1. **Geral** — números-resumo em poucos cartões (jogos, gols, média de gols, maior goleada) e rankings Top 10 com "ver mais":
   - Artilheiros de todos os tempos
   - Líderes de assistências
   - Melhores notas médias (mínimo de jogos)
   - Mais cartões
   - Maiores campeões (títulos por time)
2. **Por time** — tabela histórica com todos os clubes: J, V, E, D, GP, GC, SG, aproveitamento e títulos; ordenável clicando no cabeçalho, com busca por nome. Clicar em um time filtra a página para ele.
3. **Time selecionado** (quando houver filtro de time) — campanha por competição/ano, artilheiros do clube na história, maior vitória e maior derrota.

Visual: escudos pequenos, tipografia leve, sem gráficos pesados; mesmo padrão das demais páginas. Botão de screenshot no topo, como em outras telas.

## Detalhes técnicos

- `src/lib/globalStats.ts`: funções puras que percorrem `tournaments` (todas as temporadas/snapshots e partidas com placar), agregando jogadores por `playerId` com fallback do nome salvo no evento, times por `teamId`, e títulos usando a mesma resolução de campeão já usada na galeria/exportação.
- `src/pages/GlobalStatsPage.tsx` com rota `/stats`; item no `AppSidebar.tsx` com ícone Phosphor `ChartBar`.
- Cálculo memoizado com `useMemo`; listas longas paginadas por "ver mais".
- Teste `src/test/globalStats.test.ts` cobrindo gols somados entre competições, contagem de V/E/D e títulos.
