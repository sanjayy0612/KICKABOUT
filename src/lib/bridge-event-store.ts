import type { EventStore, EventListener } from "./event-store";
import type { LeagueEvent } from "../types";

export type BridgeMeta = {
  role: "create" | "join";
  invite: string;
  me: string;
  writable: boolean;
};

export type MetaListener = (meta: BridgeMeta) => void;

/**
 * Browser-side EventStore that talks to the local bridge (pear/bridge.mjs) over a
 * localhost WebSocket. The bridge runs the real peer node (Corestore + Autobase +
 * Hyperswarm), so the UI shows live peer-to-peer data with no cloud server.
 *
 * Use `BridgeEventStore.connect(url)` — it resolves once connected and the first
 * event snapshot has arrived, and rejects (so the app can fall back to
 * LocalEventStore) if the bridge is not running.
 */
export class BridgeEventStore implements EventStore {
  private socket: WebSocket;
  private events: LeagueEvent[] = [];
  private meta: BridgeMeta | null = null;
  private readonly listeners = new Set<EventListener>();
  private readonly metaListeners = new Set<MetaListener>();

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => this.onMessage(event));
  }

  static connect(url = "ws://localhost:8787", timeoutMs = 1500): Promise<BridgeEventStore> {
    return new Promise((resolve, reject) => {
      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch (err) {
        reject(err);
        return;
      }

      const store = new BridgeEventStore(socket);
      const timer = window.setTimeout(() => {
        socket.close();
        reject(new Error("bridge connection timed out"));
      }, timeoutMs);

      const onFirstSnapshot = () => {
        window.clearTimeout(timer);
        resolve(store);
      };
      // Resolve as soon as the first events snapshot lands.
      store.once = onFirstSnapshot;

      socket.addEventListener("error", () => {
        window.clearTimeout(timer);
        reject(new Error("bridge unreachable"));
      });
    });
  }

  private once: (() => void) | null = null;

  private onMessage(event: MessageEvent): void {
    let msg: { type: string; events?: LeagueEvent[]; error?: string } & Partial<BridgeMeta>;
    try {
      msg = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (msg.type === "events" && Array.isArray(msg.events)) {
      this.events = msg.events;
      this.emit();
      if (this.once) {
        this.once();
        this.once = null;
      }
    } else if (msg.type === "meta") {
      this.meta = {
        role: (msg.role as BridgeMeta["role"]) ?? "create",
        invite: msg.invite ?? "",
        me: msg.me ?? "",
        writable: Boolean(msg.writable)
      };
      for (const listener of this.metaListeners) listener(this.meta);
    }
  }

  async ready(): Promise<void> {}

  async load(): Promise<LeagueEvent[]> {
    return this.events;
  }

  async append(event: LeagueEvent): Promise<LeagueEvent[]> {
    this.send({ type: "append", event });
    return this.events;
  }

  /** Organizer approves a joining peer's writer key. */
  async addWriter(key: string): Promise<void> {
    this.send({ type: "addWriter", key });
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  subscribeMeta(listener: MetaListener): () => void {
    this.metaListeners.add(listener);
    if (this.meta) listener(this.meta);
    return () => this.metaListeners.delete(listener);
  }

  getMeta(): BridgeMeta | null {
    return this.meta;
  }

  async invite(): Promise<string> {
    return this.meta?.invite ?? "";
  }

  async close(): Promise<void> {
    this.socket.close();
    this.listeners.clear();
    this.metaListeners.clear();
  }

  private send(msg: unknown): void {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(msg));
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.events);
  }
}
