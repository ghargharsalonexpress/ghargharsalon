import { useSyncExternalStore } from "react";
import { mediaUrl } from "@brand/shared";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { brand } from "@/brand";
import { Button, Picture } from "@/design-system";
import { clockText, useInfo } from "./info";
import { HERO_IMAGE, SITE_IMAGE_BASE } from "./siteImages";

/** The looping background clip, and the still shown whenever it is not played. */
const HERO_VIDEO = "/video/hero.mp4";
const HERO_POSTER = mediaUrl(SITE_IMAGE_BASE, HERO_IMAGE, 1280, "webp");

/**
 * Play the clip only when it is welcome: not for someone who asked for less motion, and
 * not on a phone, where a ~900 KB autoplay costs data and the LCP budget (plan Phase 3 DoD).
 * Everyone else sees the poster, which is a real photograph either way.
 */
const MOTION_OK = "(prefers-reduced-motion: no-preference)";
const WIDE_ENOUGH = "(min-width: 600px)";

function subscribe(onChange: () => void): () => void {
  const queries = [window.matchMedia(MOTION_OK), window.matchMedia(WIDE_ENOUGH)];
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}

function useShowVideo(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOTION_OK).matches && window.matchMedia(WIDE_ENOUGH).matches,
    () => false,
  );
}

/**
 * Home banner (plan Phase 3, client direction): a full-bleed clip behind the promise.
 * The scrim is what makes the white text readable, so it is not decoration -- keep it
 * if the clip is ever swapped.
 *
 * `still` forces the poster: the design sample is screenshot-compared, and a playing clip
 * would make every run differ.
 */
export function HeroBanner({ still = false }: { still?: boolean } = {}) {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const info = useInfo();
  const showVideo = useShowVideo() && !still;
  const n = tokens.neutral;
  const promise = { min: brand.promiseMinutes.min, max: brand.promiseMinutes.max };
  const hours = { open: clockText(info.serviceHours.open, i18n.language), close: clockText(info.serviceHours.close, i18n.language) };

  const fill = { position: "absolute", inset: 0, width: "100%", height: "100%" } as const;
  const pill = { borderRadius: 999, px: 6 } as const;

  return (
    <Box
      component="section"
      aria-labelledby="hero-title"
      sx={{
        position: "relative",
        overflow: "hidden",
        bgcolor: n[900],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: { xs: "min(100svh, 640px)", md: "min(90vh, 760px)" },
      }}
    >
      {showVideo ? (
        <Box
          component="video"
          src={HERO_VIDEO}
          poster={HERO_POSTER}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
          tabIndex={-1}
          sx={{ ...fill, objectFit: "cover", filter: "brightness(0.65) contrast(1.05)" }}
        />
      ) : (
        <Picture
          image={HERO_IMAGE}
          baseUrl={SITE_IMAGE_BASE}
          alt=""
          sizes="100vw"
          ratio="auto"
          radius="sm"
          position="42% 45%"
          priority
          sx={{ ...fill, borderRadius: 0, filter: "brightness(0.65) contrast(1.05)" }}
        />
      )}

      <Box
        aria-hidden
        sx={{
          ...fill,
          background: `linear-gradient(90deg, rgba(31,28,25,0.86) 0%, rgba(31,28,25,0.66) 50%, rgba(31,28,25,0.56) 100%)`,
        }}
      />

      <Container
        maxWidth={false}
        sx={{ maxWidth: tokens.container.marketing, position: "relative", textAlign: "center", py: { xs: 14, md: 18 } }}
      >
        <Box sx={{ maxWidth: 780, mx: "auto" }}>
          <Typography id="hero-title" variant="display" component="h1" sx={{ color: n[0], textShadow: "0 2px 14px rgba(0,0,0,0.45)" }}>
            {t("home.title")}{" "}
            <Box component="span" sx={{ color: tokens.accent[500] }}>
              {t("home.titleAccent")}
            </Box>
          </Typography>

          <Typography variant="bodyLg" component="p" sx={{ mt: 4, mx: "auto", maxWidth: "56ch", color: "rgba(255,255,255,0.92)", textShadow: "0 2px 10px rgba(0,0,0,0.4)" }}>
            {t("home.subtitle")}
          </Typography>

          <Box sx={{ mt: 8, display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center" }}>
            <Button size="lg" to="/services" sx={{ ...pill, boxShadow: "0 8px 24px rgba(0,0,0,0.28)" }}>
              {t("home.cta")}
            </Button>
            {/* The outlined button is white-on-white by default; over the clip it has to invert. */}
            <Button
              size="lg"
              variant="secondary"
              to="/#categories"
              sx={{
                ...pill,
                backgroundColor: "transparent",
                color: n[0],
                borderColor: "rgba(255,255,255,0.72)",
                "&:hover": { borderColor: n[0], backgroundColor: "rgba(255,255,255,0.16)" },
                "&:active": { backgroundColor: "rgba(255,255,255,0.24)" },
              }}
            >
              {t("home.secondary")}
            </Button>
          </Box>

          <Typography variant="body2" component="p" sx={{ mt: 7, color: "rgba(255,255,255,0.88)", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>
            {t("home.promise", promise)} &middot; {t("home.hours", hours)}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
