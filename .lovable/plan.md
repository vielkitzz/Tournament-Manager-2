

## Plano: Templates de Competições Históricas

### Visão Geral
Criar um sistema de templates históricos de competições reais que permite ao usuário preencher automaticamente o formulário de criação com configurações pré-definidas, organizados por região, competição e era.

---

### 1. Arquitetura de Dados

**Novo arquivo `src/data/templates/types.ts`** — Interface `TournamentTemplate`:
```typescript
interface TournamentTemplate {
  id: string;
  name: string;              // Nome para exibição (ex: "Copa do Mundo 2026")
  originalName: string;      // Nome oficial (ex: "FIFA World Cup")
  region: string;             // 'Europa', 'América do Sul', 'Mundo'
  era: string;               // '2024-Presente', '2003-2023'
  sport: string;
  format: TournamentFormat;
  numberOfTeams: number;
  logo?: string;
  settings: Partial<TournamentSettings>;
  // Campos específicos de formato
  ligaTurnos?: 1 | 2;
  gruposQuantidade?: number;
  gruposTurnos?: 1 | 2 | 3 | 4;
  gruposMataMataInicio?: KnockoutStage;
  mataMataInicio?: KnockoutStage;
  knockoutLegMode?: KnockoutLegMode;
  suicoJogosLiga?: number;
  suicoMataMataInicio?: KnockoutStage;
  suicoPlayoffVagas?: number;
}
```

### 2. Arquivos de Templates por Região

Criar arquivos em `src/data/templates/`:

- **`templates-fifa.ts`** — Copa do Mundo (1930: 13 times mata-mata, 1934-1938: 16 mata-mata, 1950: 13 grupos, 1954-1970: 16 grupos+mata, 1974-1978: 16 grupos 2 fases, 1982: 24 grupos+mata, 1986-1994: 24 grupos+oitavas, 1998-2022: 32 grupos+oitavas, 2026+: 48 grupos+32avos), Mundial de Clubes (2000-2023: 7 times, 2025+: 32 grupos+mata), Copa das Confederações (1997-2017: 8 times grupos+semi)

- **`templates-conmebol.ts`** — Copa América (formatos variados: 10-16 times), Libertadores (formatos desde grupos de 3 a grupos de 4 + mata), Copa Sulamericana (desde 2002)

- **`templates-uefa.ts`** — Champions League (1992-1997: 8 grupos+semi, 1999-2003: 32 times 2 fases de grupos, 2003-2024: 32 grupos+oitavas, 2024+: 36 suíço+playoffs), Europa League, Conference League

- **`templates-index.ts`** — Exporta `ALL_TEMPLATES` unificado e helpers como `getRegions()`, `getCompetitionsByRegion()`, `getErasByCompetition()`

### 3. Componente de Seleção de Templates

**Novo componente `src/components/TemplateSelector.tsx`**:
- UI em 3 passos com animação:
  1. **Região** — Cards/botões com ícones (bandeiras/globo) para Mundo, Europa, América do Sul
  2. **Competição** — Lista filtrada de competições da região selecionada, agrupadas por `originalName`
  3. **Era/Formato** — Cards mostrando cada era com resumo do formato (ex: "32 times - Grupos + Oitavas")
- Botão "Confirmar" que chama callback `onSelect(template)` com o template escolhido

### 4. Integração com CreateTournamentPage

- Modificar `CreateTournamentPage.tsx` para exibir uma tela inicial com 2 opções:
  - "Começar do Zero" → abre o `TournamentForm` atual
  - "Usar Template Histórico" → abre o `TemplateSelector`
- Ao selecionar um template, navegar para o `TournamentForm` passando o template como prop
- Modificar `TournamentForm` para aceitar prop `template?: TournamentTemplate` que pré-preenche todos os campos (nome editável, formato, número de times, settings, etc.)

### 5. Detalhes Técnicos

- Os templates são estáticos (sem banco de dados), ficam no bundle
- O `TournamentForm` receberá nova prop `initialTemplate` que popula os `useState` no mount
- O nome virá pré-preenchido com o `name` do template mas será editável
- Settings do template serão mergeadas com `DEFAULT_SETTINGS`
- Campos como `knockoutLegMode`, `thirdPlaceMatch`, `finalSingleLeg` virão configurados corretamente por era (ex: Copa do Mundo sempre tem disputa de 3° lugar)

### Arquivos a Criar/Modificar

| Ação | Arquivo |
|------|---------|
| Criar | `src/data/templates/types.ts` |
| Criar | `src/data/templates/templates-fifa.ts` |
| Criar | `src/data/templates/templates-conmebol.ts` |
| Criar | `src/data/templates/templates-uefa.ts` |
| Criar | `src/data/templates/index.ts` |
| Criar | `src/components/TemplateSelector.tsx` |
| Modificar | `src/pages/CreateTournamentPage.tsx` |
| Modificar | `src/components/TournamentForm.tsx` |

