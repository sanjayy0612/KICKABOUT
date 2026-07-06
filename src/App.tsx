import { useMemo, useState } from "react";
import { LocalEventStore } from "./lib/event-store";
import { deriveFixtures, deriveStandings } from "./lib/league";
import type { LeagueEvent } from "./types";

const formatDate = (value: number) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);

const stats = [
  { label: "Leagues Running", value: 128 },
  { label: "Matches Synced", value: 3462 },
  { label: "USDt In Prize Pots", value: 18420 },
  { label: "Servers", value: 0 }
];

const valueProps = [
  "No server, ever",
  "Your money, your keys",
  "AI that works offline",
  "Free forever",
  "Works on patchy internet",
  "Syncs peer-to-peer"
];

const storyBlocks = [
  {
    number: "01",
    title: "A neighborhood league that never needed a backend team",
    body:
      "Set up on one laptop, shared across players, and kept alive through peer sync instead of a fragile admin spreadsheet.",
    cta: "Read the matchday story"
  },
  {
    number: "02",
    title: "Pitch fees collected without chasing cash after kickoff",
    body:
      "The same flow that runs fixtures can route self-custody contributions into a transparent season pot.",
    cta: "Watch the payment flow"
  },
  {
    number: "03",
    title: "Recaps generated on-device when the night is over",
    body:
      "Results become local AI summaries and team-of-the-week outputs without shipping match data to the cloud.",
    cta: "See the offline recap"
  }
];

const useCases = [
  {
    eyebrow: "Play",
    title: "Fixtures, results, live standings",
    body: "Run the season from one event log and let the table recompute itself."
  },
  {
    eyebrow: "Pay",
    title: "Pitch fees and prize pots in self-custody USDt",
    body: "Collect contributions transparently and keep custody with the league."
  },
  {
    eyebrow: "Predict",
    title: "Group predictions for matchday drama",
    body: "Add lightweight social competition on top of the existing league flow."
  },
  {
    eyebrow: "Recap",
    title: "On-device AI reports and team of the week",
    body: "Generate post-match intelligence without needing a cloud inference bill."
  }
];

const stackBlocks = [
  {
    eyebrow: "Pears",
    title: "Runs on no one's server.",
    body: "Peer-to-peer league sync that feels native to community football, not retrofitted after the fact.",
    theme: "navy"
  },
  {
    eyebrow: "QVAC",
    title: "Intelligence that never leaves your phone.",
    body: "Local matchday recaps and insights drawn directly from the results feed.",
    theme: "blue"
  },
  {
    eyebrow: "WDK",
    title: "Your money, your keys.",
    body: "Self-custody USDt for pitch fees, prize pools, and transparent organizer flows.",
    theme: "green"
  }
] as const;

const jerseyColors = ["07", "11", "04", "23"];

export const App = () => {
  const [store] = useState(() => new LocalEventStore());
  const [events] = useState<LeagueEvent[]>(() => store.load());
  const teams = events.filter((event): event is Extract<LeagueEvent, { type: "team" }> => event.type === "team");
  const standings = useMemo(() => deriveStandings(events), [events]);
  const fixtures = useMemo(() => deriveFixtures(events), [events]);
  const nextFixture = fixtures.find((fixture) => !fixture.result) ?? fixtures[0];
  const syncedPeers = 3;
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));

  return (
    <div className="page">
      <header className="nav-shell">
        <div className="container nav-bar">
          <a className="wordmark" href="#top">
            KICKABOUT
          </a>
          <nav className="nav-links" aria-label="Primary">
            <a href="#product">Product</a>
            <a href="#how-it-works">How it works</a>
            <a href="#the-stack">The Stack</a>
          </nav>
          <a className="button button-primary" href="#app">
            Get Started
          </a>
        </div>
      </header>

      <main id="top">
        <section className="section hero-section section-white">
          <div className="container hero-layout">
            <div className="hero-copy">
              <p className="eyebrow">Serverless Community Football</p>
              <h1 className="display-heading">
                Your league.
                <br />
                Run by no one but you.
              </h1>
              <p className="hero-subcopy">
                KICKABOUT replaces chat chaos, spreadsheet standings, and cash chasing
                with one peer-to-peer league flow built for real community football.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#app">
                  Get Started
                </a>
                <a className="button button-secondary" href="#how-it-works">
                  See How It Works
                </a>
              </div>
            </div>
            <div className="hero-stage" aria-hidden="true">
              <div className="pitch-diagram">
                <div className="pitch-line pitch-line-vertical" />
                <div className="pitch-circle" />
                <div className="hero-score-card">
                  <span className="eyebrow">Next Match</span>
                  <strong>
                    {nextFixture
                      ? `${teamNames.get(nextFixture.home) ?? "Red Foxes"} vs ${
                          teamNames.get(nextFixture.away) ?? "Dockside FC"
                        }`
                      : "League ready"}
                  </strong>
                  <p>{nextFixture ? formatDate(nextFixture.date) : "Create a fixture to start"}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-grey" id="product">
          <div className="container powered-strip">
            <p className="eyebrow">Powered By</p>
            <div className="powered-marks" aria-label="Powered by stack">
              <span>Pears</span>
              <span className="powered-separator" aria-hidden="true">
                ·
              </span>
              <span>QVAC</span>
              <span className="powered-separator" aria-hidden="true">
                ·
              </span>
              <span>WDK</span>
            </div>
          </div>
        </section>

        <section className="section section-green">
          <div className="container">
            <div className="stats-grid">
              {stats.map((stat) => (
                <article className="stat-card" key={stat.label}>
                  <strong className="stat-value">{formatNumber(stat.value)}</strong>
                  <span className="stat-label">{stat.label}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-white" id="how-it-works">
          <div className="container split-section">
            <div>
              <p className="eyebrow">The league that does more</p>
              <h2 className="display-heading display-heading-medium">
                Calm software for
                <br />
                chaotic matchdays.
              </h2>
            </div>
            <ul className="check-list">
              {valueProps.map((item) => (
                <li key={item}>
                  <span className="check-glyph">+</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section-peach">
          <div className="container story-grid">
            {storyBlocks.map((story) => (
              <article className="story-block" key={story.number}>
                <span className="story-number">{story.number}</span>
                <h3>{story.title}</h3>
                <p>{story.body}</p>
                <a href="#app">{story.cta}</a>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white">
          <div className="container">
            <div className="section-heading">
              <p className="eyebrow">Use Cases</p>
              <h2 className="display-heading display-heading-medium">
                Play. Pay.
                <br />
                Predict. Recap.
              </h2>
            </div>
            <div className="use-case-grid">
              {useCases.map((item) => (
                <article className="use-case-card" key={item.eyebrow}>
                  <p className="eyebrow">{item.eyebrow}</p>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <a href="#app">Open the flow</a>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="stack-wrapper" id="the-stack">
          {stackBlocks.map((block) => (
            <section className={`section stack-block stack-${block.theme}`} key={block.eyebrow}>
              <div className="container stack-layout">
                <div>
                  <p className="eyebrow">{block.eyebrow}</p>
                  <h2 className="display-heading display-heading-medium">{block.title}</h2>
                </div>
                <p className="stack-copy">{block.body}</p>
              </div>
            </section>
          ))}
        </section>

        <section className="section section-grey" id="app">
          <div className="container app-shell">
            <div className="section-heading">
              <p className="eyebrow">App Screens</p>
              <h2 className="display-heading display-heading-medium">
                Get started,
                <br />
                then run the league.
              </h2>
            </div>

            <div className="app-grid">
              <section className="app-panel app-panel-large">
                <div className="app-panel-header">
                  <div>
                    <p className="eyebrow">Standings</p>
                    <h3>Table</h3>
                  </div>
                  <span className="sync-pill">Synced with {syncedPeers} peers</span>
                </div>
                <div className="table-scroll">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th>Club</th>
                        <th>P</th>
                        <th>W</th>
                        <th>D</th>
                        <th>L</th>
                        <th>GD</th>
                        <th>Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((team, index) => (
                        <tr key={team.id} className={index === 0 ? "leader-row" : undefined}>
                          <td className="club-cell">
                            <span className="jersey-avatar">
                              {jerseyColors[index % jerseyColors.length]}
                            </span>
                            <span>{team.name}</span>
                          </td>
                          <td>{team.played}</td>
                          <td>{team.won}</td>
                          <td>{team.drawn}</td>
                          <td>{team.lost}</td>
                          <td>{team.goalsFor - team.goalsAgainst}</td>
                          <td>{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="app-panel">
                <div className="app-panel-header">
                  <div>
                    <p className="eyebrow">Fixtures & Results</p>
                    <h3>Scoreboard</h3>
                  </div>
                </div>
                <div className="score-card-list">
                  {fixtures.map((fixture) => (
                    <article className="score-card" key={fixture.id}>
                      <div>
                        <strong>
                          {teamNames.get(fixture.home) ?? fixture.home} <span>—</span>{" "}
                          {teamNames.get(fixture.away) ?? fixture.away}
                        </strong>
                        <p>{formatDate(fixture.date)}</p>
                      </div>
                      <div className="score-chip">
                        {fixture.result
                          ? `${fixture.result.homeGoals} — ${fixture.result.awayGoals}`
                          : "vs"}
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="app-panel">
                <div className="app-panel-header">
                  <div>
                    <p className="eyebrow">Wallet & Prize Pot</p>
                    <h3>Self-custody</h3>
                  </div>
                </div>
                <div className="wallet-panel">
                  <strong>124.00 USDt</strong>
                  <p>Season pot total on testnet, visible to every organizer and contributor.</p>
                  <ul>
                    <li>Pitch fee paid by Red Foxes</li>
                    <li>Prize pot contribution by Dockside FC</li>
                    <li>Organizer custody remains local</li>
                  </ul>
                </div>
              </section>

              <section className="app-panel">
                <div className="app-panel-header">
                  <div>
                    <p className="eyebrow">Matchday Recap</p>
                    <h3>On-device report</h3>
                  </div>
                  <span className="offline-badge">Generated on-device · offline</span>
                </div>
                <div className="recap-card">
                  <h4>Team of the Week: Red Foxes</h4>
                  <p>
                    Red Foxes controlled the first half, converted early pressure into
                    three goals, and now top the table on goal difference.
                  </p>
                </div>
              </section>

              <section className="app-panel app-panel-wide">
                <div className="app-panel-header">
                  <div>
                    <p className="eyebrow">Create / Join League</p>
                    <h3>Shareable entry</h3>
                  </div>
                </div>
                <div className="join-layout">
                  <div>
                    <label className="field-label" htmlFor="league-name">
                      League name
                    </label>
                    <input id="league-name" value="Floodlights Sunday League" readOnly />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="league-link">
                      pear:// link
                    </label>
                    <input
                      id="league-link"
                      value="pear://kickabout/floodlights-sunday-league"
                      readOnly
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="section section-black">
          <div className="container cta-band">
            <div>
              <p className="eyebrow">Final word</p>
              <h2 className="display-heading display-heading-medium">
                Own your league.
              </h2>
            </div>
            <a className="button button-invert" href="#app">
              Get Started
            </a>
          </div>
        </section>
      </main>

      <footer className="footer-shell">
        <div className="container footer-layout">
          <span className="wordmark">KICKABOUT</span>
          <div className="footer-links">
            <a href="https://github.com">GitHub Repo</a>
            <a href="#product">Docs</a>
            <a href="https://dorahacks.io/hackathon/tether-developers-cup/detail">
              Tether Developers Cup
            </a>
          </div>
          <span className="footer-note">MIT License</span>
        </div>
      </footer>
    </div>
  );
};
