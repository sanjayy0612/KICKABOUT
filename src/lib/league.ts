import type { FixtureWithResult, LeagueEvent, TeamStanding } from "../types";

const compareStandings = (left: TeamStanding, right: TeamStanding) => {
  if (right.points !== left.points) {
    return right.points - left.points;
  }

  const goalDifferenceLeft = left.goalsFor - left.goalsAgainst;
  const goalDifferenceRight = right.goalsFor - right.goalsAgainst;

  if (goalDifferenceRight !== goalDifferenceLeft) {
    return goalDifferenceRight - goalDifferenceLeft;
  }

  if (right.goalsFor !== left.goalsFor) {
    return right.goalsFor - left.goalsFor;
  }

  return left.name.localeCompare(right.name);
};

export const deriveStandings = (events: LeagueEvent[]): TeamStanding[] => {
  const teamMap = new Map<string, TeamStanding>();
  const fixtureMap = new Map<string, FixtureWithResult>();

  for (const event of events) {
    if (event.type === "team") {
      teamMap.set(event.id, {
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
      fixtureMap.set(event.id, {
        id: event.id,
        home: event.home,
        away: event.away,
        date: event.date
      });
    }

    if (event.type === "result") {
      const fixture = fixtureMap.get(event.fixtureId);

      if (!fixture) {
        continue;
      }

      fixture.result = {
        homeGoals: event.homeGoals,
        awayGoals: event.awayGoals,
        recordedAt: event.recordedAt
      };
    }
  }

  for (const fixture of fixtureMap.values()) {
    if (!fixture.result) {
      continue;
    }

    const homeTeam = teamMap.get(fixture.home);
    const awayTeam = teamMap.get(fixture.away);

    if (!homeTeam || !awayTeam) {
      continue;
    }

    homeTeam.played += 1;
    awayTeam.played += 1;

    homeTeam.goalsFor += fixture.result.homeGoals;
    homeTeam.goalsAgainst += fixture.result.awayGoals;
    awayTeam.goalsFor += fixture.result.awayGoals;
    awayTeam.goalsAgainst += fixture.result.homeGoals;

    if (fixture.result.homeGoals > fixture.result.awayGoals) {
      homeTeam.won += 1;
      homeTeam.points += 3;
      awayTeam.lost += 1;
      continue;
    }

    if (fixture.result.homeGoals < fixture.result.awayGoals) {
      awayTeam.won += 1;
      awayTeam.points += 3;
      homeTeam.lost += 1;
      continue;
    }

    homeTeam.drawn += 1;
    awayTeam.drawn += 1;
    homeTeam.points += 1;
    awayTeam.points += 1;
  }

  return Array.from(teamMap.values()).sort(compareStandings);
};

export const deriveFixtures = (events: LeagueEvent[]): FixtureWithResult[] => {
  const fixtures = new Map<string, FixtureWithResult>();

  for (const event of events) {
    if (event.type === "fixture") {
      fixtures.set(event.id, {
        id: event.id,
        home: event.home,
        away: event.away,
        date: event.date
      });
    }

    if (event.type === "result") {
      const fixture = fixtures.get(event.fixtureId);

      if (!fixture) {
        continue;
      }

      fixture.result = {
        homeGoals: event.homeGoals,
        awayGoals: event.awayGoals,
        recordedAt: event.recordedAt
      };
    }
  }

  return Array.from(fixtures.values()).sort((left, right) => left.date - right.date);
};
