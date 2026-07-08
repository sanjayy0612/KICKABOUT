# KICKABOUT ⚽

**The serverless, self-custody league manager for community football.**

[![License: MIT](https://img.shields.io/badge/license-MIT-black)](LICENSE)
![Stack](https://img.shields.io/badge/stack-React%20%C2%B7%20TypeScript%20%C2%B7%20Vite-094D17)
![Track](https://img.shields.io/badge/tracks-Pears%20%C2%B7%20QVAC%20%C2%B7%20WDK-094D17)

Every Sunday league runs on the same broken stack: a chaotic group chat, a spreadsheet
nobody fully trusts, and someone chasing teammates for pitch-fee cash. KICKABOUT
replaces all three with one football-native app built on a single source of truth — a
peer-to-peer event log — with no backend server, no bank, and no cloud dependency.

Built for the **Tether Developers Cup** — Theme: football · Tracks: **Pears + QVAC + WDK**.

> 🎥 Demo script: [docs/video_script.md](docs/video_script.md) · Full plan:
> [PLAN.md](PLAN.md) · Design system: [FRONTEND.md](FRONTEND.md)

---

## 60-second read for judges

1. **The event log is the product.** Every league action — team added, fixture set,
   result posted — is one entry in an append-only `LeagueEvent` log. Standings are never
   typed in; they're a deterministic fold over that log
   ([src/lib/league.ts](src/lib/league.ts)). Same events → same table, on every device,
   every time.
2. **Pears sync is real and running today**, not a roadmap slide. Corestore, Autobase,
   and Hyperswarm merge multiple peers into one converged log with zero servers.
   Automated proof: `npm run test:p2p`. Live proof: two terminals, two peers, one
   demo — see [Run it](#run-it) below.
3. **One log, three tracks.** The same event stream is the seam for peer sync (Pears),
   on-device recap generation (QVAC), and self-custody pitch-fee/prize-pot payments
   (WDK). Remove any one track and the app genuinely breaks — it isn't bolted on for
   scoring.
4. **We under-claim on purpose.** The status table below is deliberately honest about
   what's wired up vs. what's next, because a judge finding a false claim costs more
   than a modest one.

---

## What's implemented in this cut

| Layer | Status |
|---|---|
| Deterministic standings/fixtures fold | ✅ Done — pure, tested via `league.ts` |
| Editorial React/TS/Vite frontend | ✅ Done — see [FRONTEND.md](FRONTEND.md) |
| Local event store (browser demo) | ✅ Done — `src/lib/event-store.ts` |
| **Pear event store** — Corestore + Autobase + Hyperswarm | ✅ Working — `pear/event-store.mjs` |
| Multi-writer convergence (two peers → one log) | ✅ Verified — `npm run test:p2p` |
| Browser UI ↔ real P2P bridge (local WebSocket) | ✅ Working — `pear/bridge.mjs` |
| Write-access control (organizer approves co-writers) | ✅ Working — CLI `writer <key>` or in-app approval field |
| Live two-device DHT holepunch demo | ⏳ Runs on your machine, not automated in CI |
| QVAC on-device matchday recaps | 🔜 Next — seam is the same event log |
| WDK self-custody pitch fees + prize pot | 🔜 Next — seam is the same event log |

Anything marked 🔜 is a real next step on an already-wired seam, not vaporware.

---

## Architecture

```
Browser UI (React/TS)              Terminal / Pear runtime
     │                                     │
     ▼                                     ▼
BridgeEventStore  ──WebSocket──►   PearEventStore
(src/lib)                          (Corestore + Autobase + Hyperswarm)
     │                                     │
     └──────────── same EventStore interface ────────────┘
                          │
                 append-only LeagueEvent log
                          │
                 pure standings/fixtures fold
```

The UI only ever knows about the `EventStore` interface (`ready / load / append /
subscribe / invite / close`) — swapping `LocalEventStore` for real peer-to-peer sync is a
one-line change, and the standings logic doesn't know or care which one is behind it.

---

## Run it

### Web demo (fastest way to see the UI)

```bash
npm install
npm run dev
```

This alone uses `LocalEventStore` (browser localStorage) — great for exploring the UI,
but single-device only. For the real Pears-track proof, use one of the two flows below.

### Real peer-to-peer demo — browser (the actual Pears-track proof)

Each `bridge` process is a real peer (Corestore + Autobase + Hyperswarm); the browser is
just its display over a localhost WebSocket.

```bash
# Terminal A — creates the league, auto-seeds a sample season, prints an invite key
npm run bridge

# Terminal B — joins with that invite key, prints its own writer ("me") key
npm run bridge -- join <invite-key-from-A>

# Both — open the web UI, each tab connects to its own local bridge automatically
npm run dev
```

A freshly *created* league auto-seeds 4 teams / 3 fixtures / 2 results (Floodlights
Sunday League), so tab A shows a populated table immediately. Tab B joins **read-only**
until approved — in the UI, open the league panel, copy B's writer key from
"Your writer key," paste it into A's "Approve a peer's writer key" field. Once approved,
add a team / create a fixture / post a result in either tab and watch it appear live in
the other. No server in between.

> **Running both peers on one machine:** both bridges default to port 8787, so the
> second one errors with `EADDRINUSE` unless separated:
> ```bash
> KICKABOUT_BRIDGE_PORT=8788 npm run bridge -- join <invite-key>
> ```
> then open that tab at `http://localhost:5173/?bridge=ws://localhost:8788` (leave
> tab A as plain `http://localhost:5173`). Two real devices don't need this — each
> uses its own default port. Never open `localhost:8787`/`8788` directly in the
> browser — those are raw WebSocket ports, not pages; always load the app through
> the Vite port (`5173`).

### Real peer-to-peer demo — terminal only (raw event log, no browser)

Same underlying store, driven as plain commands — good for showing the log itself:

```bash
# Terminal A — creates the league
npm run pear:create
#   -> prints an `invite:` key

# Terminal B — joins with that key
npm run pear:join -- <invite-key-from-A>
#   -> prints its own `me:` writer key

# Terminal A — approve B as a co-writer (use B's `me` key, NOT your own)
writer <B's me-key>

# Now, in either terminal:
team red-foxes Red Foxes
team dockside-fc Dockside FC
fixture fx1 red-foxes dockside-fc
result fx1 3 1
```

Both terminals' standings tables update immediately. `quit` / `exit` closes a node
cleanly. The same program also runs under the real Pear runtime (the actual track
requirement, no Node needed):

```bash
npm i -g pear
pear run --dev . create
pear run --dev . join <invite-key>
```

Full architecture, protocol details, and what's automated-verified vs. what needs a live
run: [docs/pear-integration.md](docs/pear-integration.md).

### Other commands

```bash
npm run build       # production build (tsc -b && vite build)
npm run preview     # preview the production build locally
npm run test:p2p    # automated, no-network Autobase multi-writer convergence probe
```

---

## Troubleshooting (things we actually hit while demoing)

| Symptom | Cause | Fix |
|---|---|---|
| `Error: listen EADDRINUSE: address already in use :::8787` | Two bridges on one machine both default to port 8787 | Start the second with `KICKABOUT_BRIDGE_PORT=8788 npm run bridge -- join <key>`, then open that tab at `?bridge=ws://localhost:8788` |
| `This site can't be reached` at `localhost:8787` | Opened the raw WebSocket port directly in the browser | Always load the app at the Vite port (`localhost:5173`), never the bridge port |
| `error: This peer is not a writer yet` after running `writer <key>` | Approved the wrong key — usually the organizer's own `me`/`invite` key instead of the joining peer's `me` key | Re-run `writer <key>` using the **other** peer's `me:` value, not your own |
| Browser tab shows an empty table on join | Normal — only a freshly *created* league auto-seeds sample data; a joined league starts with whatever's already in the log | Not a bug; add data from either peer once writer access is approved |

---

## Stack

| Track | Package | Role |
|---|---|---|
| 🍐 Pears | `autobase`, `corestore`, `hyperswarm`, `hypercore` | Serverless multi-writer league log |
| 🧠 QVAC | `@qvac/sdk` | On-device matchday recaps, no cloud |
| 🔐 WDK | `@tetherto/wdk` | Self-custody pitch fees + prize pot in USDt |

Frontend: React + TypeScript + Vite, with a domain-first event log and pure standings
fold underneath.

---

## Judging-criteria map

| Criterion | How KICKABOUT scores |
|---|---|
| Technical ambition | P2P multi-writer state (Autobase) + on-device AI + self-custody payments |
| User experience | Replaces group-chat + spreadsheet + cash-chasing with one app |
| Real-world use | Millions of community teams; emerging-market painkiller (no server, no bank) |
| Creativity | Serverless + crypto-native + local-AI league — this combination doesn't exist elsewhere |
| Real use of track(s) | Each stack is load-bearing; remove any one and the app breaks |

Full detail, roadmap, and risk mitigation: [PLAN.md](PLAN.md).

---

## Repo map

- [PLAN.md](PLAN.md) — vision, roadmap, judging-criteria mapping
- [FRONTEND.md](FRONTEND.md) — design system source of truth
- [docs/pear-integration.md](docs/pear-integration.md) — what's real vs. what needs a live run
- [docs/phase1-demo.md](docs/phase1-demo.md) — 3-minute demo narrative
- [docs/video_script.md](docs/video_script.md) — talking-point script for the demo video
- [docs/so_far_completed.md](docs/so_far_completed.md) — handoff notes for collaborators
- `src/lib/league.ts` — deterministic standings/fixtures fold
- `src/lib/event-store.ts` / `src/lib/bridge-event-store.ts` — storage seam
- `pear/` — real P2P node (Corestore + Autobase + Hyperswarm) and the browser bridge

## License

MIT — see [LICENSE](LICENSE).
