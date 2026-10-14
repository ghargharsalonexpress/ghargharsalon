import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import { brand } from "@/brand";

const SIZES = {
  sm: { mark: 24, font: 16, gap: 8 },
  md: { mark: 28, font: 18, gap: 10 },
  lg: { mark: 40, font: 26, gap: 12 },
} as const;

/** Monogram: first letter on the accent square (favicon and PWA icon use the same drawing). */
export function Monogram({ size = 28 }: { size?: number }) {
  const { tokens } = useTheme();
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: `${tokens.radius.sm}px`,
        bgcolor: tokens.accent[600],
        color: tokens.neutral[0],
        fontWeight: 600,
        fontSize: size * 0.56,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {brand.name.charAt(0).toUpperCase()}
    </Box>
  );
}

/** Wordmark: monogram + name set in Noto Sans SemiBold with slight negative tracking (plan B1). */
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
