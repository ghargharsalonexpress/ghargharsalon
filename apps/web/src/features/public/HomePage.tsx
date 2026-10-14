import { CATALOG_GENDERS, type CategoryDto, type CatalogResponse, pick } from "@brand/shared";
import ChevronRightOutlined from "@mui/icons-material/ChevronRightOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { brand } from "@/brand";
import { Button, FaqList, InlineAlert, Link, Picture } from "@/design-system";
import { useCatalog } from "@/features/catalog/api";
import { formatMoney } from "@/lib/format";
import { HeroBanner } from "./HeroBanner";
import { useInfo } from "./info";
import { usePageMeta } from "./usePageMeta";

const FAQ_KEYS = ["1", "2", "3", "4", "5"] as const;

/** Home (plan Phase 3): an honest promise, categories with real prices, how it works, trust, FAQ. */
export function HomePage() {
  const { t } = useTranslation("public");
  const { tokens } = useTheme();
  const info = useInfo();
  const n = tokens.neutral;
  const container = { maxWidth: tokens.container.marketing } as const;
  const section = { borderTop: `1px solid ${n[200]}`, scrollMarginTop: 72 } as const;
  const promise = { min: brand.promiseMinutes.min, max: brand.promiseMinutes.max };

  usePageMeta(t("meta.homeTitle", promise), t("meta.homeDescription", promise));

  return (
    <>
      <HeroBanner />

      <Box component="section" id="categories" aria-labelledby="categories-title" sx={section}>
        <Container maxWidth={false} sx={{ ...container, py: { xs: 12, md: 20 } }}>
          <Typography id="categories-title" variant="h2">
            {t("home.categoriesTitle")}
          </Typography>
          <Categories />
        </Container>
      </Box>

      <Box component="section" id="how-it-works" aria-labelledby="how-title" sx={{ ...section, bgcolor: n[25] }}>
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

      <Box component="section" id="trust" aria-labelledby="trust-title" sx={section}>
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

      <Box component="section" id="faq" aria-labelledby="faq-title" sx={section}>
        <Container maxWidth={false} sx={{ ...container, py: { xs: 12, md: 20 } }}>
          <Box sx={{ display: "grid", gap: { xs: 6, md: 12 }, gridTemplateColumns: { xs: "1fr", md: "4fr 8fr" }, alignItems: "start" }}>
            <Box>
              <Typography id="faq-title" variant="h2">
                {t("home.faqTitle")}
              </Typography>
              <Typography sx={{ mt: 3, color: "text.secondary" }}>
                {t("home.faqMore")}{" "}
                <Link to="/contact">{t("home.faqContact")}</Link>
              </Typography>
            </Box>
            <FaqList items={FAQ_KEYS.map((key) => ({ question: t(`home.faq.q${key}`), answer: t(`home.faq.a${key}`, { ...promise, searchMinutes: Math.round(info.searchTimeoutSeconds / 60) }) }))} />
          </Box>
        </Container>
      </Box>

      <Box component="section" aria-labelledby="join-title" sx={{ ...section, bgcolor: tokens.accent[50] }}>
        <Container maxWidth={false} sx={{ ...container, py: { xs: 12, md: 16 }, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <Box sx={{ maxWidth: "52ch" }}>
            <Typography id="join-title" variant="h2">
              {t("home.joinTitle")}
            </Typography>
            <Typography sx={{ mt: 2, color: "text.secondary" }}>{t("home.joinBody")}</Typography>
          </Box>
          <Button size="lg" to="/register-as-professional">
            {t("home.joinCta")}
          </Button>
        </Container>
      </Box>

      <Box component="section" aria-labelledby="cta-title" sx={section}>
        <Container maxWidth={false} sx={{ ...container, py: { xs: 12, md: 16 }, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <Box sx={{ maxWidth: "52ch" }}>
            <Typography id="cta-title" variant="h2">
              {t("home.ctaTitle")}
            </Typography>
            <Typography sx={{ mt: 2, color: "text.secondary" }}>{t("home.ctaBody")}</Typography>
          </Box>
          <Button size="lg" to="/services">
            {t("home.cta")}
          </Button>
        </Container>
      </Box>
    </>
  );
}

/** Women's and men's categories side by side from md; each row shows the real count and lowest price. */
function Categories() {
  const { t } = useTranslation("public");
  const catalog = useCatalog();

  if (catalog.isError && !catalog.data) {
    return (
      <Box sx={{ mt: 8, maxWidth: 560 }}>
        <InlineAlert
          tone="danger"
          title={t("services.errorTitle")}
          action={
            <Button variant="tertiary" size="sm" onClick={() => void catalog.refetch()}>
              {t("common:action.retry")}
            </Button>
          }
        >
          {t("services.errorBody")}
        </InlineAlert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 8, display: "grid", gap: { xs: 10, md: 12 }, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
      {CATALOG_GENDERS.map((gender) => (
        <Box key={gender}>
          <Typography variant="h3" component="h3" sx={{ pb: 3, borderBottom: (theme) => `1px solid ${theme.tokens.neutral[900]}` }}>
            {t(`home.${gender}`)}
          </Typography>
          <Box component="ul" aria-busy={!catalog.data} sx={{ listStyle: "none", m: 0, p: 0 }}>
            {catalog.data
              ? catalog.data.categories.filter((category) => category.gender === gender).map((category) => <CategoryRow key={category.slug} category={category} catalog={catalog.data} />)
              : [0, 1, 2, 3].map((index) => <CategoryRowSkeleton key={index} />)}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function CategoryRow({ category, catalog }: { category: CategoryDto; catalog: CatalogResponse }) {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const lang = i18n.language;
  const services = catalog.services.filter((service) => service.categorySlugs.includes(category.slug));
  if (services.length === 0) return null;
  const fromPaise = Math.min(...services.map((service) => service.fromPricePaise));

  return (
    <li>
      <Box
        component={RouterLink}
        to={`/services?category=${category.slug}`}
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "72px minmax(0, 1fr) auto", sm: "96px minmax(0, 1fr) auto" },
          alignItems: "center",
          gap: 4,
          py: 4,
          color: "inherit",
          textDecoration: "none",
          borderBottom: `1px solid ${tokens.neutral[200]}`,
          "&:hover .category-name": { textDecoration: "underline", textUnderlineOffset: "0.2em" },
          "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 2, borderRadius: `${tokens.radius.sm}px` },
        }}
      >
        <Picture image={category.image} alt="" sizes={96} ratio="1 / 1" />
        <Box sx={{ minWidth: 0 }}>
          <Typography className="category-name" component="span" sx={{ display: "block", typography: "h3" }}>
            {pick(category.name, lang)}
          </Typography>
          <Typography variant="body2" component="span" sx={{ display: "block", mt: 1, color: "text.secondary" }}>
            {pick(category.description, lang)}
          </Typography>
          {/* Lines may break only at the separator, never inside "From ₹1,499". */}
          <Typography variant="body2" component="span" sx={{ display: "block", mt: 1, color: "text.primary" }}>
            <Box component="span" sx={{ whiteSpace: "nowrap" }}>
              {t("home.servicesCount", { count: services.length })}
            </Box>
            {" · "}
            <Box component="span" sx={{ whiteSpace: "nowrap" }}>
              {t("services.from", { price: formatMoney(fromPaise, lang) })}
            </Box>
          </Typography>
        </Box>
        <ChevronRightOutlined aria-hidden sx={{ color: tokens.neutral[600] }} />
      </Box>
    </li>
  );
}

function CategoryRowSkeleton() {
  return (
    <Box component="li" aria-hidden sx={{ display: "grid", gridTemplateColumns: { xs: "72px 1fr", sm: "96px 1fr" }, alignItems: "center", gap: 4, py: 4 }}>
      <Skeleton variant="rounded" sx={{ width: "100%", height: "auto", aspectRatio: "1 / 1" }} />
      <Box>
        <Skeleton width="50%" height={28} />
        <Skeleton width="80%" />
        <Skeleton width="40%" />
      </Box>
    </Box>
  );
}
