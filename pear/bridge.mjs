// KICKABOUT — local bridge.
//
// Runs the REAL peer node (PearEventStore over Corestore + Autobase + Hyperswarm)
// as a local process, and exposes it to the browser UI over a localhost
// WebSocket. There is NO cloud server: this process IS the peer, the browser is
// just its display. The UI stays a plain browser app while showing live P2P data.
//
//   Browser UI  ⇄  ws://localhost:8787  ⇄  this peer node  ⇄  DHT  ⇄  other peers
//
// Run:
//   npm run bridge            # create a new league, serve the UI
//   npm run bridge -- join <invite-key>
//
// Protocol (JSON):
//   server -> client: { type:'meta', role, invite, me, writable }
//                     { type:'events', events:[...] }
//   client -> server: { type:'append', event:{...} }
//                     { type:'addWriter', key:'hex' }

import { WebSocketServer } from "ws";
import { PearEventStore } from "./event-store.mjs";
import { seedEvents } from "./seed.mjs";
import { mkdirSync } from "node:fs";
import { join as pathJoin } from "node:path";

const PORT = Number(process.env.KICKABOUT_BRIDGE_PORT || 8787);

const argv = process.argv.slice(2);
const role = argv[0] === "join" ? "join" : "create";
const bootstrap = role === "join" ? argv[1] : null;

if (role === "join" && !bootstrap) {
  console.error("Usage: npm run bridge -- join <league-invite-key>");
  process.exit(1);
}

const storageDir = pathJoin(process.cwd(), ".kickabout-data", `bridge-${role}`);
mkdirSync(storageDir, { recursive: true });

const store = new PearEventStore({ storageDir, bootstrap });
await store.ready();

// A freshly created league starts empty — seed a sample season so the web UI has
// a populated table to show (and to demo posting a result that syncs out).
if (role === "create" && (await store.load()).length === 0) {
  for (const event of seedEvents()) {
    await store.append(event);
  }
}

const meta = async () => ({
  type: "meta",
  role,
  invite: await store.invite(),
  me: store.localWriterKey,
  writable: store.writable
});

const wss = new WebSocketServer({ port: PORT });
console.log(`⚽ KICKABOUT bridge on ws://localhost:${PORT}`);
console.log(`   role:   ${role}`);
console.log(`   invite: ${await store.invite()}`);
console.log(`   me:     ${store.localWriterKey}`);
console.log(`   open the web UI (npm run dev) — it will connect automatically.`);

const broadcast = (msg) => {
  const data = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(data);
  }
};

// Push live event-log updates (and refreshed meta, since writable can change) to
// every connected browser.
store.subscribe(async (events) => {
  broadcast({ type: "events", events });
  broadcast(await meta());
});

wss.on("connection", async (socket) => {
  socket.send(JSON.stringify(await meta()));
  socket.send(JSON.stringify({ type: "events", events: await store.load() }));

  socket.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    try {
      if (msg.type === "append") {
        await store.append(msg.event);
      } else if (msg.type === "addWriter") {
        await store.addWriter(msg.key);
        broadcast(await meta());
      }
    } catch (err) {
      socket.send(JSON.stringify({ type: "error", message: err.message }));
    }
  });
});

// Join the DHT (best-effort) so this peer syncs with the terminal node / other devices.
store.join().catch((err) => console.log("swarm join pending:", err.message));

const shutdown = async () => {
  await store.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
