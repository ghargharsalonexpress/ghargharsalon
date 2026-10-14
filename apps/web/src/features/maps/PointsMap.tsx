import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { MapView } from "@/design-system";
import { loadGoogleMaps, MAPS_KEY } from "@/lib/maps";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  kind: "available" | "busy" | "stale" | "booking";
  title: string;
}

interface GMarker {
  setPosition: (point: { lat: number; lng: number }) => void;
  setMap: (map: unknown) => void;
}
interface GBounds {
  extend: (point: { lat: number; lng: number }) => void;
}
interface MapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => { fitBounds: (bounds: GBounds, padding?: number) => void };
  Marker: new (options: Record<string, unknown>) => GMarker;
  LatLngBounds: new () => GBounds;
  SymbolPath: { CIRCLE: number };
}

const MUTED_STYLE = [
  { stylers: [{ saturation: -70 }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

/**
 * The admin live board's map (plan Phase 8): professionals and active bookings as dots. Only with
 * a Maps key; the page always lists the same things as text (plan B11), so without a key the
 * lists stand alone.
 */
export function PointsMap({ points, label }: { points: MapPoint[]; label: string }) {
  const { i18n } = useTranslation();
  const { tokens } = useTheme();
  const element = useRef<HTMLDivElement>(null);
  const live = useRef<{ api: MapsApi; map: InstanceType<MapsApi["Map"]>; markers: Map<string, GMarker>; framed: boolean } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!MAPS_KEY) return;
    let cancelled = false;
    loadGoogleMaps(i18n.language)
      .then((loaded) => {
        if (cancelled || !element.current) return;
        const api = loaded as MapsApi;
        const map = new api.Map(element.current, { center: { lat: 28.6, lng: 77.2 }, zoom: 11, disableDefaultUI: true, zoomControl: true, clickableIcons: false, styles: MUTED_STYLE });
        live.current = { api, map, markers: new Map(), framed: false };
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      live.current = null;
    };
    // Created once; points are synced by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const current = live.current;
    if (status !== "ready" || !current) return;
    const colour = { available: tokens.semantic.success.fg, busy: tokens.accent[600], stale: tokens.semantic.warning.strong, booking: tokens.neutral[900] };
    const seen = new Set<string>();
    for (const point of points) {
      seen.add(point.id);
      const existing = current.markers.get(point.id);
      if (existing) {
        existing.setPosition(point);
        continue;
      }
      current.markers.set(
        point.id,
        new current.api.Marker({
          map: current.map,
          position: point,
          title: point.title,
          icon: { path: current.api.SymbolPath.CIRCLE, scale: point.kind === "booking" ? 7 : 8, fillColor: colour[point.kind], fillOpacity: 1, strokeColor: tokens.neutral[0], strokeWeight: 2 },
        }),
      );
    }
    for (const [id, marker] of current.markers) {
      if (!seen.has(id)) {
        marker.setMap(null);
        current.markers.delete(id);
      }
    }
    if (!current.framed && points.length > 0) {
      const bounds = new current.api.LatLngBounds();
      for (const point of points) bounds.extend(point);
      current.map.fitBounds(bounds, 48);
      current.framed = true;
    }
  }, [points, status, tokens]);

  if (!MAPS_KEY) return null;
  return (
    <MapView status={status} label={label} height={{ xs: 320, md: 480 }}>
      <Box ref={element} sx={{ position: "absolute", inset: 0 }} />
    </MapView>
  );
}
