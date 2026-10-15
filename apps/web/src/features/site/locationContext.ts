import { createContext, useContext } from "react";

// Location on arrival (ADR-0021, billu style): the browser's "Allow location" prompt as soon
// as someone opens the site, then a chip in the header that says whether we serve them.
// The answer is kept for the visit; the browser itself remembers Allow or Block.

export type LocationStatus = "idle" | "locating" | "served" | "outside" | "denied" | "unavailable";

export interface VisitorLocation {
  status: LocationStatus;
  /** The served area the visitor is in (or picked). */
  area: string | null;
  point: { lat: number; lng: number } | null;
  /** True when the visitor picked an area instead of sharing their location. */
  picked: boolean;
}

export interface LocationContextValue extends VisitorLocation {
  detect: () => Promise<void>;
  pick: (area: string) => void;
  openPicker: () => void;
}

const STORAGE_KEY = "visitorLocation";
export const initial: VisitorLocation = { status: "idle", area: null, point: null, picked: false };
export const LocationContext = createContext<LocationContextValue | null>(null);

export function stored(): VisitorLocation | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const value = raw ? (JSON.parse(raw) as VisitorLocation) : null;
    return value && value.status !== "locating" && value.status !== "idle" ? value : null;
  } catch {
    return null;
  }
}

export function store(value: VisitorLocation): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private mode: the visit just asks again next time.
  }
}

export function useVisitorLocation(): LocationContextValue | null {
  return useContext(LocationContext);
}
