import type { Ref } from "react";
import MuiIconButton, { type IconButtonProps as MuiIconButtonProps } from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { Link as RouterLink } from "react-router";

export interface IconButtonProps extends Omit<MuiIconButtonProps, "aria-label" | "size" | "ref"> {
  /** Required accessible name; also shown as a tooltip on hover-capable devices. */
  label: string;
  size?: "sm" | "md" | "lg";
  /** Set false when the label is already visible next to the button. */
  tooltip?: boolean;
  /** In-app route: renders the button as a router link. */
  to?: string;
  ref?: Ref<HTMLButtonElement>;
}

const SIZE = { sm: "small", md: "medium", lg: "large" } as const;

export function IconButton({ label, size = "md", tooltip = true, disabled, to, ref, ...rest }: IconButtonProps) {
  const linkProps = to ? ({ component: RouterLink, to } as Record<string, unknown>) : {};
  const button = <MuiIconButton {...linkProps} ref={ref} aria-label={label} size={SIZE[size]} disabled={disabled} {...rest} />;
  if (!tooltip || disabled) return button;
  return (
    <Tooltip title={label} disableTouchListener describeChild>
      {button}
    </Tooltip>
  );
}
