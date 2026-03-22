import type { TournamentTemplate } from "./types";

export const CONCACAF_TEMPLATES: TournamentTemplate[] = [
  // ===================== COPA OURO (CONCACAF Gold Cup) =====================
  // 1991: 8 times, 2 grupos de 4 + semis
  {
    id: "gold-cup-1991",
    name: "Copa Ouro 1991-1993",
    originalName: "CONCACAF Gold Cup",
    region: "América do Norte",
    era: "1991-1993",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 8,
    gruposQuantidade: 2,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/4",
    knockoutLegMode: "single",
    settings: {
      thirdPlaceMatch: true,
      extraTime: true,
    },
  },
  // 1996-2000: 9-12 times, 3 grupos + quartas
  {
    id: "gold-cup-1996",
    name: "Copa Ouro 1996-2000",
    originalName: "CONCACAF Gold Cup",
    region: "América do Norte",
    era: "1996-2000",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 12,
    gruposQuantidade: 3,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/8",
    knockoutLegMode: "single",
    settings: {
      thirdPlaceMatch: false,
      extraTime: true,
      bestOfQualifiers: 2,
      bestOfPosition: 3,
    },
  },
  // 2002-2023: 12-16 times, 4 grupos de 4 + quartas
  {
    id: "gold-cup-2002",
    name: "Copa Ouro 2002-2023",
    originalName: "CONCACAF Gold Cup",
    region: "América do Norte",
    era: "2002-2023",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 16,
    gruposQuantidade: 4,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/8",
    knockoutLegMode: "single",
    settings: {
      thirdPlaceMatch: false,
      extraTime: true,
    },
  },
  // 2025+: 24 times (expandido)
  {
    id: "gold-cup-2025",
    name: "Copa Ouro 2025+",
    originalName: "CONCACAF Gold Cup",
    region: "América do Norte",
    era: "2025-Presente",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 24,
    gruposQuantidade: 6,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/16",
    knockoutLegMode: "single",
    settings: {
      thirdPlaceMatch: false,
      extraTime: true,
      bestOfQualifiers: 4,
      bestOfPosition: 3,
    },
  },

  // ===================== CONCACAF CHAMPIONS CUP =====================
  // 1962-1997: CONCACAF Champions' Cup, formato variado, mata-mata
  {
    id: "concacaf-cc-1962",
    name: "CONCACAF Champions' Cup 1962-1997",
    originalName: "CONCACAF Champions Cup",
    region: "América do Norte",
    era: "1962-1997",
    sport: "Futebol",
    format: "mata-mata",
    numberOfTeams: 8,
    mataMataInicio: "1/8",
    knockoutLegMode: "home-away",
    settings: {
      extraTime: true,
    },
  },
  // 2008-2017: CONCACAF Champions League, 24 times, 8 grupos de 3 + quartas
  {
    id: "concacaf-cl-2008",
    name: "CONCACAF Champions League 2008-2017",
    originalName: "CONCACAF Champions Cup",
    region: "América do Norte",
    era: "2008-2017",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 24,
    gruposQuantidade: 8,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/8",
    knockoutLegMode: "home-away",
    settings: {
      extraTime: true,
    },
  },
  // 2018-2023: CONCACAF Champions League, 16 times, mata-mata direto
  {
    id: "concacaf-cl-2018",
    name: "CONCACAF Champions League 2018-2023",
    originalName: "CONCACAF Champions Cup",
    region: "América do Norte",
    era: "2018-2023",
    sport: "Futebol",
    format: "mata-mata",
    numberOfTeams: 16,
    mataMataInicio: "1/16",
    knockoutLegMode: "home-away",
    settings: {
      extraTime: true,
      finalSingleLeg: true,
    },
  },
  // 2024+: CONCACAF Champions Cup, 27 times, fase de grupos + mata-mata
  {
    id: "concacaf-cc-2024",
    name: "CONCACAF Champions Cup 2024+",
    originalName: "CONCACAF Champions Cup",
    region: "América do Norte",
    era: "2024-Presente",
    sport: "Futebol",
    format: "mata-mata",
    numberOfTeams: 16,
    mataMataInicio: "1/16",
    knockoutLegMode: "home-away",
    settings: {
      extraTime: true,
      finalSingleLeg: true,
    },
  },
];
