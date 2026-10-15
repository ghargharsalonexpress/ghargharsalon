import { type ReactNode, useEffect, useMemo } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClientProvider } from "@tanstack/react-query";
import { accentRamps, createAppTheme, ToastProvider } from "@/design-system";
import { accentRampFromHex } from "@/design-system/foundations/accent";
import { useSite } from "@/features/site/api";
import { loadSiteFont, siteFontStack } from "@/lib/fonts";
import { BrandDirectionProvider } from "./BrandDirection";
import { useBrandDirection } from "./brandDirectionContext";
import { LanguageSync } from "./LanguageSync";
import { queryClient } from "./queryClient";

/** The theme follows Admin → Website → Brand & theme: colour, corners and fonts (ADR-0021). */
function ThemedApp({ children }: { children: ReactNode }) {
  const { direction } = useBrandDirection();
  const { theme: chosen } = useSite().site;

  const theme = useMemo(
    () =>
      createAppTheme({
        accent: direction ? accentRamps[direction] : accentRampFromHex(chosen.accent),
        corners: chosen.corners,
        headingFamily: siteFontStack(chosen.headingFont),
        bodyFamily: siteFontStack(chosen.bodyFont),
      }),
    [direction, chosen.accent, chosen.corners, chosen.headingFont, chosen.bodyFont],
  );

  useEffect(() => {
    loadSiteFont(chosen.headingFont);
    loadSiteFont(chosen.bodyFont);
  }, [chosen.headingFont, chosen.bodyFont]);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.tokens.neutral[0]);
  }, [theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrandDirectionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemedApp>{children}</ThemedApp>
        <LanguageSync />
      </QueryClientProvider>
    </BrandDirectionProvider>
  );
}
