import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Cta, Localized, Section } from "@brand/shared";
import ChevronLeftOutlined from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { type SxProps, type Theme, useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Button, type ButtonProps, IconButton } from "@/design-system";
import { useText } from "../text";
import { titleId, useTone } from "./tone";

/** A full-width band with the section's tone, anchor and a centred container. */
export function SectionShell({
  section,
  labelled = true,
  width = "marketing",
  children,
  sx,
}: {
  section: Pick<Section, "id" | "anchor" | "tone">;
  labelled?: boolean;
  width?: "marketing" | "reading";
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  const { tokens } = useTheme();
  const tone = useTone(section.tone);
  return (
    <Box
      component="section"
      id={section.anchor || undefined}
      aria-labelledby={labelled ? titleId(section) : undefined}
      sx={{ bgcolor: tone.bg, color: tone.fg, scrollMarginTop: 88, position: "relative", overflow: "hidden" }}
    >
      <Container maxWidth={false} sx={[{ maxWidth: tokens.container[width], py: { xs: 12, md: 18 } }, ...(Array.isArray(sx) ? sx : [sx])]}>
        {children}
      </Container>
    </Box>
  );
}

/** Eyebrow, title and subtitle; nothing renders for empty texts. */
export function SectionHeading({
  section,
  eyebrow,
  title,
  subtitle,
  align = "center",
  action,
  level = "h2",
}: {
  section: Pick<Section, "id" | "tone">;
  eyebrow?: Localized;
  title?: Localized;
  subtitle?: Localized;
  align?: "center" | "left";
  action?: ReactNode;
  level?: "h1" | "h2";
}) {
  const text = useText();
  const tone = useTone(section.tone);
  const eyebrowText = text(eyebrow);
  const titleText = text(title);
  const subtitleText = text(subtitle);
  if (!eyebrowText && !titleText && !subtitleText) return null;
  const centered = align === "center";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", md: action && !centered ? "row" : "column" },
        alignItems: { xs: centered ? "center" : "flex-start", md: action && !centered ? "flex-end" : centered ? "center" : "flex-start" },
        justifyContent: "space-between",
        gap: 4,
        textAlign: centered ? "center" : "left",
        mb: { xs: 8, md: 10 },
      }}
    >
      <Box sx={{ maxWidth: centered ? 760 : 680 }}>
        {eyebrowText && (
          <Typography variant="label" component="p" sx={{ m: 0, mb: 2, color: tone.eyebrow, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600 }}>
            {eyebrowText}
          </Typography>
        )}
        {titleText && (
          <Typography id={titleId(section)} variant={level === "h1" ? "h1" : "h2"} component={level} sx={{ color: tone.fg, fontSize: level === "h2" ? { xs: "1.5rem", md: "2rem" } : undefined, lineHeight: 1.2 }}>
            {titleText}
          </Typography>
        )}
        {subtitleText && (
          <Typography variant="bodyLg" component="p" sx={{ mt: 3, color: tone.muted, mx: centered ? "auto" : 0, maxWidth: "62ch" }}>
            {subtitleText}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}

/** An admin's button: in-app links route, others open as links. Hidden without a label or a link. */
export function CtaButton({ cta, inverse = false, ...props }: { cta: Cta; inverse?: boolean } & Omit<ButtonProps, "children" | "to" | "href">) {
  const text = useText();
  const { tokens } = useTheme();
  const label = text(cta.label);
  if (!label || !cta.href) return null;
  const internal = cta.href.startsWith("/") || cta.href.startsWith("#");
  const external = cta.href.startsWith("http");
  const inverseOutline =
    inverse && props.variant === "secondary"
      ? {
          backgroundColor: "transparent",
          color: tokens.neutral[0],
          borderColor: "rgba(255,255,255,0.72)",
          "&:hover": { borderColor: tokens.neutral[0], backgroundColor: "rgba(255,255,255,0.14)" },
        }
      : {};
  return (
    <Button
      {...props}
      {...(internal ? { to: cta.href } : { href: cta.href, ...(external ? { target: "_blank", rel: "noopener noreferrer" } : {}) })}
      sx={[{ borderRadius: 999, px: 6, whiteSpace: "nowrap" }, inverseOutline, ...(Array.isArray(props.sx) ? props.sx : [props.sx])]}
    >
      {label}
    </Button>
  );
}

/** Automated browsers (tests, screenshots) and people who asked for less motion see everything at once. */
const animate = () =>
  typeof window !== "undefined" &&
  "IntersectionObserver" in window &&
  !navigator.webdriver &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Fades content up as it scrolls into view, once. */
export function Reveal({ children, delay = 0, sx }: { children: ReactNode; delay?: number; sx?: SxProps<Theme> }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !animate()) return;
    // Only what starts below the fold animates; the first screen is never hidden.
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    const frame = requestAnimationFrame(() => setHidden(true));
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHidden(false);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <Box
      ref={ref}
      sx={[
        {
          opacity: hidden ? 0 : 1,
          transform: hidden ? "translateY(24px)" : "none",
          transition: `opacity 600ms ease ${delay}ms, transform 600ms cubic-bezier(0.2, 0, 0, 1) ${delay}ms`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

/**
 * A row that scrolls sideways: swipe on phones, arrow buttons from md. `columns` is how
 * many cards fit per breakpoint; the next card peeks in so people know there is more.
 */
export function Carousel({
  label,
  children,
  columns = { xs: 1.2, sm: 2.2, md: 3, lg: 4 },
  inverse = false,
}: {
  label: string;
  children: ReactNode[];
  columns?: { xs: number; sm?: number; md?: number; lg?: number };
  inverse?: boolean;
}) {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const update = () => {
    const node = track.current;
    if (!node) return;
    setEdges({ start: node.scrollLeft <= 4, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 4 });
  };

  useEffect(() => {
    update();
    const node = track.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children.length]);

  const scroll = (direction: 1 | -1) => {
    const node = track.current;
    if (!node) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    node.scrollBy({ left: direction * node.clientWidth * 0.85, behavior });
  };

  const gap = 16;
  const basis = (count: number) => `calc((100% - ${gap * (Math.ceil(count) - 1)}px) / ${count})`;
  const arrow = {
    display: { xs: "none", md: "inline-flex" },
    position: "absolute",
    top: "40%",
    zIndex: 1,
    bgcolor: tokens.neutral[0],
    boxShadow: tokens.elevation.e2,
    "&:hover": { bgcolor: tokens.neutral[50] },
    "&.Mui-disabled": { display: "none" },
  } as const;

  return (
    <Box role="region" aria-roledescription={t("site.carousel")} aria-label={label} sx={{ position: "relative" }}>
      <IconButton label={t("site.previous")} onClick={() => scroll(-1)} disabled={edges.start} tooltip={false} sx={{ ...arrow, left: -20 }}>
        <ChevronLeftOutlined />
      </IconButton>
      <Box
        ref={track}
        onScroll={update}
        tabIndex={0}
        sx={{
          display: "flex",
          gap: `${gap}px`,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          mx: { xs: -4, md: 0 },
          px: { xs: 4, md: 0 },
          scrollPaddingInline: { xs: 4, md: 0 },
          pb: 2,
          outline: "none",
          "&:focus-visible": { outline: `2px solid ${inverse ? tokens.neutral[0] : tokens.accent[600]}`, outlineOffset: 4, borderRadius: `${tokens.radius.md}px` },
          "& > *": {
            flex: {
              xs: `0 0 ${basis(columns.xs)}`,
              sm: `0 0 ${basis(columns.sm ?? columns.xs)}`,
              md: `0 0 ${basis(columns.md ?? columns.sm ?? columns.xs)}`,
              lg: `0 0 ${basis(columns.lg ?? columns.md ?? columns.sm ?? columns.xs)}`,
            },
            scrollSnapAlign: "start",
            minWidth: 0,
          },
        }}
      >
        {children}
      </Box>
      <IconButton label={t("site.next")} onClick={() => scroll(1)} disabled={edges.end} tooltip={false} sx={{ ...arrow, right: -20 }}>
        <ChevronRightOutlined />
      </IconButton>
    </Box>
  );
}
