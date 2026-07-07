// KICKABOUT — Pear terminal app.
//
// A real peer-to-peer league node: create or join a league, sync over Hyperswarm
// with no server, and watch the standings converge live across peers.
//
// Runs two ways:
//   • Node (easiest to test):   npm run pear:create        /   npm run pear:join -- <key>
//   • Pear runtime (the track): pear run --dev . create    /   pear run --dev . join <key>
//
// Two-terminal demo:
//   1) Terminal A:  npm run pear:create           -> prints the league invite key
//   2) Terminal B:  npm run pear:join -- <key>     -> prints its writer key ("me")
//   3) Terminal A:  writer <B's key>               -> approves B as a co-writer
//   4) Either side: team / fixture / result        -> both tables update live, no server

import { PearEventStore } from "./event-store.mjs";
import { renderStandings } from "./league.mjs";
import { mkdirSync } from "node:fs";
import { join as pathJoin } from "node:path";

const isPear = typeof Pear !== "undefined";
const argv = isPear ? Pear.config.args : process.argv.slice(2);

const role = argv[0] === "join" ? "join" : "create";
const bootstrap = role === "join" ? argv[1] : null;

if (role === "join" && !bootstrap) {
  console.error("Usage: join <league-invite-key>");
  if (!isPear) process.exit(1);
}

// Storage: Pear gives each app an isolated dir; under Node keep peers separate.
let storageDir;
if (isPear) {
  storageDir = Pear.config.storage;
} else {
  storageDir = pathJoin(process.cwd(), ".kickabout-data", role);
  mkdirSync(storageDir, { recursive: true });
}

const store = new PearEventStore({ storageDir, bootstrap });
await store.ready();

const inviteKey = await store.invite();

function render(events) {
  const lines = [];
  lines.push("");
  lines.push("⚽  KICKABOUT — serverless league node");
  lines.push("─".repeat(52));
  lines.push(`role:    ${role}`);
  lines.push(`invite:  ${inviteKey}`);
  lines.push(`me:      ${store.localWriterKey}`);
  lines.push(`writer:  ${store.writable ? "yes (can post results)" : "no (ask organizer to approve 'me')"}`);
  lines.push("─".repeat(52));
  lines.push(renderStandings(events));
  lines.push("─".repeat(52));
  lines.push("commands: team <id> <name> | fixture <id> <home> <away> | result <fxId> <h> <a> | writer <key> | quit");
  console.log(lines.join("\n"));
}

store.subscribe(render);
render(await store.load());

// Join the DHT and start replicating with peers (best-effort; the node stays
// usable offline and begins syncing as soon as the network is reachable).
// Set KICKABOUT_NO_SWARM=1 to run fully offline (used by smoke tests).
const noSwarm = !isPear && process.env.KICKABOUT_NO_SWARM === "1";
if (!noSwarm) {
  store.join().catch((err) => console.log("swarm join pending:", err.message));
}

async function run(line) {
  const [cmd, ...rest] = line.trim().split(/\s+/);
  try {
    if (cmd === "team") {
      await store.append({ type: "team", id: rest[0], name: rest.slice(1).join(" ") });
    } else if (cmd === "fixture") {
      await store.append({ type: "fixture", id: rest[0], home: rest[1], away: rest[2], date: Date.now() });
    } else if (cmd === "result") {
      await store.append({
        type: "result",
        fixtureId: rest[0],
        homeGoals: Number(rest[1]),
        awayGoals: Number(rest[2]),
        recordedAt: Date.now()
      });
    } else if (cmd === "writer") {
      await store.addWriter(rest[0]);
    } else if (cmd === "quit" || cmd === "exit") {
      await store.close();
      if (!isPear) process.exit(0);
    } else if (cmd) {
      console.log(`unknown command: ${cmd}`);
    }
  } catch (err) {
    console.log("error:", err.message);
  }
}

// Command loop under Node — works with an interactive TTY or piped input.
// Under Pear, drive via args or the desktop UI (see docs/pear-integration.md).
if (!isPear) {
  const { createInterface } = await import("node:readline");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  if (process.stdin.isTTY) {
    rl.setPrompt("kickabout> ");
    rl.prompt();
  }
  // Serialize commands so each append fully settles before the next runs
  // (important when input is piped and lines arrive back-to-back).
  let queue = Promise.resolve();
  rl.on("line", (line) => {
    queue = queue.then(async () => {
      await run(line);
      if (process.stdin.isTTY) rl.prompt();
    });
  });
  rl.on("close", () => {
    queue = queue.then(async () => {
      await store.close();
      process.exit(0);
    });
  });
}
