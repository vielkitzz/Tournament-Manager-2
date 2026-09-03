import { parseSquadText } from "@/lib/squadTextParser";
for (const l of ["23 jogadores brasileiros","20% argentinos e uruguaios","idade entre 18 e 32","formação 4-3-3","habilidade 70-85"]) {
  console.log(l, JSON.stringify(parseSquadText(l).configPatch));
}
import { it } from "vitest";
it("d",()=>{});
