import { useEffect } from "react";
import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import WorkOutlineOutlined from "@mui/icons-material/WorkOutlineOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useMatch } from "react-router";
import { Badge, Banner, Button, EmptyState, type NavItem, ProShell } from "@/design-system";
import { usePageMeta } from "@/features/public/usePageMeta";
import { isApiError } from "@/lib/api";
import { errorText } from "@/lib/errors";
import { useManifest } from "@/lib/pwa";
import { refreshAlertSubscription, useProMe } from "./api";
import { useJobLocation, useProRealtime } from "./live";
import { PresenceProvider } from "./PresenceProvider";
import { usePresence } from "./presenceContext";
import { NotificationBellConnected } from "@/features/notifications/NotificationBellConnected";

/** The professional panel (plan A7): its own installable app, bottom tabs, presence always visible. */
export function ProLayout() {
  const { t } = useTranslation("pro");
  const { pathname } = useLocation();
  const me = useProMe();
  useManifest("/pro.webmanifest");

  // Keep this phone's alert subscription known to the server (it can change or expire).
  useEffect(() => {
    void refreshAlertSubscription().catch(() => undefined);
  }, []);

  const nav: NavItem[] = [
    { id: "home", label: t("nav.home"), to: "/pro", icon: <HomeOutlined /> },
    { id: "jobs", label: t("nav.jobs"), to: "/pro/jobs", icon: <WorkOutlineOutlined /> },
    { id: "earnings", label: t("nav.earnings"), to: "/pro/earnings", icon: <AccountBalanceWalletOutlined /> },
    { id: "profile", label: t("nav.profile"), to: "/pro/profile", icon: <PersonOutlineOutlined /> },
  ];
  const section = [...nav].reverse().find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)) ?? nav[0];
  const title = section?.label ?? t("nav.home");
  usePageMeta(title);

  if (!me.data) {
    const missing = isApiError(me.error) && me.error.code === "NOT_FOUND";
    return (
      <ProShell bell={<NotificationBellConnected />} title={title} nav={nav}>
        {me.isError ? (
          <EmptyState
            headingLevel="h2"
            title={missing ? t("layout.noProfileTitle") : t("layout.loadErrorTitle")}
            description={missing ? t("layout.noProfileBody") : errorText(t, me.error)}
            action={
              missing ? undefined : (
                <Button variant="secondary" onClick={() => void me.refetch()}>
                  {t("common:action.retry")}
                </Button>
              )
            }
          />
        ) : (
          <Box aria-busy sx={{ display: "grid", gap: 4 }}>
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" height={220} />
          </Box>
        )}
      </ProShell>
    );
  }

  return (
    <PresenceProvider me={me.data}>
      <Frame title={title} nav={nav} />
    </PresenceProvider>
  );
}

function Frame({ title, nav }: { title: string; nav: NavItem[] }) {
  const { t } = useTranslation("pro");
  const { presence, online, reconnecting } = usePresence();
  // A job alert takes the whole screen (plan Phase 6 UX): no tabs, one decision.
  const alertOpen = useMatch("/pro/offers/:id") !== null;
  useProRealtime();
  useJobLocation(presence.activeBookingId);
  const pill = reconnecting ? (
    <Badge tone="warning">{t("status.reconnecting")}</Badge>
  ) : presence.state === "stale" ? (
    <Badge tone="warning">{t("status.stale")}</Badge>
  ) : presence.state === "busy" ? (
    <Badge tone="accent">{t("status.busy")}</Badge>
  ) : online ? (
    <Badge tone="success" live>
      {t("status.online")}
    </Badge>
  ) : (
    <Badge>{t("status.offline")}</Badge>
  );

  if (alertOpen) return <Outlet />;
  return (
    <ProShell title={title} nav={nav} status={pill} banner={reconnecting ? <Banner tone="warning">{t("status.reconnectingBody")}</Banner> : undefined}>
      <Outlet />
    </ProShell>
  );
}
