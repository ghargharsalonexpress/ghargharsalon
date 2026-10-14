import { type ReactNode, useId } from "react";
import LocationOffOutlined from "@mui/icons-material/LocationOffOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Badge } from "./StatusPill";
import { Link } from "./Link";

export interface MapViewProps {
  status: "loading" | "ready" | "error";
  /** Text alternative shown next to/under the map; the map is never the only source of information. */
  label: string;
  height?: number | { xs: number; md: number };
  /** Address shown in the error fallback, with an "Open in Google Maps" link. */
  fallbackAddress?: string;
  fallbackHref?: string;
  /** e.g. "Location paused · last updated 3 min ago" (plan B8 stale state). */
  staleMessage?: string;
  /** The map itself (Google Maps); without it a neutral placeholder stands in (style guide). */
  children?: ReactNode;
}

export function MapView({ status, label, height = { xs: 280, md: 420 }, fallbackAddress, fallbackHref, staleMessage, children }: MapViewProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const skipTarget = `${useId()}-after-map`;

  return (
    <Box>
      <Box
        component="a"
        href={`#${skipTarget}`}
        sx={{ position: "absolute", left: -9999, "&:focus": { position: "static", display: "inline-block", mb: 2, typography: "label" } }}
      >
        {t("map.skip")}
      </Box>
      <Box
        role="region"
        aria-label={label}
        sx={{
          position: "relative",
          height,
          borderRadius: `${tokens.radius.md}px`,
          overflow: "hidden",
          border: `1px solid ${tokens.neutral[200]}`,
          bgcolor: tokens.neutral[50],
        }}
      >
        {/* A live map mounts while loading (it needs its element); the skeleton covers it until ready. */}
        {status !== "error" && children}
        {status === "loading" && <Skeleton variant="rectangular" sx={{ position: "absolute", inset: 0, height: "100%" }} />}
        {status === "error" && (
          <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, p: 6, textAlign: "center" }}>
            <LocationOffOutlined sx={{ color: tokens.neutral[600] }} aria-hidden />
            <Typography>{t("map.unavailable")}</Typography>
            {fallbackAddress && <Typography sx={{ color: "text.secondary" }}>{fallbackAddress}</Typography>}
            {fallbackHref && <Link href={fallbackHref}>{t("map.openInMaps")}</Link>}
          </Box>
        )}
        {status === "ready" && !children && (
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage: `linear-gradient(${tokens.neutral[0]} 2px, transparent 2px), linear-gradient(90deg, ${tokens.neutral[0]} 2px, transparent 2px)`,
              backgroundSize: "56px 56px",
              backgroundColor: tokens.neutral[100],
            }}
          />
        )}
        {staleMessage && status === "ready" && (
          <Box sx={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", justifyContent: "center" }}>
            <Badge tone="warning">{staleMessage}</Badge>
          </Box>
        )}
      </Box>
      <span id={skipTarget} />
    </Box>
  );
}
