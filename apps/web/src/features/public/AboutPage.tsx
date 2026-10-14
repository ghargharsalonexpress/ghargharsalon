import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { brand } from "@/brand";
import { Button } from "@/design-system";
import { usePageMeta } from "./usePageMeta";

/** About (plan A7): what we do, how professionals are chosen, the promise; reading layout. */
export function AboutPage() {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const promise = { min: brand.promiseMinutes.min, max: brand.promiseMinutes.max };

  usePageMeta(t("meta.aboutTitle"), t("about.lead", promise));

  return (
    <Container maxWidth={false} sx={{ maxWidth: tokens.container.reading, py: { xs: 8, md: 16 } }}>
      <Typography variant="h1">{t("about.title")}</Typography>
      <Typography variant="bodyLg" component="p" sx={{ mt: 4, color: "text.secondary" }}>
        {t("about.lead", promise)}
      </Typography>

      {(["what", "pros", "promise"] as const).map((key) => (
        <Box key={key} component="section" aria-labelledby={`about-${key}`} sx={{ mt: { xs: 10, md: 12 } }}>
          <Typography id={`about-${key}`} variant="h2">
            {t(`about.${key}Title`)}
          </Typography>
          <Typography sx={{ mt: 3 }}>{t(`about.${key}Body`, promise)}</Typography>
        </Box>
      ))}

      <Box component="section" aria-labelledby="about-join" sx={{ mt: { xs: 10, md: 12 }, p: { xs: 5, md: 8 }, bgcolor: tokens.neutral[25], border: `1px solid ${tokens.neutral[200]}`, borderRadius: `${tokens.radius.md}px` }}>
        <Typography id="about-join" variant="h2" sx={{ typography: "h3" }}>
          {t("about.joinTitle")}
        </Typography>
        <Typography sx={{ mt: 2, color: "text.secondary" }}>{t("about.joinBody")}</Typography>
        <Button variant="secondary" to="/register-as-professional" sx={{ mt: 5 }}>
          {t("about.joinCta")}
        </Button>
      </Box>
    </Container>
  );
}
