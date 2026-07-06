// No-network probe: verifies Autobase runs in this runtime and that the
// append -> materialized-log pipeline produces an ordered LeagueEvent[].
import Corestore from "corestore";
import Autobase from "autobase";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "kickabout-probe-"));
const store = new Corestore(dir);

const base = new Autobase(store, null, {
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
});

await base.ready();

await base.append({ type: "team", id: "red-foxes", name: "Red Foxes" });
await base.append({ type: "team", id: "dockside-fc", name: "Dockside FC" });
await base.append({ type: "fixture", id: "fx-1", home: "red-foxes", away: "dockside-fc", date: 1 });
await base.append({ type: "result", fixtureId: "fx-1", homeGoals: 3, awayGoals: 1, recordedAt: 2 });

await base.update();

const events = [];
for (let i = 0; i < base.view.length; i++) {
  events.push(await base.view.get(i));
}

console.log("Materialized events:", events.length);
console.log(JSON.stringify(events, null, 2));
console.log("localWriterKey:", base.local.key.toString("hex").slice(0, 16), "...");

await base.close();
rmSync(dir, { recursive: true, force: true });
console.log("OK: Autobase runs here.");
