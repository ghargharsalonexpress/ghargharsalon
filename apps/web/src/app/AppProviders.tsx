import { type ReactNode, useEffect, useMemo } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppTheme, ToastProvider } from "@/design-system";
import { BrandDirectionProvider } from "./BrandDirection";
import { useBrandDirection } from "./brandDirectionContext";
import { LanguageSync } from "./LanguageSync";
import { queryClient } from "./queryClient";

function ThemedApp({ children }: { children: ReactNode }) {
  const { direction } = useBrandDirection();
  const theme = useMemo(() => createAppTheme(direction), [direction]);

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
