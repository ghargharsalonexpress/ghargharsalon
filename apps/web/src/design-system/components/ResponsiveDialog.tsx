import { type ReactNode, useId } from "react";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import Box from "@mui/material/Box";
import MuiDialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MuiDrawer from "@mui/material/Drawer";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTranslation } from "react-i18next";
import { IconButton } from "./IconButton";

export interface ResponsiveDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons in reading order: secondary first, primary last. */
  actions?: ReactNode;
  /** Forms with more than three fields: full screen on phones instead of a bottom sheet. */
  form?: boolean;
  maxWidth?: "xs" | "sm" | "md";
  showClose?: boolean;
  /** Long sheets (service details): keep the actions visible at the bottom while scrolling. */
  stickyActions?: boolean;
}

/**
 * One API for every modal (plan B8): a centred dialog from 600px, a bottom sheet below it.
 * Both trap focus, close on Escape and return focus to the trigger.
 */
export function ResponsiveDialog({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  form = false,
  maxWidth = "sm",
  showClose = true,
  stickyActions = false,
}: ResponsiveDialogProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = useId();
  const descriptionId = useId();
  const n = theme.tokens.neutral;

  const closeButton = showClose ? (
    <IconButton label={t("action.close")} onClick={onClose} tooltip={false} sx={{ mr: -2, mt: -1 }}>
      <CloseOutlined />
    </IconButton>
  ) : null;

  if (isPhone && !form) {
    return (
      <MuiDrawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        slotProps={{
          paper: {
            role: "dialog",
            "aria-modal": true,
            "aria-labelledby": titleId,
            "aria-describedby": description ? descriptionId : undefined,
            sx: { pb: "env(safe-area-inset-bottom)" },
          },
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }} aria-hidden>
          <Box sx={{ width: 36, height: 4, borderRadius: `${theme.tokens.radius.full}px`, bgcolor: n[300] }} />
        </Box>
        <Box sx={{ px: 5, pt: 3, pb: 5 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
            <Typography id={titleId} variant="h3" component="h2" sx={{ flex: 1 }}>
              {title}
            </Typography>
            {closeButton}
          </Box>
          {description && (
            <Typography id={descriptionId} sx={{ mt: 2, color: "text.secondary" }}>
              {description}
            </Typography>
          )}
          {children && <Box sx={{ mt: 4 }}>{children}</Box>}
          {actions && (
            <Box
              sx={{
                mt: 6,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                "& > *": { width: "100%" },
                ...(stickyActions ? { position: "sticky", bottom: 0, mx: -5, px: 5, pt: 3, pb: 4, bgcolor: n[0], borderTop: `1px solid ${n[200]}` } : {}),
              }}
            >
              {actions}
            </Box>
          )}
        </Box>
      </MuiDrawer>
    );
  }

  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      fullScreen={isPhone && form}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      {/* The close button sits beside the heading, not in it, so the dialog's name is just its title. */}
      <DialogTitle component="div" sx={{ display: "flex", alignItems: "flex-start", gap: 3 }}>
        <Box component="h2" id={titleId} sx={{ flex: 1, m: 0, font: "inherit" }}>
          {title}
        </Box>
        {closeButton}
      </DialogTitle>
      <DialogContent>
        {description && (
          <Typography id={descriptionId} sx={{ color: "text.secondary", mb: children ? 4 : 0 }}>
            {description}
          </Typography>
        )}
        {children}
      </DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </MuiDialog>
  );
}
