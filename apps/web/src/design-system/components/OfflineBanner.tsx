import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { Banner } from "./Banner";

/** Shown under every shell's top bar while the device is offline (plan B8, C13). */
export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  if (online) return null;
  return <Banner tone="warning">{t("state.offline")}</Banner>;
}
