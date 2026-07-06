# KICKABOUT

KICKABOUT is a football-native league manager for community teams. This Phase 1 repo
implements the deterministic event log, fixtures/results flow, and live standings
surface described in `PLAN.md`, with the sync and payments boundaries left ready for
Pears, QVAC, and WDK integration.

## What is in this cut

- Single-writer organizer workflow for adding teams, fixtures, and results
- Deterministic standings table derived from the append-only `LeagueEvent` log
- Floodlights-themed dashboard for a judge-friendly hackathon demo
- Local persistence so the app survives refresh while the P2P transport is still being wired
- A clean adapter boundary for swapping local storage with a Pear-backed shared log

## Stack

- React + TypeScript + Vite
- Domain-first event log and pure standings fold

## Run locally

1. Install dependencies with `npm install`
2. Start the dev server with `npm run dev`
3. Build with `npm run build`

## Repo checklist progress

- `PLAN.md` translated into a working Phase 1 app shell
- `README.md` and [docs/phase1-demo.md](docs/phase1-demo.md) added for judges
- `MIT` license included for submission readiness

## Next integrations

- Pears transport behind the event log store for peer sync
- QVAC recap generation over recorded match results
- WDK pitch-fee and prize-pot flows in USDt testnet
