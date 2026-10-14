import Snackbar from "@mui/material/Snackbar";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Button } from "./Button";
import type { ToastAction } from "./toastContext";

export interface ToastViewProps {
  current: { id: number; message: string; action?: ToastAction } | undefined;
  open: boolean;
  autoHideMs: number;
  onClose: () => void;
  onExited: () => void;
}

/** The toast itself, loaded with the first toast so the snackbar code stays out of the first page load. */
export default function ToastView({ current, open, autoHideMs, onClose, onExited }: ToastViewProps) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("md"));
  return (
    <Snackbar
      key={current?.id}
      open={open && Boolean(current)}
      autoHideDuration={autoHideMs}
      onClose={(_, reason) => {
        if (reason !== "clickaway") onClose();
      }}
      anchorOrigin={{ vertical: "bottom", horizontal: isPhone ? "center" : "left" }}
      message={current?.message}
      action={
        current?.action ? (
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => {
              current.action?.onClick();
              onClose();
            }}
            sx={{ color: theme.tokens.accent[100] }}
          >
            {current.action.label}
          </Button>
        ) : undefined
      }
      slotProps={{
        content: { role: "status", "aria-live": "polite" },
        transition: { onExited },
      }}
      // Above any bottom bar (the professional's tabs, a sticky action bar), which sets --toast-bottom.
      sx={{ bottom: { xs: "calc(var(--toast-bottom, 16px) + env(safe-area-inset-bottom))" } }}
    />
  );
}
