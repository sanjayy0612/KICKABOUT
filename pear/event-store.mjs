// PearEventStore — the REAL peer-to-peer league log.
//
// Storage:      Corestore (append-only Hypercores on disk)
// Log + merge:  Autobase (multi-writer; every peer converges to one ordered log)
// Transport:    Hyperswarm (finds peers over the DHT and replicates, no server)
//
// Runs under the Pear/Bare runtime (or Node). It intentionally implements the
// same shape as src/lib/event-store.ts's EventStore, so the UI is identical
// whether it talks to localStorage or to real peers.
//
// A LeagueEvent is a plain JSON object, one of:
//   { type:'league',  name, createdAt }
//   { type:'team',    id, name }
//   { type:'fixture', id, home, away, date }
//   { type:'result',  fixtureId, homeGoals, awayGoals, recordedAt }
//   { type:'payment', from, amount, txid }
// Plus an internal control record { type:'add-writer', key } that is applied to
// grant a peer write access and is NOT surfaced as a league event.

import Corestore from "corestore";
import Autobase from "autobase";
import Hyperswarm from "hyperswarm";
import crypto from "hypercore-crypto";

export class PearEventStore {
  /**
   * @param {object} opts
   * @param {string} opts.storageDir  Corestore directory (per-app, e.g. Pear.config.storage)
   * @param {string|null} [opts.bootstrap]  hex league key to JOIN an existing league;
   *                                         omit/null to CREATE a new one.
   */
  constructor({ storageDir, bootstrap = null }) {
    this.store = new Corestore(storageDir);
    this.bootstrap = bootstrap ? Buffer.from(bootstrap, "hex") : null;
    this.swarm = null;
    this.listeners = new Set();

    this.base = new Autobase(this.store, this.bootstrap, {
      valueEncoding: "json",
      open: (viewStore) => viewStore.get("league-log", { valueEncoding: "json" }),
      apply: async (nodes, view, host) => {
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

    this.base.on("update", () => {
      this._emit().catch(() => {});
    });
  }

  async ready() {
    await this.base.ready();
  }

  /** Join the league's DHT topic and replicate with any peers found. Needs network. */
  async join() {
    if (this.swarm) return;
    this.swarm = new Hyperswarm();
    this.swarm.on("connection", (conn) => this.store.replicate(conn));
    const topic = crypto.discoveryKey(this.base.key);
    const discovery = this.swarm.join(topic, { server: true, client: true });
    await discovery.flushed();
  }

  /** Raw replication stream — used by tests to wire two stores without a network. */
  replicate(isInitiator) {
    return this.store.replicate(isInitiator);
  }

  async load() {
    await this.base.update();
    const events = [];
    for (let i = 0; i < this.base.view.length; i++) {
      events.push(await this.base.view.get(i));
    }
    return events;
  }

  async append(event) {
    if (!this.base.writable) {
      throw new Error(
        "This peer is not a writer yet. The organizer must approve it with addWriter(localWriterKey)."
      );
    }
    await this.base.append(event);
    return this.load();
  }

  /** Organizer grants a joining peer write access, by their localWriterKey. */
  async addWriter(hexWriterKey) {
    await this.base.append({ type: "add-writer", key: hexWriterKey });
  }

  /** This peer's writer key — a joiner sends this to the organizer to be approved. */
  get localWriterKey() {
    return this.base.local.key.toString("hex");
  }

  get writable() {
    return this.base.writable;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** The shareable league key — the payload behind a `pear://` invite link. */
  async invite() {
    return this.base.key.toString("hex");
  }

  async close() {
    if (this.swarm) await this.swarm.destroy();
    await this.base.close();
    await this.store.close();
  }

  async _emit() {
    const events = await this.load();
    for (const listener of this.listeners) listener(events);
  }
}
