import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { InlineAlert, OnlineToggle } from "@/design-system";
import { errorText } from "@/lib/errors";
import { formatRelativeFromNow } from "@/lib/format";
import { DeviceError } from "./api";
import { usePresence } from "./presenceContext";
import { ReadinessChecklist } from "./ReadinessChecklist";
import { useReadiness } from "./readiness";

/**
 * Pro Home (plan Phase 4, W12): the Online switch, gated by readiness, and the checklist that
 * gets a phone ready for job alerts. Hindi first; every step says exactly what to do.
 */
export function ProHomePage() {
  const { t, i18n } = useTranslation("pro");
  const presence = usePresence();
  const { me } = presence;
  const readiness = useReadiness(me);

  const reason = !me.verified ? t("home.reasonVerify") : !readiness.ready ? t("home.reasonSteps") : undefined;
  const failure = presence.error;
  const failureText =
    failure instanceof DeviceError ? t(`home.locationError.${failure.reason}`) : failure ? errorText(t, failure) : null;

  return (
    <Box sx={{ display: "grid", gap: 6 }}>
      <Box>
        <Typography variant="h2">{t("home.greeting", { name: me.name.split(" ")[0] })}</Typography>
        {presence.presence.since && presence.online && (
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            {t("home.onlineSince", { time: formatRelativeFromNow(new Date(presence.presence.since), i18n.language) })}
          </Typography>
        )}
      </Box>

      {!me.verified && <InlineAlert tone="info" title={t("home.verifyTitle")}>{t("home.verifyBody")}</InlineAlert>}

      <OnlineToggle
        online={presence.online}
        onChange={(next) => void (next ? presence.goOnline() : presence.goOffline())}
        label={presence.online ? t("toggle.online") : t("toggle.offline")}
        description={presence.online ? t("toggle.onlineBody") : t("toggle.offlineBody")}
        pending={presence.pending}
        disabled={!presence.online && Boolean(reason)}
        reason={presence.online ? undefined : reason}
      />
      {failureText && <InlineAlert tone="danger">{failureText}</InlineAlert>}
      {presence.online && <InlineAlert tone="info">{t("home.keepOpen")}</InlineAlert>}

      {(!readiness.ready || !readiness.install || !readiness.battery) && <ReadinessChecklist me={me} readiness={readiness} />}
    </Box>
  );
}
