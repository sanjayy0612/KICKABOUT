// Connects to the running bridge as a browser would, verifies it receives meta +
// events, posts a result through the socket, and confirms the standings come back.
import WebSocket from "ws";

const PORT = process.env.KICKABOUT_BRIDGE_PORT || 8787;
const ws = new WebSocket(`ws://localhost:${PORT}`);

let gotMeta = false;
let events = [];

const done = (ok, note) => {
  console.log(note);
  ws.close();
  process.exit(ok ? 0 : 1);
};

ws.on("open", () => {
  // Post a team, fixture, and result — as the UI would.
  setTimeout(() => {
    ws.send(JSON.stringify({ type: "append", event: { type: "team", id: "red-foxes", name: "Red Foxes" } }));
    ws.send(JSON.stringify({ type: "append", event: { type: "team", id: "dockside", name: "Dockside FC" } }));
    ws.send(JSON.stringify({ type: "append", event: { type: "fixture", id: "fx1", home: "red-foxes", away: "dockside", date: 1 } }));
    ws.send(JSON.stringify({ type: "append", event: { type: "result", fixtureId: "fx1", homeGoals: 3, awayGoals: 1, recordedAt: 2 } }));
  }, 200);
});

ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  if (msg.type === "meta") {
    gotMeta = true;
    console.log("meta:", { role: msg.role, writable: msg.writable, invite: msg.invite.slice(0, 12) + "..." });
  }
  if (msg.type === "events") {
    events = msg.events;
    const hasResult = events.some((e) => e.type === "result");
    if (hasResult) {
      console.log("events received:", events.map((e) => e.type).join(", "));
      done(gotMeta && hasResult, gotMeta ? "OK: bridge round-trip works (meta + live events)." : "FAIL: no meta");
    }
  }
});

ws.on("error", (err) => done(false, "FAIL: " + err.message));
setTimeout(() => done(false, "FAIL: timed out"), 8000);
