import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { keyframes, useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";
import { Wordmark } from "@/design-system";

const SHOW_AFTER_MS = 300;

const slide = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
`;

/**
 * Shown while the first route chunk loads: the only full-screen loader (plan B8).
 * Stays blank for the first 300 ms so fast loads never flash. The bar is plain CSS, so the
 * first page load carries no progress component (plan C15).
 */
export function AppBoot() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <Box role="status" sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <Box sx={{ width: 160, display: "grid", gap: 4, justifyItems: "center" }}>
        <Wordmark />
        <Box role="progressbar" aria-label={t("state.loading")} sx={{ position: "relative", width: "100%", height: 4, overflow: "hidden", borderRadius: `${tokens.radius.full}px`, bgcolor: tokens.accent[100] }}>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              width: "40%",
              borderRadius: "inherit",
              bgcolor: tokens.accent[600],
              animation: `${slide} 1.2s ease-in-out infinite`,
              "@media (prefers-reduced-motion: reduce)": { animation: "none", width: "100%", opacity: 0.6 },
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
