import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { brand } from "@/brand";

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

/** Wordmark: the logo + name set in Noto Sans SemiBold with slight negative tracking (plan B1). */
export function Wordmark({ size = "md" }: { size?: keyof typeof SIZES }) {
  const { tokens } = useTheme();
  const s = SIZES[size];
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: `${s.gap}px` }}>
      <Monogram size={s.mark} />
      <Box
        component="span"
        sx={{ fontWeight: 600, fontSize: s.font, letterSpacing: "-0.01em", color: tokens.neutral[900], lineHeight: 1 }}
      >
        {brand.name}
      </Box>
    </Box>
  );
}
