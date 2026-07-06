import { seedEvents } from "./sample-data";
import type { LeagueEvent } from "../types";

const STORAGE_KEY = "kickabout.league.snapshot";
const STORAGE_VERSION = "2026-07-06-demo-v1";

type StoredSnapshot = {
  version: string;
  events: LeagueEvent[];
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isLeagueEvent = (value: unknown): value is LeagueEvent => {
  if (!isObject(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "league":
      return typeof value.name === "string" && typeof value.createdAt === "number";
    case "team":
      return typeof value.id === "string" && typeof value.name === "string";
    case "fixture":
      return (
        typeof value.id === "string" &&
        typeof value.home === "string" &&
        typeof value.away === "string" &&
        typeof value.date === "number"
      );
    case "result":
      return (
        typeof value.fixtureId === "string" &&
        typeof value.homeGoals === "number" &&
        typeof value.awayGoals === "number" &&
        typeof value.recordedAt === "number"
      );
    case "payment":
      return (
        typeof value.from === "string" &&
        typeof value.amount === "string" &&
        typeof value.txid === "string"
      );
    default:
      return false;
  }
};

const hasValidDemoGraph = (events: LeagueEvent[]) => {
  const teams = new Set(events.filter((event) => event.type === "team").map((event) => event.id));
  const fixtures = new Map(
    events
      .filter((event): event is Extract<LeagueEvent, { type: "fixture" }> => event.type === "fixture")
      .map((event) => [event.id, event])
  );

  if (teams.size < 4 || fixtures.size < 2) {
    return false;
  }

  for (const event of events) {
    if (event.type === "fixture") {
      if (!teams.has(event.home) || !teams.has(event.away) || event.home === event.away) {
        return false;
      }
    }

    if (event.type === "result") {
      const fixture = fixtures.get(event.fixtureId);

      if (!fixture) {
        return false;
      }
    }
  }

  return true;
};

const createSeedSnapshot = (): LeagueEvent[] => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: STORAGE_VERSION, events: seedEvents } satisfies StoredSnapshot)
  );

  return seedEvents;
};

export const loadEvents = (): LeagueEvent[] => {
  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return createSeedSnapshot();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isObject(parsed) || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.events)) {
      return createSeedSnapshot();
    }

    if (!parsed.events.every(isLeagueEvent) || !hasValidDemoGraph(parsed.events)) {
      return createSeedSnapshot();
    }

    return parsed.events;
  } catch {
    return createSeedSnapshot();
  }
};

export const saveEvents = (events: LeagueEvent[]) => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ version: STORAGE_VERSION, events } satisfies StoredSnapshot)
  );
};
