// Plain-JS port of src/lib/league.ts (deriveStandings/deriveFixtures) so the
// Pear/Bare terminal app can render the same table the web UI does. Keep in sync
// with src/lib/league.ts — both are pure folds over the LeagueEvent log.

export function deriveStandings(events) {
  const teams = new Map();
  const fixtures = new Map();

  for (const event of events) {
    if (event.type === "team") {
      teams.set(event.id, {
        id: event.id,
        name: event.name,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0
      });
    }
    if (event.type === "fixture") {
      fixtures.set(event.id, { id: event.id, home: event.home, away: event.away });
    }
    if (event.type === "result") {
      const fixture = fixtures.get(event.fixtureId);
      if (fixture) {
        fixture.result = { homeGoals: event.homeGoals, awayGoals: event.awayGoals };
      }
    }
  }

  for (const fixture of fixtures.values()) {
    if (!fixture.result) continue;
    const home = teams.get(fixture.home);
    const away = teams.get(fixture.away);
    if (!home || !away) continue;

    const { homeGoals, awayGoals } = fixture.result;
    home.played += 1;
    away.played += 1;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (homeGoals < awayGoals) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return [...teams.values()].sort((l, r) => {
    if (r.points !== l.points) return r.points - l.points;
    const gdL = l.goalsFor - l.goalsAgainst;
    const gdR = r.goalsFor - r.goalsAgainst;
    if (gdR !== gdL) return gdR - gdL;
    if (r.goalsFor !== l.goalsFor) return r.goalsFor - l.goalsFor;
    return l.name.localeCompare(r.name);
  });
}

export function renderStandings(events) {
  const table = deriveStandings(events);
  if (table.length === 0) return "(no teams yet)";
  const rows = table.map((t, i) => {
    const pos = String(i + 1).padStart(2, " ");
    const name = t.name.padEnd(20, " ");
    const gd = t.goalsFor - t.goalsAgainst;
    return `${pos}. ${name} P${t.played} W${t.won} D${t.drawn} L${t.lost} GD${gd} Pts ${t.points}`;
  });
  return rows.join("\n");
}
