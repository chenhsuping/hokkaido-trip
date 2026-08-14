export const SHEET_ID = '1t0cg0bkqQLtyYYvFaGH7MlWoi4tHZGYhgTHnEWV90aU';

export const TABS = {
  itinerary: 0,
  dining: 126273833,
  lodging: 1315714937,
  transport: 1509364219,
  budget: 1572357344,
  todo: 199634433,
};

/** ¥1 = NT$RATE。出發前請確認並自行調整。 */
export const RATE = 0.21;

export const TRIP_START = '2026-12-25';
export const TRIP_END = '2027-01-03';

export function csvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}
