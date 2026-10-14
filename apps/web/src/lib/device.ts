import type { LocationFix } from "@brand/shared";

/** Thrown when the browser itself can't help (no worker, denied permission, push service error). */
export class DeviceError extends Error {
  constructor(readonly reason: "unsupported" | "denied" | "timeout" | "failed") {
    super(reason);
    this.name = "DeviceError";
  }
}

let last: { fix: LocationFix; at: number } | null = null;

/** Location watchers share their latest fix, so a button that needs one doesn't wait for GPS again. */
export function rememberFix(fix: LocationFix): void {
  last = { fix, at: Date.now() };
}

/** The latest fix seen on this page, if it's fresh enough. */
export function recentFix(maxAgeMs = 30_000): LocationFix | null {
  return last && Date.now() - last.at <= maxAgeMs ? last.fix : null;
}

/** One location fix, high accuracy, within 15 s. */
export function currentFix(): Promise<LocationFix> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new DeviceError("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const fix = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: Math.round(position.coords.accuracy) };
        rememberFix(fix);
        resolve(fix);
      },
      (error) => reject(new DeviceError(error.code === error.PERMISSION_DENIED ? "denied" : error.code === error.TIMEOUT ? "timeout" : "failed")),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10_000 },
    );
  });
}
