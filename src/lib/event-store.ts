import { loadEvents, saveEvents } from "./storage";
import type { LeagueEvent } from "../types";

export type EventListener = (events: LeagueEvent[]) => void;

/**
 * Backend-agnostic league event log. The UI derives everything (standings,
 * fixtures) from `load()` and re-renders on `subscribe()` — so the same UI runs
 * on the browser (`LocalEventStore`) or on real peer-to-peer sync
 * (`PearEventStore`, under the Pear/Bare runtime — see `pear/event-store.mjs`).
 */
export interface EventStore {
  ready(): Promise<void>;
  load(): Promise<LeagueEvent[]>;
  append(event: LeagueEvent): Promise<LeagueEvent[]>;
  subscribe(listener: EventListener): () => void;
  /** Shareable league identifier — the payload behind a `pear://` invite link. */
  invite(): Promise<string>;
  close(): Promise<void>;
}

/**
 * Browser/dev store. Persists the log to localStorage and notifies subscribers
 * in-process. Async-shaped so it is drop-in interchangeable with PearEventStore.
 */
export class LocalEventStore implements EventStore {
  private events: LeagueEvent[];
  private readonly listeners = new Set<EventListener>();

  constructor() {
    this.events = loadEvents();
  }

  async ready(): Promise<void> {}

  async load(): Promise<LeagueEvent[]> {
    return this.events;
  }

  async append(event: LeagueEvent): Promise<LeagueEvent[]> {
    this.events = [...this.events, event];
    saveEvents(this.events);
    this.emit();
    return this.events;
  }

  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async invite(): Promise<string> {
    return "pear://kickabout/floodlights-sunday-league";
  }

  async close(): Promise<void> {
    this.listeners.clear();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.events);
    }
  }
}
