import type { MouseEvent, ReactNode, Ref } from "react";
import Box from "@mui/material/Box";
import MuiButton, { type ButtonProps as MuiButtonProps } from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { Link as RouterLink } from "react-router";

export type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<MuiButtonProps, "variant" | "color" | "size" | "ref"> {
  /** primary: the one main action per view · secondary: outline · tertiary: text · danger: destructive confirms only. */
  variant?: ButtonVariant;
  /** sm 32 (dense admin only) · md 40 · lg 48 (mobile primary CTAs). Coarse pointers get >= 44. */
  size?: ButtonSize;
  /** Keeps the button's width and colour, shows a spinner and blocks clicks. */
  loading?: boolean;
  /** In-app route: renders the button as a router link. */
  to?: string;
  /** Router link options, used with `to`. */
  state?: unknown;
  preventScrollReset?: boolean;
  replace?: boolean;
  /** External links, used with `href`. */
  target?: string;
  rel?: string;
  ref?: Ref<HTMLButtonElement>;
  children?: ReactNode;
}

const VARIANT = {
  primary: { variant: "contained", color: "primary" },
  secondary: { variant: "outlined", color: "inherit" },
  tertiary: { variant: "text", color: "primary" },
  danger: { variant: "contained", color: "error" },
} as const;

const SIZE = { sm: "small", md: "medium", lg: "large" } as const;

export function Button({ variant = "primary", size = "md", loading = false, onClick, children, sx, to, state, preventScrollReset, replace, ref, ...rest }: ButtonProps) {
  const mapped = VARIANT[variant];
  const linkProps = to ? ({ component: RouterLink, to, state, preventScrollReset, replace } as Record<string, unknown>) : {};

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <MuiButton
      {...linkProps}
      ref={ref}
      variant={mapped.variant}
      color={mapped.color}
      size={SIZE[size]}
      onClick={handleClick}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      sx={[loading && { cursor: "progress" }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...rest}
    >
      {loading ? (
        <>
          <Box component="span" sx={{ visibility: "hidden", display: "inline-flex", alignItems: "center" }}>
            {children}
          </Box>
          <CircularProgress size={18} thickness={5} color="inherit" sx={{ position: "absolute" }} aria-hidden />
        </>
      ) : (
        children
      )}
    </MuiButton>
  );
}
