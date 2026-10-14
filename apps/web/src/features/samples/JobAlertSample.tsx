import { useState } from "react";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Button, CountdownRing, LanguageSwitch } from "@/design-system";
import { formatDistance, formatMoney } from "@/lib/format";

/**
 * Full-screen job offer (plan Phase 6 UX): distance and travel time, locality only
 * (never the exact address before accepting), services, earnings, a 30 s ring and
 * one-hand actions at the bottom.
 */
export function JobAlertSample() {
  const { t, i18n } = useTranslation("samples");
  const { tokens } = useTheme();
  const [endsAt, setEndsAt] = useState(() => Date.now() + 30_000);
  const n = tokens.neutral;
  const lang = i18n.language;

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: n[0], display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", px: 4, pt: "calc(12px + env(safe-area-inset-top))" }}>
        <LanguageSwitch name="language-job-alert" />
      </Box>
      <Box component="main" id="main" sx={{ flex: 1, width: "100%", maxWidth: 480, mx: "auto", px: 5, pt: 4, display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <Box>
            <Typography variant="h1" component="h1">
              {t("jobAlert.title")}
            </Typography>
            <Typography sx={{ mt: 1, color: "text.secondary" }}>
              {t("jobAlert.away", { distance: formatDistance(1_200, lang), minutes: 6 })}
            </Typography>
          </Box>
          <CountdownRing totalSeconds={30} endsAt={endsAt} size={96} onExpire={() => undefined} />
        </Box>

        <Box component="dl" sx={{ m: 0, mt: 8, border: `1px solid ${n[200]}`, borderRadius: `${tokens.radius.md}px`, overflow: "hidden" }}>
          <Box sx={{ p: 5, borderBottom: `1px solid ${n[200]}` }}>
            <Typography component="dt" variant="label" sx={{ color: "text.secondary" }}>
              {t("jobAlert.servicesLabel")}
            </Typography>
            <Typography component="dd" variant="h3" sx={{ m: 0, mt: 1 }}>
              {t("checkout.items.facial")}
            </Typography>
            <Typography component="dd" sx={{ m: 0 }}>
              {t("checkout.items.wax")}
            </Typography>
          </Box>
          <Box sx={{ p: 5, borderBottom: `1px solid ${n[200]}` }}>
            <Typography component="dt" variant="label" sx={{ color: "text.secondary" }}>
              {t("jobAlert.areaLabel")}
            </Typography>
            <Typography component="dd" sx={{ m: 0, mt: 1 }}>
              {t("jobAlert.area")}
            </Typography>
          </Box>
          <Box sx={{ p: 5, bgcolor: n[25] }}>
            <Typography component="dt" variant="label" sx={{ color: "text.secondary" }}>
              {t("jobAlert.earnLabel")}
            </Typography>
            <Typography component="dd" variant="numericXl" sx={{ m: 0, mt: 1, display: "block", color: tokens.semantic.success.fg }}>
              {formatMoney(78_700, lang)}
            </Typography>
          </Box>
        </Box>

        <Typography variant="body2" sx={{ mt: 6, color: "text.secondary", textAlign: "center" }}>
          {t("jobAlert.keepOpen")}
        </Typography>

        <Box sx={{ mt: "auto", pt: 8, pb: "calc(20px + env(safe-area-inset-bottom))", display: "grid", gap: 3 }}>
          <Button size="lg" fullWidth onClick={() => setEndsAt(Date.now() + 30_000)} sx={{ minHeight: 56 }}>
            {t("jobAlert.accept")}
          </Button>
          <Button size="lg" variant="secondary" fullWidth>
            {t("jobAlert.decline")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
