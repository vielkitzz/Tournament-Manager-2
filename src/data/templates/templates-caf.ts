import type { TournamentTemplate } from "./types";

export const CAF_TEMPLATES: TournamentTemplate[] = [
  // ===================== COPA AFRICANA DE NAÇÕES (AFCON) =====================
  // 1957-1959: 3-4 times, grupo único / semifinal
  {
    id: "afcon-1957",
    name: "CAN 1957-1959",
    originalName: "Copa Africana de Nações",
    region: "África",
    era: "1957-1959",
    sport: "Futebol",
    format: "liga",
    numberOfTeams: 3,
    ligaTurnos: 1,
    settings: {
      extraTime: true,
    },
  },
  // 1962-1968: 4 times, semis + final
  {
    id: "afcon-1962",
    name: "CAN 1962-1968",
    originalName: "Copa Africana de Nações",
    region: "África",
    era: "1962-1968",
    sport: "Futebol",
    format: "mata-mata",
    numberOfTeams: 4,
    mataMataInicio: "1/4",
    knockoutLegMode: "single",
    settings: {
      thirdPlaceMatch: true,
      extraTime: true,
    },
  },
  // 1970-1990: 8 times, 2 grupos de 4 + semis
  {
    id: "afcon-1970",
    name: "CAN 1970-1990",
    originalName: "Copa Africana de Nações",
    region: "África",
    era: "1970-1990",
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
  // 1992: 12 times, 4 grupos de 3 + quartas
  {
    id: "afcon-1992",
    name: "CAN 1992",
    originalName: "Copa Africana de Nações",
    region: "África",
    era: "1992",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 12,
    gruposQuantidade: 4,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/8",
    knockoutLegMode: "single",
    settings: {
      thirdPlaceMatch: true,
      extraTime: true,
      bestOfQualifiers: 2,
      bestOfPosition: 3,
    },
  },
  // 1996-2019: 16 times, 4 grupos de 4 + quartas
  {
    id: "afcon-1996",
    name: "CAN 1996-2019",
    originalName: "Copa Africana de Nações",
    region: "África",
    era: "1996-2019",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 16,
    gruposQuantidade: 4,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/8",
    knockoutLegMode: "single",
    settings: {
      thirdPlaceMatch: true,
      extraTime: true,
    },
  },
  // 2019+: 24 times, 6 grupos de 4 + oitavas
  {
    id: "afcon-2019",
    name: "CAN 2019+",
    originalName: "Copa Africana de Nações",
    region: "África",
    era: "2019-Presente",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 24,
    gruposQuantidade: 6,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/16",
    knockoutLegMode: "single",
    settings: {
      thirdPlaceMatch: true,
      extraTime: true,
      bestOfQualifiers: 4,
      bestOfPosition: 3,
    },
  },

  // ===================== CAF CHAMPIONS LEAGUE =====================
  // 1964-1996: African Cup of Champions Clubs, mata-mata ida e volta
  {
    id: "caf-cl-1964",
    name: "CAF Champions Clubs 1964-1996",
    originalName: "CAF Champions League",
    region: "África",
    era: "1964-1996",
    sport: "Futebol",
    format: "mata-mata",
    numberOfTeams: 16,
    mataMataInicio: "1/16",
    knockoutLegMode: "home-away",
    settings: {
      extraTime: true,
    },
  },
  // 1997-2019: CAF Champions League, 8 grupos de 4 + semis ida e volta
  {
    id: "caf-cl-1997",
    name: "CAF Champions League 1997-2019",
    originalName: "CAF Champions League",
    region: "África",
    era: "1997-2019",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 16,
    gruposQuantidade: 4,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/4",
    knockoutLegMode: "home-away",
    settings: {
      extraTime: true,
      finalSingleLeg: true,
    },
  },
  // 2020+: mesma estrutura
  {
    id: "caf-cl-2020",
    name: "CAF Champions League 2020+",
    originalName: "CAF Champions League",
    region: "África",
    era: "2020-Presente",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 16,
    gruposQuantidade: 4,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/4",
    knockoutLegMode: "home-away",
    settings: {
      extraTime: true,
      finalSingleLeg: true,
    },
  },

  // ===================== CAF CONFEDERATION CUP =====================
  // 2004-2019: 8 grupos + mata-mata
  {
    id: "caf-confed-2004",
    name: "CAF Confederation Cup 2004-2019",
    originalName: "CAF Confederation Cup",
    region: "África",
    era: "2004-2019",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 16,
    gruposQuantidade: 4,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/4",
    knockoutLegMode: "home-away",
    settings: {
      extraTime: true,
      finalSingleLeg: true,
    },
  },
  // 2020+
  {
    id: "caf-confed-2020",
    name: "CAF Confederation Cup 2020+",
    originalName: "CAF Confederation Cup",
    region: "África",
    era: "2020-Presente",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 16,
    gruposQuantidade: 4,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/4",
    knockoutLegMode: "home-away",
    settings: {
      extraTime: true,
      finalSingleLeg: true,
    },
  },

  // ===================== CAF SUPER CUP =====================
  // 1993+: Jogo único entre campeões da CL e Confederation Cup
  {
    id: "caf-super-1993",
    name: "CAF Super Cup 1993+",
    originalName: "CAF Super Cup",
    region: "África",
    era: "1993-Presente",
    sport: "Futebol",
    format: "mata-mata",
    numberOfTeams: 2,
    mataMataInicio: "1/2",
    knockoutLegMode: "single",
    settings: {
      extraTime: true,
    },
  },
];
