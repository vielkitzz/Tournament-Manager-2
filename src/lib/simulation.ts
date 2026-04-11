/**
 * Generate minute-by-minute events for a match.
 * Distributes goals, cards, and highlights to real players.
 * Improved version: no emojis and more varied events.
 */
export function generateMinuteByMinuteEvents(
  homeTeam: Team,
  awayTeam: Team,
  homePlayers: Player[],
  awayPlayers: Player[],
  matchStats: { homeStats: TeamMatchStats; awayStats: TeamMatchStats },
  homeGoals: number,
  awayGoals: number,
): MatchEvent[] {
  const events: MatchEvent[] = [];
  let eventId = 0;
  const genId = () => `evt-${++eventId}`;

  // Position weights for goal scoring
  const positionGoalWeight: Record<string, number> = {
    Atacante: 5,
    Ponta: 4,
    Meia: 3,
    "Meia-Atacante": 3.5,
    Volante: 1.5,
    Lateral: 1,
    Zagueiro: 0.5,
    Goleiro: 0.1,
  };
  const positionAssistWeight: Record<string, number> = {
    Meia: 5,
    "Meia-Atacante": 4,
    Ponta: 4,
    Atacante: 2,
    Lateral: 3,
    Volante: 2,
    Zagueiro: 0.5,
    Goleiro: 0.2,
  };

  function weightedPick(players: Player[], weights: Record<string, number>, exclude?: string): Player | undefined {
    const available = exclude ? players.filter((p) => p.id !== exclude) : players;
    if (available.length === 0) return undefined;
    const w = available.map((p) => weights[p.position || ""] || 1);
    const total = w.reduce((s, v) => s + v, 0);
    let r = Math.random() * total;
    for (let i = 0; i < available.length; i++) {
      r -= w[i];
      if (r <= 0) return available[i];
    }
    return available[available.length - 1];
  }

  function randomMinute(): number {
    return randInt(1, 90);
  }

  // Generate goal events
  const generateGoals = (team: Team, players: Player[], count: number) => {
    for (let i = 0; i < count; i++) {
      const scorer = weightedPick(players, positionGoalWeight);
      if (!scorer) continue;
      const assister = Math.random() < 0.65 ? weightedPick(players, positionAssistWeight, scorer.id) : undefined;

      const goalDescriptions = [
        `Gol de ${scorer.name}${assister ? ` com assistência de ${assister.name}` : ""}`,
        `Finalização certeira de ${scorer.name} para balançar as redes${assister ? ` após passe de ${assister.name}` : ""}`,
        `${scorer.name} aproveita a oportunidade e marca o gol${assister ? ` vindo de um cruzamento de ${assister.name}` : ""}`,
        `Golaço de ${scorer.name}! A bola vai no ângulo${assister ? ` após jogada individual de ${assister.name}` : ""}`,
      ];

      events.push({
        id: genId(),
        minute: randomMinute(),
        type: "goal",
        teamId: team.id,
        playerId: scorer.id,
        assistId: assister?.id,
        text: goalDescriptions[randInt(0, goalDescriptions.length - 1)],
      });
    }
  };

  generateGoals(homeTeam, homePlayers, homeGoals);
  generateGoals(awayTeam, awayPlayers, awayGoals);

  // Generate yellow card events
  const generateCards = (team: Team, players: Player[], yellows: number, reds: number) => {
    const cardedIds = new Set<string>();
    for (let i = 0; i < yellows; i++) {
      const p = weightedPick(
        players.filter((p) => !cardedIds.has(p.id)),
        { Volante: 4, Zagueiro: 3, Lateral: 2, Meia: 1.5, Atacante: 1, Ponta: 1 },
      );
      if (!p) continue;
      cardedIds.add(p.id);

      const yellowDescriptions = [
        `Cartão amarelo para ${p.name} por falta dura`,
        `${p.name} recebe o amarelo após reclamação com a arbitragem`,
        `Cartão amarelo aplicado a ${p.name} para interromper o contra-ataque`,
        `${p.name} é advertido com cartão amarelo por entrada atrasada`,
      ];

      events.push({
        id: genId(),
        minute: randomMinute(),
        type: "yellow_card",
        teamId: team.id,
        playerId: p.id,
        text: yellowDescriptions[randInt(0, yellowDescriptions.length - 1)],
      });
    }
    for (let i = 0; i < reds; i++) {
      const p = weightedPick(
        players.filter((p) => !cardedIds.has(p.id)),
        { Volante: 4, Zagueiro: 3, Lateral: 2, Meia: 1, Atacante: 1 },
      );
      if (!p) continue;
      cardedIds.add(p.id);

      const redDescriptions = [
        `Cartão vermelho direto para ${p.name} após entrada violenta`,
        `${p.name} é expulso de campo! Cartão vermelho para o jogador`,
        `Expulsão! ${p.name} recebe o cartão vermelho e deixa sua equipe com um a menos`,
      ];

      events.push({
        id: genId(),
        minute: randomMinute(),
        type: "red_card",
        teamId: team.id,
        playerId: p.id,
        text: redDescriptions[randInt(0, redDescriptions.length - 1)],
      });
    }
  };

  generateCards(homeTeam, homePlayers, matchStats.homeStats.yellowCards, matchStats.homeStats.redCards);
  generateCards(awayTeam, awayPlayers, matchStats.awayStats.yellowCards, matchStats.awayStats.redCards);

  // Add more varied highlight events (increased count and variety)
  const highlightCount = randInt(8, 15); // Increased from 2-5 to 8-15
  for (let i = 0; i < highlightCount; i++) {
    const isHome = Math.random() < 0.5;
    const team = isHome ? homeTeam : awayTeam;
    const opponent = isHome ? awayTeam : homeTeam;
    const players = isHome ? homePlayers : awayPlayers;
    const p = players[randInt(0, players.length - 1)];
    if (!p) continue;

    const highlights = [
      `${p.name} arranca em velocidade pela ${Math.random() < 0.5 ? "esquerda" : "direita"} e tenta o cruzamento`,
      `Grande defesa do goleiro após chute potente de ${p.name}`,
      `${p.name} cobra falta perigosa, a bola passa raspando a trave`,
      `${p.name} finaliza de fora da área, mas a bola sobe demais`,
      `Contra-ataque rápido puxado por ${p.name} que assusta a defesa do ${opponent.name}`,
      `${p.name} faz uma bela jogada individual, driblando dois marcadores`,
      `Substituição no ${team.name}: o treinador mexe na equipe para buscar o resultado`,
      `O árbitro interrompe o jogo para atendimento médico a ${p.name}`,
      `${p.name} ganha de cabeça na área, mas a bola vai para fora`,
      `Pressão do ${team.name}! A equipe troca passes no campo de ataque buscando espaços`,
      `Desarme preciso de ${p.name} impedindo o avanço do adversário`,
      `Cruzamento na área do ${opponent.name}, mas a defesa afasta o perigo`,
      `${p.name} tenta o passe em profundidade, mas a bola corre demais e sai pela linha de fundo`,
      `Jogo fica truncado no meio de campo com muitas disputas de bola`,
      `O bandeirinha assinala impedimento de ${p.name} em ataque promissor`,
    ];

    events.push({
      id: genId(),
      minute: randomMinute(),
      type: "highlight",
      teamId: team.id,
      playerId: p.id,
      text: highlights[randInt(0, highlights.length - 1)],
    });
  }

  // Sort by minute
  events.sort((a, b) => a.minute - b.minute);

  // Add start and end match events
  events.unshift({
    id: genId(),
    minute: 0,
    type: "highlight",
    teamId: "",
    text: "Início de partida! O árbitro autoriza o começo do jogo",
  });

  events.push({
    id: genId(),
    minute: 90,
    type: "highlight",
    teamId: "",
    text: "Fim de jogo! O árbitro apita o encerramento da partida",
  });

  return events;
}
