import { useEffect, useMemo } from "react";
import ChatBubbleOutlineOutlined from "@mui/icons-material/ChatBubbleOutlineOutlined";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import ContentCutOutlined from "@mui/icons-material/ContentCutOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
import FolderOutlined from "@mui/icons-material/FolderOutlined";
import HistoryOutlined from "@mui/icons-material/HistoryOutlined";
import MapOutlined from "@mui/icons-material/MapOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import PeopleOutlineOutlined from "@mui/icons-material/PeopleOutlineOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import StarOutlineRounded from "@mui/icons-material/StarOutlineRounded";
import { useQuery } from "@tanstack/react-query";
import { I18nextProvider, useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router";
import { useCurrentUser } from "@/app/session";
import { AdminShell, Button, type NavItem } from "@/design-system";
import { useSignOut } from "@/features/auth/useSignOut";
import { dashboardQuery } from "./ops/api";
import i18n from "@/i18n";

/** The admin reads in English whatever the profile language is (plan A3). */
const english = i18n.cloneInstance({ lng: "en" });

/** Sidebar, top bar and English strings around every admin page. */
export function AdminLayout() {
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = "en";
    return () => {
      document.documentElement.lang = previous;
    };
  }, []);

  return (
    <I18nextProvider i18n={english}>
      <AdminFrame />
    </I18nextProvider>
  );
}

function AdminFrame() {
  const { t } = useTranslation("admin");
  const { pathname } = useLocation();
  const user = useCurrentUser();
  const { signOut, pending } = useSignOut();
  // Open alerts on every admin page (plan Phase 8: the alert centre); shares the dashboard's query.
  const alerts = useQuery(dashboardQuery).data?.alerts.length ?? 0;

  const nav: NavItem[] = useMemo(
    () => [
      { id: "dashboard", label: t("nav.dashboard"), to: "/admin", icon: <DashboardOutlined /> },
      { id: "live", label: t("nav.live"), to: "/admin/live", icon: <MapOutlined /> },
      { id: "bookings", label: t("nav.bookings"), to: "/admin/bookings", icon: <EventNoteOutlined /> },
      { id: "professionals", label: t("nav.professionals"), to: "/admin/professionals", icon: <BadgeOutlined /> },
      { id: "customers", label: t("nav.customers"), to: "/admin/customers", icon: <PeopleOutlineOutlined /> },
      { id: "payments", label: t("nav.payments"), to: "/admin/payments", icon: <PaymentsOutlined /> },
      { id: "reviews", label: t("nav.reviews"), to: "/admin/reviews", icon: <StarOutlineRounded /> },
      { id: "services", label: t("nav.services"), to: "/admin/services", icon: <ContentCutOutlined /> },
      { id: "categories", label: t("nav.categories"), to: "/admin/categories", icon: <FolderOutlined /> },
      { id: "messages", label: t("nav.messages"), to: "/admin/messages", icon: <ChatBubbleOutlineOutlined /> },
      { id: "settings", label: t("nav.settings"), to: "/admin/settings", icon: <SettingsOutlined /> },
      { id: "audit", label: t("nav.audit"), to: "/admin/audit", icon: <HistoryOutlined /> },
    ],
    [t],
  );
  const current = nav.find((item) => pathname === item.to || (item.to !== "/admin" && pathname.startsWith(`${item.to}/`)));

  return (
    <AdminShell
      nav={nav}
      title={current?.label ?? t("nav.dashboard")}
      alerts={alerts}
      alertsTo="/admin"
      adminName={user?.name ?? ""}
      topBarExtra={
        <Button variant="tertiary" size="sm" onClick={signOut} loading={pending}>
          {t("common:action.logout")}
        </Button>
      }
    >
      <Outlet />
    </AdminShell>
  );
}
