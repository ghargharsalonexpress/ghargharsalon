import type { ImageRef } from "@brand/shared";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { brand } from "@/brand";
import { Picture } from "./Picture";

const SIZES = {
  sm: { mark: 32, font: 16, gap: 8 },
  md: { mark: 40, font: 18, gap: 10 },
  lg: { mark: 56, font: 26, gap: 12 },
} as const;

/**
 * The client's logo: the round gold emblem (public/brand, built from scripts/images/logo.jpg by
 * scripts/images/icons.mjs, like the favicon and app icons). Decorative: the name sits next to it.
 */
export function Monogram({ size = 40 }: { size?: number }) {
  return (
    <Box
      component="img"
      src="/brand/logo-96.webp"
      srcSet="/brand/logo-96.webp 1x, /brand/logo-192.webp 2x"
      alt=""
      aria-hidden
      width={size}
      height={size}
      decoding="async"
      sx={{ display: "block", width: size, height: size, borderRadius: "50%", flexShrink: 0 }}
    />
  );
}

export interface WordmarkProps {
  size?: keyof typeof SIZES;
  /** The website's name (Admin → Website → Brand & theme); the built-in name otherwise. */
  name?: string;
  /** An uploaded logo instead of the shipped emblem. */
  logo?: ImageRef | null;
  /** False when the logo already contains the name. */
  showName?: boolean;
  /** Light text, for dark backgrounds. */
  inverse?: boolean;
}

/** Wordmark: the logo + name with slight negative tracking (plan B1). */
export function Wordmark({ size = "md", name = brand.name, logo = null, showName = true, inverse = false }: WordmarkProps) {
  const { tokens } = useTheme();
  const s = SIZES[size];
  const mark = logo ? (
    <Picture
      image={logo}
      alt={showName ? "" : name}
      sizes={Math.round((s.mark * logo.width) / logo.height) * 2}
      ratio={`${logo.width} / ${logo.height}`}
      radius="sm"
      sx={{ width: Math.round((s.mark * logo.width) / logo.height), height: s.mark, flexShrink: 0, bgcolor: "transparent", borderRadius: 0 }}
    />
  ) : (
    <Monogram size={s.mark} />
  );
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: `${s.gap}px` }}>
      {mark}
      {(showName || !logo) && (
        <Box component="span" sx={{ fontWeight: 700, fontFamily: tokens.headingFamily, fontSize: s.font, letterSpacing: "-0.01em", color: inverse ? tokens.neutral[0] : tokens.neutral[900], lineHeight: 1.15 }}>
          {name}
        </Box>
      )}
    </Box>
  );
}
