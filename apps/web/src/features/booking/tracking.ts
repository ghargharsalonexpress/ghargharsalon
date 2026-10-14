import type { BookingDto } from "@brand/shared";
import { replaceEqualDeep } from "@tanstack/react-query";

/**
 * Structural sharing for a booking (plan C8). The professional's live location arrives by event
 * every few seconds, but the server saves it only every 30 s, so a refetch can bring an older
 * one. The newer location is kept, so the pin never jumps back; everything else is the refetch.
 */
export function keepNewestTracking(previous: unknown, next: unknown): unknown {
  const merged = replaceEqualDeep(previous, next) as BookingDto | undefined;
  const before = (previous as BookingDto | undefined)?.tracking;
  if (merged && before && merged.tracking && Date.parse(before.at) > Date.parse(merged.tracking.at)) return { ...merged, tracking: before };
  return merged;
}
