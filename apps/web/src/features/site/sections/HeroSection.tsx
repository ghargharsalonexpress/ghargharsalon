import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { HeroSlide, SectionOf } from "@brand/shared";
import AccessTimeOutlined from "@mui/icons-material/AccessTimeOutlined";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import PauseOutlined from "@mui/icons-material/PauseOutlined";
import PlayArrowOutlined from "@mui/icons-material/PlayArrowOutlined";
import VerifiedOutlined from "@mui/icons-material/VerifiedOutlined";
import WbSunnyOutlined from "@mui/icons-material/WbSunnyOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { IconButton, Picture } from "@/design-system";
import { videoSrc } from "@/lib/media";
import { useText, useTextVariables } from "../text";
import { CtaButton } from "./parts";
import { titleId } from "./tone";

/** Play clips only when welcome: not with reduced motion, not on phones (data, LCP). */
const MOTION_OK = "(prefers-reduced-motion: no-preference)";
const WIDE_ENOUGH = "(min-width: 600px)";

function subscribe(onChange: () => void): () => void {
  const queries = [window.matchMedia(MOTION_OK), window.matchMedia(WIDE_ENOUGH)];
  for (const query of queries) query.addEventListener("change", onChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onChange);
  };
}
const useMotion = () => useSyncExternalStore(subscribe, () => window.matchMedia(MOTION_OK).matches, () => false);
const useShowVideo = () => useSyncExternalStore(subscribe, () => window.matchMedia(MOTION_OK).matches && window.matchMedia(WIDE_ENOUGH).matches, () => false);

// Phones get a shorter banner: just the promise and one button, and less of the photo cropped away.
const HEIGHTS = {
  full: { xs: "min(80svh, 600px)", sm: "min(90vh, 720px)", md: "min(100vh, 860px)" },
  large: { xs: "min(68svh, 520px)", sm: "min(80vh, 620px)", md: "min(88vh, 720px)" },
  medium: { xs: 400, sm: 460, md: 520 },
} as const;

/**
 * The banner (billu / Yes Madam style): full-bleed photos or a clip, a bold promise with the
 * highlighted part, two buttons and the arrival promise. Several slides cross-fade, pause on
 * hover or focus, and have a pause button (WCAG 2.2.2); with reduced motion they never move.
 */
export function HeroSection({ section, first }: { section: SectionOf<"hero">; first: boolean }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const motion = useMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const slides = section.slides;
  const count = slides.length;
  const autoplay = count > 1 && section.autoplaySeconds > 0 && motion && !paused && !held;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(() => go(index + 1), section.autoplaySeconds * 1000);
    return () => window.clearTimeout(timer);
  }, [autoplay, index, go, section.autoplaySeconds]);

  return (
    <Box
      component="section"
      id={section.anchor || undefined}
      aria-labelledby={titleId(section)}
      aria-roledescription={count > 1 ? t("site.carousel") : undefined}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
      sx={{ position: "relative", overflow: "hidden", bgcolor: tokens.neutral[900], minHeight: HEIGHTS[section.height], display: "grid", scrollMarginTop: 88 }}
    >
      {slides.map((slide, slideIndex) => (
        <Slide key={slideIndex} slide={slide} active={slideIndex === index} first={first && slideIndex === 0} index={slideIndex} count={count} sectionId={section.id} height={section.height} showPromise={section.showPromise} />
      ))}

      {count > 1 && (
        <>
          <Box sx={{ position: "absolute", left: 0, right: 0, bottom: { xs: 12, md: 20 }, display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5, zIndex: 2 }}>
            <IconButton label={paused ? t("site.play") : t("site.pause")} size="sm" onClick={() => setPaused((value) => !value)} tooltip={false} sx={{ color: tokens.neutral[0], bgcolor: "rgba(0,0,0,0.35)", "&:hover": { bgcolor: "rgba(0,0,0,0.5)" } }}>
              {paused ? <PlayArrowOutlined fontSize="small" /> : <PauseOutlined fontSize="small" />}
            </IconButton>
            {slides.map((_, dot) => (
              <Box
                key={dot}
                component="button"
                type="button"
                aria-label={t("site.goToSlide", { number: dot + 1, count })}
                aria-current={dot === index ? "true" : undefined}
                onClick={() => go(dot)}
                sx={{
                  // A 24px target (WCAG 2.5.8) around the small visible dot.
                  width: dot === index ? 40 : 24,
                  height: 24,
                  p: 0,
                  border: 0,
                  borderRadius: 999,
                  cursor: "pointer",
                  bgcolor: "transparent",
                  display: "grid",
                  placeItems: "center",
                  transition: "width 240ms ease",
                  "&::before": {
                    content: '""',
                    width: dot === index ? 28 : 10,
                    height: 10,
                    borderRadius: 999,
                    bgcolor: dot === index ? tokens.neutral[0] : "rgba(255,255,255,0.5)",
                    transition: "width 240ms ease, background-color 240ms ease",
                  },
                  "&:focus-visible": { outline: `2px solid ${tokens.neutral[0]}`, outlineOffset: 1 },
                }}
              />
            ))}
          </Box>
          {[-1, 1].map((direction) => (
            <IconButton
              key={direction}
              label={direction < 0 ? t("site.previous") : t("site.next")}
              onClick={() => go(index + direction)}
              tooltip={false}
              sx={{
                display: { xs: "none", md: "inline-flex" },
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                [direction < 0 ? "left" : "right"]: 20,
                zIndex: 2,
                color: tokens.neutral[0],
                bgcolor: "rgba(0,0,0,0.3)",
                "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
              }}
            >
              {direction < 0 ? <ChevronLeftOutlined /> : <ChevronRightOutlined />}
            </IconButton>
          ))}
        </>
      )}
    </Box>
  );
}

function Slide({
  slide,
  active,
  first,
  index,
  count,
  sectionId,
  height,
  showPromise,
}: {
  slide: HeroSlide;
  active: boolean;
  first: boolean;
  index: number;
  count: number;
  sectionId: string;
  height: keyof typeof HEIGHTS;
  showPromise: boolean;
}) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const text = useText();
  const showVideo = useShowVideo() && Boolean(slide.video) && active;
  const centered = slide.align === "center";
  const fill = { position: "absolute", inset: 0, width: "100%", height: "100%" } as const;
  const shade = { filter: "brightness(0.78) contrast(1.04)" } as const;
  const title = text(slide.title);
  const accent = text(slide.accent);

  return (
    <Box
      role={count > 1 ? "group" : undefined}
      aria-roledescription={count > 1 ? t("site.slide") : undefined}
      aria-label={count > 1 ? t("site.slideOf", { number: index + 1, count }) : undefined}
      aria-hidden={!active || undefined}
      inert={!active || undefined}
      sx={{
        gridArea: "1 / 1",
        position: "relative",
        display: "flex",
        alignItems: "center",
        minHeight: HEIGHTS[height],
        opacity: active ? 1 : 0,
        visibility: active ? "visible" : "hidden",
        transition: "opacity 700ms ease, visibility 700ms",
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      {slide.image && (
        <>
          <Picture
            image={slide.image}
            alt=""
            sizes="100vw"
            ratio="auto"
            radius="sm"
            priority={first}
            sx={{ ...fill, ...shade, borderRadius: 0, display: slide.mobileImage ? { xs: "none", sm: "block" } : "block" }}
          />
          {slide.mobileImage && <Picture image={slide.mobileImage} alt="" sizes="100vw" ratio="auto" radius="sm" priority={first} sx={{ ...fill, ...shade, borderRadius: 0, display: { xs: "block", sm: "none" } }} />}
        </>
      )}
      {showVideo && <Box component="video" src={videoSrc(slide.video)} autoPlay muted loop playsInline preload="metadata" aria-hidden tabIndex={-1} sx={{ ...fill, ...shade, objectFit: "cover" }} />}
      <Box
        aria-hidden
        sx={{
          ...fill,
          background: centered
            ? "linear-gradient(180deg, rgba(20,16,12,0.55) 0%, rgba(20,16,12,0.62) 100%)"
            : { xs: "linear-gradient(180deg, rgba(20,16,12,0.35) 0%, rgba(20,16,12,0.82) 70%)", md: "linear-gradient(90deg, rgba(20,16,12,0.86) 0%, rgba(20,16,12,0.6) 45%, rgba(20,16,12,0.08) 100%)" },
        }}
      />

      <Container maxWidth={false} sx={{ maxWidth: tokens.container.marketing, position: "relative", py: { xs: 10, md: 16 }, pb: { xs: 14, md: 16 }, alignSelf: { xs: centered ? "center" : "flex-end", md: "center" } }}>
        <Box sx={{ maxWidth: centered ? 820 : 640, mx: centered ? "auto" : 0, textAlign: centered ? "center" : "left" }}>
          {text(slide.eyebrow) && (
            <Typography
              variant="label"
              component="p"
              sx={{ m: 0, mb: 4, display: { xs: "none", sm: "inline-flex" }, alignItems: "center", gap: 1.5, px: 3, py: 1, borderRadius: 999, bgcolor: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.28)", color: tokens.neutral[0], backdropFilter: "blur(6px)" }}
            >
              <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: tokens.accent[500] }} />
              {text(slide.eyebrow)}
            </Typography>
          )}
          <Typography
            id={index === 0 ? `section-${sectionId}-title` : undefined}
            variant="display"
            component={first ? "h1" : index === 0 ? "h2" : "p"}
            sx={{ m: 0, color: tokens.neutral[0], fontWeight: 700, fontSize: { xs: "2rem", sm: "2.75rem", md: "3.5rem" }, lineHeight: 1.12, textShadow: "0 2px 18px rgba(0,0,0,0.35)" }}
          >
            {title}
            {accent && (
              <>
                {" "}
                {/* The highlighted words: the bright brand orange on its own line, no box behind it. */}
                <Box component="span" sx={{ display: "block", mt: { xs: 0.5, md: 1 }, color: tokens.accent[500] }}>
                  {accent}
                </Box>
              </>
            )}
          </Typography>
          {text(slide.subtitle) && (
            <Typography variant="bodyLg" component="p" sx={{ display: { xs: "none", sm: "block" }, mt: 5, mx: centered ? "auto" : 0, maxWidth: "54ch", color: "rgba(255,255,255,0.92)", textShadow: "0 1px 10px rgba(0,0,0,0.35)" }}>
              {text(slide.subtitle)}
            </Typography>
          )}
          <Box sx={{ mt: { xs: 6, sm: 8 }, display: "flex", gap: 3, flexWrap: "wrap", justifyContent: centered ? "center" : "flex-start" }}>
            <CtaButton cta={slide.primary} size="lg" sx={{ boxShadow: "0 10px 28px rgba(0,0,0,0.3)", minWidth: 160 }} />
            <CtaButton cta={slide.secondary} size="lg" variant="secondary" inverse sx={{ display: { xs: "none", sm: "inline-flex" } }} />
          </Box>
          {showPromise && <Promise centered={centered} />}
        </Box>
      </Container>
    </Box>
  );
}

/** Three short facts under the buttons. */
function Promise({ centered }: { centered: boolean }) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const vars = useTextVariables();
  const facts = [
    { icon: <AccessTimeOutlined fontSize="small" />, label: t("site.promise", { min: vars.min, max: vars.max }) },
    { icon: <VerifiedOutlined fontSize="small" />, label: t("site.verified") },
    { icon: <WbSunnyOutlined fontSize="small" />, label: t("site.openDaily", { open: vars.open, close: vars.close }) },
  ];
  return (
    <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, mt: 8, display: { xs: "none", sm: "flex" }, flexWrap: "wrap", gap: { xs: 2, md: 3 }, columnGap: { xs: 4, md: 6 }, justifyContent: centered ? "center" : "flex-start" }}>
      {facts.map((fact) => (
        <Box
          component="li"
          key={fact.label}
          sx={{ display: "inline-flex", alignItems: "center", gap: 1.5, color: "rgba(255,255,255,0.92)", typography: "body2", fontWeight: 500, "& svg": { color: tokens.accent[200] } }}
        >
          {fact.icon}
          {fact.label}
        </Box>
      ))}
    </Box>
  );
}
