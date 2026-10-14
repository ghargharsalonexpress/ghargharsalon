import type { ReactNode } from "react";
import MuiLink, { type LinkProps as MuiLinkProps } from "@mui/material/Link";
import { Link as RouterLink } from "react-router";

export interface LinkProps extends Omit<MuiLinkProps, "href"> {
  /** In-app route. Use `href` only for external links. */
  to?: string;
  href?: string;
  children: ReactNode;
  /** Standalone links (menus, footers) drop the always-on underline. */
  standalone?: boolean;
}

export function Link({ to, href, standalone, underline, ...rest }: LinkProps) {
  const decoration = underline ?? (standalone ? "hover" : "always");
  if (to) return <MuiLink component={RouterLink} to={to} underline={decoration} {...rest} />;
  const external = href?.startsWith("http");
  return (
    <MuiLink
      href={href}
      underline={decoration}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...rest}
    />
  );
}
