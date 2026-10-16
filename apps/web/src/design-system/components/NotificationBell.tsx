import { useId, useState } from "react";
import type { NotificationDto } from "@brand/shared";
import NotificationsNoneOutlined from "@mui/icons-material/NotificationsNoneOutlined";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { formatRelativeFromNow } from "@/lib/format";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

export interface NotificationBellProps {
  items: NotificationDto[];
  unread: number;
  /** Marks one read; called with nothing to mark them all. */
  onRead: (id?: string) => void;
  loading?: boolean;
}

/**
 * The bell and its list (plan C10). Tapping a row marks it read and goes where it points, so a
 * notification is a way into the thing it is about rather than a dead label.
 */
export function NotificationBell({ items, unread, onRead, loading = false }: NotificationBellProps) {
  const { t, i18n } = useTranslation();
  const { tokens } = useTheme();
  const navigate = useNavigate();
  // The anchor is state, not a ref: Popover needs it during render.
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchor);
  const listId = useId();
  const n = tokens.neutral;

  const openRow = (item: NotificationDto) => {
    setAnchor(null);
    if (!item.readAt) onRead(item.id);
    void navigate(item.url);
  };

  return (
    <>
      <IconButton
        label={t("notifications.label", { count: unread })}
        onClick={(event) => setAnchor((was) => (was ? null : event.currentTarget))}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? listId : undefined}
      >
        <Badge badgeContent={unread} color="primary" invisible={unread === 0}>
          <NotificationsNoneOutlined />
        </Badge>
      </IconButton>

      <Popover
        id={listId}
        open={open}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: "min(380px, calc(100vw - 32px))", maxHeight: "min(70vh, 520px)", mt: 1 } } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, px: 4, py: 3 }}>
          <Typography variant="label" component="h2" sx={{ m: 0 }}>
            {t("notifications.title")}
          </Typography>
          {unread > 0 && (
            <Button variant="tertiary" size="sm" onClick={() => onRead()}>
              {t("notifications.markAll")}
            </Button>
          )}
        </Box>
        <Divider />

        {items.length === 0 ? (
          <Box sx={{ px: 4, py: 6 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {loading ? t("notifications.loading") : t("notifications.empty")}
            </Typography>
          </Box>
        ) : (
          <Box component="ul" role="menu" sx={{ listStyle: "none", m: 0, p: 0, overflowY: "auto" }}>
            {items.map((item) => (
              <Box component="li" key={item.id} role="none" sx={{ borderBottom: `1px solid ${n[100]}`, "&:last-of-type": { borderBottom: 0 } }}>
                <Box
                  component="button"
                  type="button"
                  role="menuitem"
                  onClick={() => openRow(item)}
                  sx={{
                    display: "block",
                    width: "100%",
                    px: 4,
                    py: 3,
                    font: "inherit",
                    textAlign: "start",
                    cursor: "pointer",
                    border: 0,
                    backgroundColor: item.readAt ? "transparent" : tokens.accent[50],
                    "&:hover": { backgroundColor: item.readAt ? n[50] : tokens.accent[100] },
                    "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: -2 },
                  }}
                >
                  <Typography component="span" sx={{ display: "block", fontWeight: item.readAt ? 500 : 700 }}>
                    {item.title}
                  </Typography>
                  {item.body && (
                    <Typography variant="body2" component="span" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
                      {item.body}
                    </Typography>
                  )}
                  <Typography variant="caption" component="span" sx={{ display: "block", mt: 1, color: n[600] }}>
                    {formatRelativeFromNow(new Date(item.createdAt), i18n.language)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Popover>
    </>
  );
}
