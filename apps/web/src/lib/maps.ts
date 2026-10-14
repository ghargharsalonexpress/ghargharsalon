/**
 * Google Maps Platform (plan C3, ADR-0015), loaded only on screens that need a map and only
 * when a key is configured (VITE_GOOGLE_MAPS_KEY). Without a key, addresses use the phone's
 * location for the pin and maps show their text alternative.
 */
export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY ?? "";

type GoogleNamespace = typeof globalThis & { google?: { maps?: unknown } };
let loading: Promise<unknown> | null = null;

export function loadGoogleMaps(language: string): Promise<unknown> {
  if (!MAPS_KEY) return Promise.reject(new Error("no maps key"));
  const existing = (globalThis as GoogleNamespace).google?.maps;
  if (existing) return Promise.resolve(existing);
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const callback = `__mapsReady${Date.now()}`;
    (window as unknown as Record<string, () => void>)[callback] = () => resolve((globalThis as GoogleNamespace).google?.maps);
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&libraries=places,marker&v=weekly&region=IN&language=${language === "hi" ? "hi" : "en"}&callback=${callback}&loading=async`;
    script.async = true;
    script.onerror = () => {
      loading = null;
      reject(new Error("maps failed to load"));
    };
    document.head.append(script);
  });
  return loading;
}

/** Directions in the Google Maps app or site; works without our key (plan Phase 7: "Open in Google Maps"). */
export const directionsUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
export const placeUrl = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
