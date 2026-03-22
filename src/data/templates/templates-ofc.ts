import type { TournamentTemplate } from "./types";

export const OFC_TEMPLATES: TournamentTemplate[] = [
  // ===================== COPA DAS NAÇÕES DA OCEANIA (OFC Nations Cup) =====================
  // 1973-1980: 4-5 times, grupo único (liga)
  {
    id: "ofc-nations-1973",
    name: "OFC Nations Cup 1973-1980",
    originalName: "Copa das Nações da Oceania",
    region: "Oceania",
    era: "1973-1980",
    sport: "Futebol",
    format: "liga",
    numberOfTeams: 5,
    ligaTurnos: 1,
    settings: {
      extraTime: false,
    },
  },
  // 1996-2000: 6-8 times, 2 grupos + semis
  {
    id: "ofc-nations-1996",
    name: "OFC Nations Cup 1996-2000",
    originalName: "Copa das Nações da Oceania",
    region: "Oceania",
    era: "1996-2000",
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
  // 2002-2012: 4-8 times, grupos + semis/final
  {
    id: "ofc-nations-2002",
    name: "OFC Nations Cup 2002-2012",
    originalName: "Copa das Nações da Oceania",
    region: "Oceania",
    era: "2002-2012",
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
  // 2016+: 8 times, 2 grupos de 4 + semis
  {
    id: "ofc-nations-2016",
    name: "OFC Nations Cup 2016+",
    originalName: "Copa das Nações da Oceania",
    region: "Oceania",
    era: "2016-Presente",
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

  // ===================== OFC CHAMPIONS LEAGUE =====================
  // 1987-1998: Oceania Club Championship, 4-8 times, mata-mata / grupo
  {
    id: "ofc-cl-1987",
    name: "OFC Club Championship 1987-1998",
    originalName: "OFC Champions League",
    region: "Oceania",
    era: "1987-1998",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 8,
    gruposQuantidade: 2,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/4",
    knockoutLegMode: "single",
    settings: {
      extraTime: true,
    },
  },
  // 1999-2006: expansão, 8-12 times
  {
    id: "ofc-cl-1999",
    name: "OFC Champions League 1999-2006",
    originalName: "OFC Champions League",
    region: "Oceania",
    era: "1999-2006",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 8,
    gruposQuantidade: 2,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/4",
    knockoutLegMode: "single",
    settings: {
      extraTime: true,
      finalSingleLeg: true,
    },
  },
  // 2007+: OFC Champions League, 8-12 times, grupos + mata-mata
  {
    id: "ofc-cl-2007",
    name: "OFC Champions League 2007+",
    originalName: "OFC Champions League",
    region: "Oceania",
    era: "2007-Presente",
    sport: "Futebol",
    format: "grupos",
    numberOfTeams: 8,
    gruposQuantidade: 2,
    gruposTurnos: 1,
    gruposMataMataInicio: "1/4",
    knockoutLegMode: "home-away",
    settings: {
      extraTime: true,
      finalSingleLeg: true,
    },
  },
];
