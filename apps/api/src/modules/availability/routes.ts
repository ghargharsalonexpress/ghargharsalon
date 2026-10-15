import type { GeoPoint } from "@brand/shared";
import type { Logger } from "../../logger";

/** Road distance and driving time for one candidate, or null when there is no usable route. */
export interface RoadTravel {
  meters: number;
  seconds: number;
}

const MATRIX_URL = "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

/**
 * The search has 30 s per round, so Google never gets to hold it up: past this we use the
 * straight-line estimate we would have used anyway.
 */
const TIMEOUT_MS = 1_500;

const waypoint = (point: GeoPoint) => ({ waypoint: { location: { latLng: { latitude: point.lat, longitude: point.lng } } } });

interface MatrixElement {
  originIndex?: number;
  condition?: string;
  distanceMeters?: number;
  duration?: string;
}

/** Google returns durations as "123s". */
function seconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const parsed = Number(duration.replace(/s$/, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Road distance and time from each professional to the customer (plan C6, ADR-0015).
 *
 * `$geoNear` already picked the shortlist by straight-line distance, which is free and
 * indexed; this only reorders that shortlist, because across a river or a railway line the
 * nearest person on the map is not the nearest by road.
 *
 * Returns one entry per origin, in order. **Every failure returns nulls rather than
 * throwing** — no key, a bad response, a timeout or a missing route all fall back to the
 * straight-line maths, so matching works exactly as before when Google is not available.
 */
export async function roadTravel(origins: GeoPoint[], destination: GeoPoint, key: string, logger: Logger): Promise<Array<RoadTravel | null>> {
  const empty: Array<RoadTravel | null> = origins.map(() => null);
  if (origins.length === 0 || !key) return empty;

  try {
    const response = await fetch(MATRIX_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "originIndex,condition,distanceMeters,duration",
      },
      body: JSON.stringify({
        origins: origins.map(waypoint),
        destinations: [waypoint(destination)],
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "routes matrix failed; using straight-line distances");
      return empty;
    }

    const elements = (await response.json()) as MatrixElement[];
    if (!Array.isArray(elements)) return empty;

    const travel: Array<RoadTravel | null> = [...empty];
    for (const element of elements) {
      const index = element.originIndex;
      if (typeof index !== "number" || index < 0 || index >= origins.length) continue;
      if (element.condition !== "ROUTE_EXISTS") continue;
      const duration = seconds(element.duration);
      if (typeof element.distanceMeters !== "number" || duration === null) continue;
      travel[index] = { meters: element.distanceMeters, seconds: duration };
    }
    return travel;
  } catch (error) {
    logger.warn({ err: error }, "routes matrix unavailable; using straight-line distances");
    return empty;
  }
}
