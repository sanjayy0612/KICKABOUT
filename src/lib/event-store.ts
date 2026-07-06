import { loadEvents, saveEvents } from "./storage";
import type { LeagueEvent } from "../types";

export interface EventStore {
  load(): LeagueEvent[];
  append(event: LeagueEvent): LeagueEvent[];
  replace(events: LeagueEvent[]): LeagueEvent[];
}

export class LocalEventStore implements EventStore {
  private events: LeagueEvent[];

  constructor() {
    this.events = loadEvents();
  }

  load() {
    return this.events;
  }

  append(event: LeagueEvent) {
    this.events = [...this.events, event];
    saveEvents(this.events);
    return this.events;
  }

  replace(events: LeagueEvent[]) {
    this.events = events;
    saveEvents(this.events);
    return this.events;
  }
}
