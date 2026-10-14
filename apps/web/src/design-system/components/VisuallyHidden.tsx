import type { ElementType, ReactNode } from "react";
import Box from "@mui/material/Box";

const hidden = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
} as const;

type VisuallyHiddenProps = {
  component?: ElementType;
  children?: ReactNode;
  [attribute: string]: unknown;
};

/** Hidden on screen, still read by screen readers (and still focusable for inputs). */
export function VisuallyHidden({ component = "span", children, ...rest }: VisuallyHiddenProps) {
  return (
    <Box component={component} sx={hidden} {...rest}>
      {children}
    </Box>
  );
}

/** First focusable element on every page; jumps to <main id="main">. */
export function SkipLink({ label }: { label: string }) {
  return (
    <Box
      component="a"
      href="#main"
      sx={(theme) => ({
        ...hidden,
        "&:focus": {
          position: "fixed",
          top: 8,
          left: 8,
          width: "auto",
          height: "auto",
          margin: 0,
          clip: "auto",
          padding: "8px 16px",
          zIndex: theme.tokens.layer.tooltip,
          bgcolor: theme.tokens.neutral[900],
          color: theme.tokens.neutral[0],
          borderRadius: `${theme.tokens.radius.sm}px`,
          typography: "label",
          textDecoration: "none",
        },
      })}
    >
      {label}
    </Box>
  );
}
