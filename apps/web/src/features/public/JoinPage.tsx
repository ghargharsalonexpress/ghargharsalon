import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { brand } from "@/brand";
import { Button } from "@/design-system";
import { usePageMeta } from "./usePageMeta";

const STEPS = ["apply", "verify", "password", "online"] as const;

/** A Google Form can be shown inside the page (?embedded=true); other form links only open. */
function embeddableForm(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "docs.google.com" || !parsed.pathname.startsWith("/forms/")) return null;
    parsed.searchParams.set("embedded", "true");
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * /register-as-professional (plan A3, W11). The form is the point of the page, so it comes
 * first and the four onboarding steps sit beside it; previously they pushed it below the fold.
 * Without a form link, applications go to support by email.
 */
export function JoinPage() {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  usePageMeta(t("join.title"), t("join.lead"));
  const embedded = brand.professionalFormUrl ? embeddableForm(brand.professionalFormUrl) : null;

  const apply = brand.professionalFormUrl ? (
    <Button size="lg" href={brand.professionalFormUrl} target="_blank" rel="noopener noreferrer">
      {t("join.cta")}
    </Button>
  ) : (
    <Button size="lg" href={`mailto:${brand.supportEmail}?subject=${encodeURIComponent(t("join.emailSubject"))}`}>
      {t("join.emailCta", { email: brand.supportEmail })}
    </Button>
  );

  return (
    <Container maxWidth={false} sx={{ maxWidth: tokens.container.marketing, py: { xs: 8, md: 12 } }}>
      <Typography variant="h1">{t("join.title")}</Typography>
      <Typography variant="bodyLg" component="p" sx={{ mt: 3, color: "text.secondary", maxWidth: "62ch" }}>
        {t("join.lead")}
      </Typography>

      <Box sx={{ mt: { xs: 8, md: 10 }, display: "grid", gap: { xs: 10, md: 12 }, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 7fr) minmax(0, 4fr)" }, alignItems: "start" }}>
        <Box component="section" aria-labelledby="join-form">
          <Typography id="join-form" variant="h2">
            {t("join.formTitle")}
          </Typography>
          <Typography sx={{ mt: 2, color: "text.secondary" }}>{t("join.formLead")}</Typography>

          {embedded ? (
            <>
              <Box
                component="iframe"
                src={embedded}
                title={t("join.formTitle")}
                sx={{
                  display: "block",
                  width: "100%",
                  height: "min(85vh, 1100px)",
                  minHeight: 560,
                  mt: 5,
                  border: `1px solid ${tokens.neutral[200]}`,
                  borderRadius: `${tokens.radius.md}px`,
                  bgcolor: tokens.neutral[0],
                }}
              />
              <Button variant="secondary" href={brand.professionalFormUrl} target="_blank" rel="noopener noreferrer" sx={{ mt: 4 }}>
                {t("join.formNewTab")}
              </Button>
            </>
          ) : (
            <Box sx={{ mt: 5 }}>{apply}</Box>
          )}

          <Typography variant="body2" sx={{ mt: 4, color: "text.secondary" }}>
            {t("join.note")}
          </Typography>
        </Box>

        <Box
          component="section"
          aria-labelledby="join-steps"
          sx={{
            position: { md: "sticky" },
            top: 88,
            p: { xs: 5, md: 6 },
            borderRadius: `${tokens.radius.md}px`,
            bgcolor: tokens.accent[50],
            border: `1px solid ${tokens.accent[200]}`,
          }}
        >
          <Typography id="join-steps" variant="h3" component="h2">
            {t("join.stepsTitle")}
          </Typography>
          <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, mt: 5, display: "grid", gap: 5 }}>
            {STEPS.map((key, index) => (
              <Box component="li" key={key} sx={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 3 }}>
                <Typography variant="numericXl" component="span" aria-hidden sx={{ color: tokens.accent[700], lineHeight: 1.1 }}>
                  {index + 1}
                </Typography>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{t(`join.steps.${key}Title`)}</Typography>
                  <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                    {t(`join.steps.${key}Body`)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Container>
  );
}
