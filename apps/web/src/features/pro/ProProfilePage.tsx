import { formatIndianMobile, SKILL_LABELS } from "@brand/shared";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { brand } from "@/brand";
import { Avatar, Badge, Button, LanguageSwitch, Link } from "@/design-system";
import { useSignOut } from "@/features/auth/useSignOut";
import { usePresence } from "./presenceContext";

/** The professional's profile (plan A7 /pro/profile). Details are kept by the team; changes go through support. */
export function ProProfilePage() {
  const { t, i18n } = useTranslation("pro");
  const { tokens } = useTheme();
  const { me, online } = usePresence();
  const { signOut, pending } = useSignOut();
  const lang = i18n.language === "hi" ? "hi" : "en";

  const rows: Array<[string, string]> = [
    [t("profile.phone"), `+91 ${formatIndianMobile(me.phone)}`],
    [t("profile.email"), me.email ?? "—"],
    [t("profile.area"), me.baseArea],
    [t("profile.radius"), t("profile.radiusValue", { count: me.travelRadiusKm })],
    [t("profile.skills"), me.skills.map((skill) => SKILL_LABELS[skill][lang]).join(", ")],
  ];

  return (
    <Box sx={{ display: "grid", gap: 6 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Avatar name={me.name} size="lg" />
        <Box>
          <Typography variant="h2">{me.name}</Typography>
          <Box sx={{ mt: 1 }}>{me.verified ? <Badge tone="success">{t("profile.verified")}</Badge> : <Badge tone="warning">{t("profile.notVerified")}</Badge>}</Box>
        </Box>
      </Box>

      <Box component="dl" sx={{ m: 0, bgcolor: tokens.neutral[0], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px`, px: 5 }}>
        {rows.map(([label, value]) => (
          <Box key={label} sx={{ py: 3, "& + &": { borderTop: `1px solid ${tokens.neutral[200]}` } }}>
            <Typography component="dt" variant="body2" sx={{ color: "text.secondary" }}>
              {label}
            </Typography>
            <Typography component="dd" sx={{ m: 0, mt: 0.5 }}>
              {value}
            </Typography>
          </Box>
        ))}
      </Box>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {t("profile.changes")} <Link href={`tel:${brand.supportPhone.replace(/\s/g, "")}`}>{brand.supportPhone}</Link>
      </Typography>

      <Divider />
      <LanguageSwitch name="language-pro" variant="full" label={t("profile.language")} />
      <Divider />

      <Box>
        <Button variant="secondary" size="lg" fullWidth onClick={signOut} loading={pending} disabled={online}>
          {t("common:action.logout")}
        </Button>
        {online && (
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            {t("profile.logoutOnline")}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
