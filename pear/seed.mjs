// Sample league used to seed a freshly created bridge league, so the web UI shows
// a populated table on first run. Mirrors src/lib/sample-data.ts.
export function seedEvents() {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  return [
    { type: "league", name: "Floodlights Sunday League", createdAt: now - 7 * hour },
    { type: "team", id: "red-foxes", name: "Red Foxes" },
    { type: "team", id: "dockside-fc", name: "Dockside FC" },
    { type: "team", id: "northside-athletic", name: "Northside Athletic" },
    { type: "team", id: "harbour-ac", name: "Harbour AC" },
    { type: "fixture", id: "fx-1", home: "red-foxes", away: "dockside-fc", date: now - 5 * hour },
    { type: "fixture", id: "fx-2", home: "northside-athletic", away: "harbour-ac", date: now - 4 * hour },
    { type: "fixture", id: "fx-3", home: "red-foxes", away: "northside-athletic", date: now + 24 * hour },
    { type: "result", fixtureId: "fx-1", homeGoals: 3, awayGoals: 1, recordedAt: now - 4.5 * hour },
    { type: "result", fixtureId: "fx-2", homeGoals: 2, awayGoals: 2, recordedAt: now - 3.5 * hour }
  ];
}
