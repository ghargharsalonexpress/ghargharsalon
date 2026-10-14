import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTranslation } from "react-i18next";
import { MapView } from "@/design-system";
import { loadGoogleMaps, MAPS_KEY } from "@/lib/maps";

export interface LatLng {
  lat: number;
  lng: number;
}

// The few parts of the Maps JavaScript API used here (no @types package needed).
interface GLatLng {
  lat: () => number;
  lng: () => number;
}
interface GBounds {
  extend: (point: LatLng) => void;
  contains: (point: LatLng) => boolean;
}
interface GMap {
  fitBounds: (bounds: GBounds, padding?: number) => void;
  getBounds: () => GBounds | undefined;
}
interface GMarker {
  setPosition: (point: LatLng) => void;
  getPosition: () => GLatLng | null | undefined;
  setMap: (map: GMap | null) => void;
}
interface MapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GMap;
  Marker: new (options: Record<string, unknown>) => GMarker;
  LatLngBounds: new () => GBounds;
  SymbolPath: { CIRCLE: number };
}

/** Muted base map (plan B6): low saturation, no points of interest competing with the markers. */
const MUTED_STYLE = [
  { stylers: [{ saturation: -70 }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const GLIDE_MS = 1000;

export interface LiveMapProps {
  /** The customer's address (the destination). */
  destination: LatLng;
  /** The professional's last known position, when there is one. */
  moving: LatLng | null;
  label: string;
  destinationTitle: string;
  movingTitle: string;
  staleMessage?: string;
  fallbackAddress: string;
  fallbackHref: string;
  height?: number | { xs: number; md: number };
}

/**
 * Live tracking map (plan B6/C3): Google Maps when a key is configured, loaded only here. The
 * professional's marker glides between updates (plan B7 item 7); with reduced motion it jumps.
 * Callers always show the same facts as text next to it (plan B11: the map is never the only source).
 */
export function LiveMap({ destination, moving, label, destinationTitle, movingTitle, staleMessage, fallbackAddress, fallbackHref, height }: LiveMapProps) {
  const { i18n } = useTranslation();
  const { tokens } = useTheme();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const element = useRef<HTMLDivElement>(null);
  const live = useRef<{ api: MapsApi; map: GMap; marker: GMarker | null; framed: boolean } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(MAPS_KEY ? "loading" : "error");

  // Create the map once.
  useEffect(() => {
    if (!MAPS_KEY) return;
    let cancelled = false;
    loadGoogleMaps(i18n.language)
      .then((loaded) => {
        if (cancelled || !element.current) return;
        const api = loaded as MapsApi;
        const map = new api.Map(element.current, {
          center: destination,
          zoom: 15,
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
          styles: MUTED_STYLE,
        });
        new api.Marker({
          map,
          position: destination,
          title: destinationTitle,
          icon: { path: api.SymbolPath.CIRCLE, scale: 9, fillColor: tokens.neutral[900], fillOpacity: 1, strokeColor: tokens.neutral[0], strokeWeight: 3 },
        });
        live.current = { api, map, marker: null, framed: false };
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      live.current = null;
    };
    // The map is created once per page; later changes move the markers instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move (or place) the professional's marker.
  useEffect(() => {
    const current = live.current;
    if (status !== "ready" || !current || !moving) return;
    const { api, map } = current;
    if (!current.marker) {
      current.marker = new api.Marker({
        map,
        position: moving,
        title: movingTitle,
        icon: { path: api.SymbolPath.CIRCLE, scale: 10, fillColor: tokens.accent[600], fillOpacity: 1, strokeColor: tokens.neutral[0], strokeWeight: 3 },
        zIndex: 2,
      });
    }
    const marker = current.marker;

    // Frame both points the first time, and again only when the professional leaves the view.
    const visible = map.getBounds()?.contains(moving) ?? false;
    if (!current.framed || !visible) {
      const bounds = new api.LatLngBounds();
      bounds.extend(destination);
      bounds.extend(moving);
      map.fitBounds(bounds, 64);
      current.framed = true;
    }

    const from = marker.getPosition();
    if (reduceMotion || !from) {
      marker.setPosition(moving);
      return;
    }
    const start = { lat: from.lat(), lng: from.lng() };
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - began) / GLIDE_MS);
      marker.setPosition({ lat: start.lat + (moving.lat - start.lat) * progress, lng: start.lng + (moving.lng - start.lng) * progress });
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [status, moving, destination, movingTitle, reduceMotion, tokens]);

  return (
    <MapView status={status} label={label} height={height} staleMessage={staleMessage} fallbackAddress={fallbackAddress} fallbackHref={fallbackHref}>
      <Box ref={element} sx={{ position: "absolute", inset: 0 }} />
    </MapView>
  );
}
