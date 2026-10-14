import AccountBalanceWalletOutlined from "@mui/icons-material/AccountBalanceWalletOutlined";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import ContentCutOutlined from "@mui/icons-material/ContentCutOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
import GroupOutlined from "@mui/icons-material/GroupOutlined";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import MapOutlined from "@mui/icons-material/MapOutlined";
import PaymentsOutlined from "@mui/icons-material/PaymentsOutlined";
import PersonOutlineOutlined from "@mui/icons-material/PersonOutlineOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import WorkOutlineOutlined from "@mui/icons-material/WorkOutlineOutlined";
import { useTranslation } from "react-i18next";
import type { NavItem } from "@/design-system";

export function usePublicNav(): NavItem[] {
  const { t } = useTranslation("samples");
  return [
    { id: "services", label: t("nav.services"), to: "/samples/home" },
    { id: "how", label: t("nav.howItWorks"), to: "/samples/home#how-it-works" },
    { id: "about", label: t("nav.about"), to: "/samples/home#trust" },
    { id: "contact", label: t("nav.contact"), to: "/samples/home#footer" },
  ];
}

export function useProNav(): NavItem[] {
  const { t } = useTranslation("samples");
  return [
    { id: "home", label: t("nav.home"), to: "/samples/job-alert", icon: <HomeOutlined /> },
    { id: "jobs", label: t("nav.jobs"), to: "/samples/pro-jobs", icon: <WorkOutlineOutlined />, badge: 1 },
    { id: "earnings", label: t("nav.earnings"), to: "/samples/pro-earnings", icon: <AccountBalanceWalletOutlined /> },
    { id: "profile", label: t("nav.profile"), to: "/samples/pro-profile", icon: <PersonOutlineOutlined /> },
  ];
}

/** Admin is English-only (plan A3); Phase 8 pins the whole admin area to English. */
export function useAdminNav(): NavItem[] {
  const { t } = useTranslation("samples", { lng: "en" });
  return [
    { id: "dashboard", label: t("nav.dashboard"), to: "/samples/admin", icon: <DashboardOutlined /> },
    { id: "live", label: t("nav.liveMap"), to: "/samples/admin/live", icon: <MapOutlined /> },
    { id: "bookings", label: t("nav.allBookings"), to: "/samples/admin/bookings", icon: <EventNoteOutlined /> },
    { id: "professionals", label: t("nav.professionals"), to: "/samples/admin/professionals", icon: <BadgeOutlined /> },
    { id: "customers", label: t("nav.customers"), to: "/samples/admin/customers", icon: <GroupOutlined /> },
    { id: "catalogue", label: t("nav.catalogue"), to: "/samples/admin/services", icon: <ContentCutOutlined /> },
    { id: "payments", label: t("nav.payments"), to: "/samples/admin/payments", icon: <PaymentsOutlined /> },
    { id: "settings", label: t("nav.settings"), to: "/samples/admin/settings", icon: <SettingsOutlined /> },
  ];
}
