// Exercises the real PearEventStore class with two instances wired by piped
// replication streams (Hyperswarm supplies this transport over the internet).
// Proves create/join, organizer-approves-writer, append, live subscribe, and
// convergence — all without a network.
import { PearEventStore } from "../pear/event-store.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dirA = mkdtempSync(join(tmpdir(), "kickabout-store-A-"));
const dirB = mkdtempSync(join(tmpdir(), "kickabout-store-B-"));

// Organizer creates the league.
const organizer = new PearEventStore({ storageDir: dirA });
await organizer.ready();
const leagueKey = await organizer.invite();
console.log("League invite key:", leagueKey.slice(0, 16), "...");

// Player joins using the invite key.
const player = new PearEventStore({ storageDir: dirB, bootstrap: leagueKey });
await player.ready();

// Wire replication (stands in for Hyperswarm) — two streams, piped both ways.
const streamA = organizer.replicate(true);
const streamB = player.replicate(false);
streamA.pipe(streamB).pipe(streamA);

let playerSawResult = false;
player.subscribe((events) => {
  if (events.some((e) => e.type === "result")) playerSawResult = true;
});

const settle = async () => {
  for (let i = 0; i < 30; i++) {
    await organizer.load();
    await player.load();
    await new Promise((r) => setTimeout(r, 50));
  }
};

// Organizer sets up the league and approves the player as a co-writer.
await organizer.append({ type: "league", name: "Floodlights Sunday League", createdAt: 0 });
await organizer.append({ type: "team", id: "red-foxes", name: "Red Foxes" });
await organizer.addWriter(player.localWriterKey);
await settle();

console.log("player.writable after approval:", player.writable);

// Player posts a fixture + result from their own device.
await player.append({ type: "team", id: "dockside-fc", name: "Dockside FC" });
await player.append({ type: "fixture", id: "fx-1", home: "red-foxes", away: "dockside-fc", date: 1 });
await player.append({ type: "result", fixtureId: "fx-1", homeGoals: 2, awayGoals: 0, recordedAt: 2 });
await settle();

const a = (await organizer.load()).map((e) => e.type);
const b = (await player.load()).map((e) => e.type);
console.log("Organizer log:", a.join(", "));
console.log("Player log:   ", b.join(", "));

const converged =
  JSON.stringify(a) === JSON.stringify(b) &&
  a.includes("result") &&
  playerSawResult;

await organizer.close();
await player.close();
rmSync(dirA, { recursive: true, force: true });
rmSync(dirB, { recursive: true, force: true });

console.log(
  converged
    ? "OK: PearEventStore create/join/approve/append/subscribe/converge all work."
    : "FAIL: stores did not converge."
);
process.exit(converged ? 0 : 1);
