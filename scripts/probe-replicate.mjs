// No-network probe: two peers, multi-writer Autobase, replicated by piping
// replication streams directly (Hyperswarm would supply this transport over the
// internet). Proves that both peers converge to the same LeagueEvent log.
import Corestore from "corestore";
import Autobase from "autobase";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dirA = mkdtempSync(join(tmpdir(), "kickabout-A-"));
const dirB = mkdtempSync(join(tmpdir(), "kickabout-B-"));

const handlers = {
  valueEncoding: "json",
  open(viewStore) {
    return viewStore.get("league-log", { valueEncoding: "json" });
  },
  async apply(nodes, view, host) {
    for (const node of nodes) {
      const value = node.value;
      if (value && value.type === "add-writer") {
        await host.addWriter(Buffer.from(value.key, "hex"), { indexer: true });
        continue;
      }
      await view.append(value);
    }
  }
};

const storeA = new Corestore(dirA);
const baseA = new Autobase(storeA, null, handlers);
await baseA.ready();

// Peer B bootstraps from A's autobase key (this is what the pear:// link carries).
const storeB = new Corestore(dirB);
const baseB = new Autobase(storeB, baseA.key, handlers);
await baseB.ready();

// Wire live replication between the two stores (stands in for Hyperswarm).
const s1 = storeA.replicate(true);
const s2 = storeB.replicate(false);
s1.pipe(s2).pipe(s1);

// Organizer A creates the league and adds B as a co-writer.
await baseA.append({ type: "league", name: "Floodlights Sunday League", createdAt: 0 });
await baseA.append({ type: "add-writer", key: baseB.local.key.toString("hex") });
await baseA.append({ type: "team", id: "red-foxes", name: "Red Foxes" });

const settle = async () => {
  for (let i = 0; i < 30; i++) {
    await baseA.update();
    await baseB.update();
    await new Promise((r) => setTimeout(r, 50));
  }
};
await settle();

// Now B is a writer and posts a result from its own device.
await baseB.append({ type: "team", id: "dockside-fc", name: "Dockside FC" });
await baseB.append({ type: "fixture", id: "fx-1", home: "red-foxes", away: "dockside-fc", date: 1 });
await baseB.append({ type: "result", fixtureId: "fx-1", homeGoals: 2, awayGoals: 0, recordedAt: 2 });
await settle();

const read = async (base) => {
  const out = [];
  for (let i = 0; i < base.view.length; i++) out.push(await base.view.get(i));
  return out;
};

const a = await read(baseA);
const b = await read(baseB);
console.log("Peer A sees", a.length, "events");
console.log("Peer B sees", b.length, "events");
const converged =
  JSON.stringify(a.map((e) => e.type)) === JSON.stringify(b.map((e) => e.type)) &&
  a.some((e) => e.type === "result") &&
  b.some((e) => e.id === "red-foxes");
console.log("A event types:", a.map((e) => e.type).join(", "));
console.log("B event types:", b.map((e) => e.type).join(", "));

await baseA.close();
await baseB.close();
rmSync(dirA, { recursive: true, force: true });
rmSync(dirB, { recursive: true, force: true });

console.log(converged ? "OK: peers converged (multi-writer sync works)." : "FAIL: peers diverged.");
process.exit(converged ? 0 : 1);
