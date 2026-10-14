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
 * /register-as-professional (plan A3, W11): explains onboarding, then the application form,
 * shown in the page when it's a Google Form. Without a form link, applications go to support.
 */
export function JoinPage() {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  usePageMeta(t("join.title"), t("join.lead"));
  const embedded = brand.professionalFormUrl ? embeddableForm(brand.professionalFormUrl) : null;

  return (
    <Container maxWidth={false} sx={{ maxWidth: tokens.container.reading, py: { xs: 8, md: 16 } }}>
      <Typography variant="h1">{t("join.title")}</Typography>
      <Typography variant="bodyLg" component="p" sx={{ mt: 4, color: "text.secondary" }}>
        {t("join.lead")}
      </Typography>

      <Box component="section" aria-labelledby="join-steps" sx={{ mt: { xs: 10, md: 12 } }}>
        <Typography id="join-steps" variant="h2">
          {t("join.stepsTitle")}
        </Typography>
        <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, mt: 6, display: "grid", gap: 6 }}>
          {STEPS.map((key, index) => (
            <Box component="li" key={key} sx={{ display: "grid", gridTemplateColumns: "40px 1fr", gap: 4 }}>
              <Typography variant="numericXl" component="span" aria-hidden sx={{ color: tokens.accent[600], lineHeight: 1.1 }}>
                {index + 1}
              </Typography>
              <Box>
                <Typography variant="h3" component="h3">
                  {t(`join.steps.${key}Title`)}
                </Typography>
                <Typography sx={{ mt: 1, color: "text.secondary" }}>{t(`join.steps.${key}Body`)}</Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {embedded ? (
        <Box component="section" aria-labelledby="join-form" sx={{ mt: { xs: 10, md: 12 } }}>
          <Typography id="join-form" variant="h2">
            {t("join.formTitle")}
          </Typography>
          <Typography sx={{ mt: 2, color: "text.secondary" }}>{t("join.formLead")}</Typography>
          <Box
            component="iframe"
            src={embedded}
            title={t("join.formTitle")}
            loading="lazy"
            sx={{
              display: "block",
              width: "100%",
              height: "min(85vh, 1100px)",
              minHeight: 560,
              mt: 6,
              border: `1px solid ${tokens.neutral[200]}`,
              borderRadius: `${tokens.radius.md}px`,
              bgcolor: tokens.neutral[0],
            }}
          />
          <Button variant="secondary" href={brand.professionalFormUrl} target="_blank" rel="noopener noreferrer" sx={{ mt: 4 }}>
            {t("join.formNewTab")}
          </Button>
        </Box>
      ) : (
        <Box sx={{ mt: { xs: 10, md: 12 }, display: "flex", flexWrap: "wrap", gap: 3 }}>
          {brand.professionalFormUrl ? (
            <Button size="lg" href={brand.professionalFormUrl} target="_blank" rel="noopener noreferrer">
              {t("join.cta")}
            </Button>
          ) : (
            <Button size="lg" href={`mailto:${brand.supportEmail}?subject=${encodeURIComponent(t("join.emailSubject"))}`}>
              {t("join.emailCta", { email: brand.supportEmail })}
            </Button>
          )}
        </Box>
      )}
      <Typography variant="body2" sx={{ mt: 4, color: "text.secondary" }}>
        {t("join.note")}
      </Typography>
    </Container>
  );
}
