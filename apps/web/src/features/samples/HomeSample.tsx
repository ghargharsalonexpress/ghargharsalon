import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { PublicShell } from "@/design-system";
import { formatMoney } from "@/lib/format";
import { HeroBanner } from "@/features/public/HeroBanner";
import { usePublicNav } from "./navigation";

const CATEGORIES = [
  { id: "salon", count: 119, fromPaise: 19_900 },
  { id: "makeup", count: 25, fromPaise: 149_900 },
  { id: "hair", count: 18, fromPaise: 39_900 },
  { id: "spa", count: 33, fromPaise: 97_000 },
  { id: "menGrooming", count: 6, fromPaise: 29_900 },
  { id: "menMassage", count: 10, fromPaise: 99_900 },
] as const;

type Ratio = string | { xs: string; sm?: string; md?: string };

/**
 * Neutral tile wherever the client's photography will go (plan B6: no fake photos).
 * With a note it stands in for a real image; without one it is decorative.
 */
function PhotoPlaceholder({ ratio, note }: { ratio: Ratio; note?: string }) {
  const { tokens } = useTheme();
  return (
    <Box
      role={note ? "img" : undefined}
      aria-label={note}
      aria-hidden={note ? undefined : true}
      sx={{
        aspectRatio: ratio,
        width: "100%",
        borderRadius: `${tokens.radius.md}px`,
        bgcolor: tokens.neutral[100],
        display: "flex",
        alignItems: "flex-end",
        p: 4,
      }}
    >
      {note && (
        <Typography variant="caption" component="span" aria-hidden sx={{ color: tokens.neutral[600] }}>
          {note}
        </Typography>
      )}
    </Box>
  );
}

export function HomeSample() {
  const { t, i18n } = useTranslation("samples");
  const { tokens } = useTheme();
  const nav = usePublicNav();
  const n = tokens.neutral;
  const container = { maxWidth: tokens.container.marketing } as const;

  return (
    <PublicShell nav={nav} cartCount={2} cartTo="/samples/checkout" accountLabel={t("nav.login")} accountTo="/samples/checkout">
      <HeroBanner still />

      <Box component="section" id="categories" aria-labelledby="categories-title" sx={{ borderTop: `1px solid ${n[200]}`, scrollMarginTop: 72 }}>
        <Container maxWidth={false} sx={{ ...container, py: { xs: 12, md: 20 } }}>
          <Typography id="categories-title" variant="h2">
            {t("home.categoriesTitle")}
          </Typography>
          <Box
            component="ul"
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              mt: 8,
              display: "grid",
              gap: { xs: 4, md: 6 },
              gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
            }}
          >
            {CATEGORIES.map((category) => (
              <li key={category.id}>
                <Box
                  component={RouterLink}
                  to="/samples/checkout"
                  sx={{
                    display: "block",
                    color: "inherit",
                    textDecoration: "none",
                    borderRadius: `${tokens.radius.md}px`,
                    "&:hover .category-title": { textDecoration: "underline" },
                    "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 4 },
                  }}
                >
                  <PhotoPlaceholder ratio="4 / 3" />
                  <Typography className="category-title" variant="h3" component="h3" sx={{ mt: 3 }}>
                    {t(`home.categories.${category.id}`)}
                  </Typography>
                  {/* Lines may break only at the separator, never inside "From ₹1,499". */}
                  <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                    <Box component="span" sx={{ whiteSpace: "nowrap" }}>
                      {t("home.servicesCount", { count: category.count })}
                    </Box>
                    {" · "}
                    <Box component="span" sx={{ whiteSpace: "nowrap" }}>
                      {t("home.from", { price: formatMoney(category.fromPaise, i18n.language) })}
                    </Box>
                  </Typography>
                </Box>
              </li>
            ))}
          </Box>
        </Container>
      </Box>

      <Box component="section" id="trust" aria-labelledby="trust-title" sx={{ bgcolor: n[25], borderTop: `1px solid ${n[200]}`, scrollMarginTop: 72 }}>
        <Container maxWidth={false} sx={{ ...container, py: { xs: 12, md: 20 } }}>
          <Typography id="trust-title" variant="h2">
            {t("home.trustTitle")}
          </Typography>
          <Box sx={{ mt: 8, display: "grid", gap: { xs: 8, md: 10 }, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
            {(["verified", "otp", "price"] as const).map((key) => (
              <Box key={key}>
                <Box aria-hidden sx={{ width: 32, height: 2, bgcolor: tokens.accent[600], mb: 4 }} />
                <Typography variant="h3" component="h3">
                  {t(`home.trust.${key}Title`)}
                </Typography>
                <Typography sx={{ mt: 2, color: "text.secondary" }}>{t(`home.trust.${key}Body`)}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <Box component="section" id="how-it-works" aria-labelledby="how-title" sx={{ borderTop: `1px solid ${n[200]}`, scrollMarginTop: 72 }}>
        <Container maxWidth={false} sx={{ ...container, py: { xs: 12, md: 20 } }}>
          <Typography id="how-title" variant="h2">
            {t("home.stepsTitle")}
          </Typography>
          <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, mt: 8, display: "grid", gap: { xs: 8, md: 10 }, gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" } }}>
            {(["one", "two", "three"] as const).map((key, index) => (
              <Box component="li" key={key}>
                <Typography variant="numericXl" component="span" aria-hidden sx={{ color: tokens.accent[600] }}>
                  {index + 1}
                </Typography>
                <Typography variant="h3" component="h3" sx={{ mt: 2 }}>
                  {t(`home.steps.${key}Title`)}
                </Typography>
                <Typography sx={{ mt: 2, color: "text.secondary" }}>{t(`home.steps.${key}Body`)}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>
    </PublicShell>
  );
}
