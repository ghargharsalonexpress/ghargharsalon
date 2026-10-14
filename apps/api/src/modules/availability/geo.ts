import type { GeoPoint } from "@brand/shared";

/** [lng, lat] pairs, GeoJSON order. */
export type Ring = ReadonlyArray<readonly [number, number]>;

/** Ray casting: is the point inside the ring? (Edges count as inside.) */
export function pointInRing(point: GeoPoint, ring: Ring): boolean {
  const x = point.lng;
  const y = point.lat;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

const EARTH_RADIUS_M = 6_371_000;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in metres. */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * Arrival estimate before anyone accepts (plan C6): straight-line distance × 1.4 for roads,
 * at 18 km/h city speed, plus 3 minutes to leave, shown as a 6-minute range.
 */
export function etaRange(distance: number): { min: number; max: number } {
  const minutes = ((distance * 1.4) / 1000 / 18) * 60 + 3;
  const min = Math.max(5, Math.floor(minutes / 3) * 3);
  return { min, max: min + 6 };
}

// ---------- service hours (Asia/Kolkata) ----------

const IST_OFFSET_MINUTES = 330;

const minutesOf = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/** Minutes since midnight in India for an instant. */
export const istMinutes = (date: Date) => (((date.getUTCHours() * 60 + date.getUTCMinutes() + IST_OFFSET_MINUTES) % 1440) + 1440) % 1440;

export function isOpen(date: Date, hours: { open: string; close: string }): boolean {
  const now = istMinutes(date);
  return now >= minutesOf(hours.open) && now < minutesOf(hours.close);
}

/** The next opening time after `date` (today if before opening, otherwise tomorrow). */
export function nextOpening(date: Date, hours: { open: string; close: string }): Date {
  const now = istMinutes(date);
  const open = minutesOf(hours.open);
  const startOfIstDay = new Date(date.getTime() - now * 60_000);
  startOfIstDay.setUTCSeconds(0, 0);
  const day = now < open ? 0 : 1;
  return new Date(startOfIstDay.getTime() + (day * 1440 + open) * 60_000);
}
