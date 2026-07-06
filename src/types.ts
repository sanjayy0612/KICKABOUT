export type LeagueEvent =
  | {
      type: "league";
      name: string;
      createdAt: number;
    }
  | {
      type: "team";
      id: string;
      name: string;
    }
  | {
      type: "fixture";
      id: string;
      home: string;
      away: string;
      date: number;
    }
  | {
      type: "result";
      fixtureId: string;
      homeGoals: number;
      awayGoals: number;
      recordedAt: number;
    }
  | {
      type: "payment";
      from: string;
      amount: string;
      txid: string;
    };

export type TeamStanding = {
  id: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export type FixtureWithResult = {
  id: string;
  home: string;
  away: string;
  date: number;
  result?: {
    homeGoals: number;
    awayGoals: number;
    recordedAt: number;
  };
};
