import { seedEvents } from "./sample-data";
import type { LeagueEvent } from "../types";

const STORAGE_KEY = "kickabout.league.events";

export const loadEvents = (): LeagueEvent[] => {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return seedEvents;
  }

  try {
    return JSON.parse(raw) as LeagueEvent[];
  } catch {
    return seedEvents;
  }
};

export const saveEvents = (events: LeagueEvent[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
};
