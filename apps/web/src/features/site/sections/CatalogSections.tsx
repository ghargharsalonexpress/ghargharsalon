import { useState } from "react";
import { CATALOG_GENDERS, type CatalogGender, type CatalogResponse, type CategoryDto, pick, type SectionOf } from "@brand/shared";
import ArrowForwardOutlined from "@mui/icons-material/ArrowForwardOutlined";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { Button, InlineAlert, Picture, SegmentedControl } from "@/design-system";
import { useCatalog } from "@/features/catalog/api";
import { categoryPhoto, defaultPhotoFor } from "@/features/catalog/photos";
import { ServiceCard } from "@/features/public/ServiceCard";
import { formatMoney } from "@/lib/format";
import { useText } from "../text";
import { chooseServices } from "./chooseServices";
import { Carousel, CtaButton, Reveal, SectionHeading, SectionShell } from "./parts";
import { useTone } from "./tone";

const lowestPrice = (catalog: CatalogResponse, slug: string): number | null => {
  const prices = catalog.services.filter((service) => service.categorySlugs.includes(slug)).map((service) => service.fromPricePaise);
  return prices.length ? Math.min(...prices) : null;
};

const countIn = (catalog: CatalogResponse, slug: string) => catalog.services.filter((service) => service.categorySlugs.includes(slug)).length;

function CatalogError({ retry }: { retry: () => void }) {
  const { t } = useTranslation("public");
  return (
    <Box sx={{ maxWidth: 560, mx: "auto" }}>
      <InlineAlert
        tone="danger"
        title={t("services.errorTitle")}
        action={
          <Button variant="tertiary" size="sm" onClick={retry}>
            {t("common:action.retry")}
          </Button>
        }
      >
        {t("services.errorBody")}
      </InlineAlert>
    </Box>
  );
}

/** Categories as photo cards, round photos or tall posters, from the live catalogue. */
export function CategoriesSection({ section }: { section: SectionOf<"categories"> }) {
  const { t } = useTranslation("public");
  const catalog = useCatalog();
  const tone = useTone(section.tone);
  const fixed = section.layout === "women" || section.layout === "men" ? section.layout : null;
  const [gender, setGender] = useState<CatalogGender>(fixed ?? "women");
  const data = catalog.data;
  const withServices = (list: CategoryDto[]) => (data ? list.filter((category) => countIn(data, category.slug) > 0) : list);
  const of = (which: CatalogGender) => withServices((data?.categories ?? []).filter((category) => category.gender === which));

  let body;
  if (catalog.isError && !data) body = <CatalogError retry={() => void catalog.refetch()} />;
  else if (section.style === "posters") {
    const all = withServices(data?.categories ?? []);
    body = (
      <Carousel label={t("site.categories")} columns={{ xs: 1.6, sm: 2.6, md: 4, lg: 4 }} inverse={tone.inverse}>
        {data ? all.map((category) => <Poster key={category.slug} category={category} catalog={data} showPrice={section.showPrices} />) : [0, 1, 2, 3].map((key) => <Skeleton key={key} variant="rounded" sx={{ aspectRatio: "3 / 4", height: "auto" }} />)}
      </Carousel>
    );
  } else if (section.layout === "split") {
    body = (
      <Box sx={{ display: "grid", gap: { xs: 10, md: 12 }, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        {CATALOG_GENDERS.map((which) => (
          <Box key={which}>
            <Typography variant="h3" component="h3" sx={{ mb: 5 }}>
              {t(`home.${which}`)}
            </Typography>
            <Grid section={section} categories={of(which)} catalog={data} columns={{ xs: 2, sm: 3, md: 2 }} />
          </Box>
        ))}
      </Box>
    );
  } else {
    const which = fixed ?? gender;
    body = (
      <>
        {!fixed && (
          <Box sx={{ display: "flex", justifyContent: "center", mb: 8 }}>
            <SegmentedControl
              label={t("site.showFor")}
              name={`gender-${section.id}`}
              value={gender}
              onChange={setGender}
              options={CATALOG_GENDERS.map((value) => ({ value, label: t(`home.${value}`) }))}
            />
          </Box>
        )}
        <Grid section={section} categories={of(which)} catalog={data} columns={section.style === "circles" ? { xs: 3, sm: 4, md: 6 } : { xs: 2, sm: 3, md: 4 }} />
      </>
    );
  }

  return (
    <SectionShell section={section}>
      <SectionHeading section={section} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />
      {body}
      {section.cta.href && (
        <Box sx={{ mt: 10, display: "flex", justifyContent: "center" }}>
          <CtaButton cta={section.cta} variant="secondary" size="lg" inverse={tone.inverse} endIcon={<ArrowForwardOutlined />} />
        </Box>
      )}
    </SectionShell>
  );
}

function Grid({ section, categories, catalog, columns }: { section: SectionOf<"categories">; categories: CategoryDto[]; catalog: CatalogResponse | undefined; columns: { xs: number; sm: number; md: number } }) {
  return (
    <Box
      component="ul"
      aria-busy={!catalog}
      sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: { xs: 3, md: 5 }, gridTemplateColumns: { xs: `repeat(${columns.xs}, minmax(0, 1fr))`, sm: `repeat(${columns.sm}, minmax(0, 1fr))`, md: `repeat(${columns.md}, minmax(0, 1fr))` } }}
    >
      {catalog
        ? categories.map((category, index) => (
            <li key={category.slug}>
              <Reveal delay={Math.min(index, 6) * 60}>
                {section.style === "circles" ? <Circle category={category} catalog={catalog} showPrice={section.showPrices} /> : <Card category={category} catalog={catalog} showPrice={section.showPrices} />}
              </Reveal>
            </li>
          ))
        : [0, 1, 2, 3].map((key) => (
            <li key={key} aria-hidden>
              <Skeleton variant="rounded" sx={{ aspectRatio: section.style === "circles" ? "1 / 1" : "4 / 3", height: "auto", borderRadius: section.style === "circles" ? "50%" : undefined }} />
              <Skeleton width="70%" sx={{ mt: 2 }} />
            </li>
          ))}
    </Box>
  );
}

const linkReset = { color: "inherit", textDecoration: "none", display: "block", borderRadius: 2 } as const;

function useCategoryText(category: CategoryDto, catalog: CatalogResponse) {
  const { t, i18n } = useTranslation("public");
  const price = lowestPrice(catalog, category.slug);
  return {
    name: pick(category.name, i18n.language),
    from: price === null ? "" : t("services.from", { price: formatMoney(price, i18n.language) }),
    count: t("home.servicesCount", { count: countIn(catalog, category.slug) }),
  };
}

function Card({ category, catalog, showPrice }: { category: CategoryDto; catalog: CatalogResponse; showPrice: boolean }) {
  const { tokens } = useTheme();
  const { name, from, count } = useCategoryText(category, catalog);
  return (
    <Box
      component={RouterLink}
      to={`/services?category=${category.slug}`}
      sx={{
        ...linkReset,
        "& .photo img": { transition: "transform 500ms ease" },
        "@media (hover: hover)": { "&:hover .photo img": { transform: "scale(1.06)" }, "&:hover .name": { color: tokens.accent[700] } },
        "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 3 },
      }}
    >
      <Box className="photo" sx={{ borderRadius: `${tokens.radius.lg}px`, overflow: "hidden", bgcolor: tokens.accent[50], boxShadow: "0 1px 2px rgba(31,28,25,0.06)" }}>
        <Picture image={categoryPhoto(category)} fallback={defaultPhotoFor([category.slug])} alt="" sizes="(min-width: 900px) 280px, 45vw" ratio="4 / 3" radius="lg" />
      </Box>
      <Typography className="name" component="span" sx={{ display: "block", mt: 3, typography: "h3", fontSize: { xs: "1rem", md: "1.125rem" }, transition: "color 160ms ease" }}>
        {name}
      </Typography>
      <Typography variant="body2" component="span" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
        {showPrice && from ? (
          <>
            <Box component="span" sx={{ whiteSpace: "nowrap", color: tokens.accent[700], fontWeight: 600 }}>
              {from}
            </Box>
            {" · "}
          </>
        ) : null}
        <Box component="span" sx={{ whiteSpace: "nowrap" }}>
          {count}
        </Box>
      </Typography>
    </Box>
  );
}

function Circle({ category, catalog, showPrice }: { category: CategoryDto; catalog: CatalogResponse; showPrice: boolean }) {
  const { tokens } = useTheme();
  const { name, from } = useCategoryText(category, catalog);
  return (
    <Box
      component={RouterLink}
      to={`/services?category=${category.slug}`}
      sx={{
        ...linkReset,
        textAlign: "center",
        "& .photo": { transition: "box-shadow 200ms ease, transform 200ms ease" },
        "@media (hover: hover)": { "&:hover .photo": { boxShadow: `0 0 0 3px ${tokens.accent[500]}`, transform: "translateY(-2px)" } },
        "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 3 },
      }}
    >
      <Box className="photo" sx={{ borderRadius: "50%", overflow: "hidden", bgcolor: tokens.accent[50], mx: "auto", width: "100%", maxWidth: 160 }}>
        <Picture image={categoryPhoto(category)} fallback={defaultPhotoFor([category.slug])} alt="" sizes={160} ratio="1 / 1" radius="lg" sx={{ borderRadius: "50%" }} />
      </Box>
      <Typography component="span" sx={{ display: "block", mt: 3, fontWeight: 600, fontSize: { xs: "0.875rem", md: "1rem" }, lineHeight: 1.3 }}>
        {name}
      </Typography>
      {showPrice && from && (
        <Typography variant="caption" component="span" sx={{ display: "block", mt: 0.5, color: tokens.accent[700] }}>
          {from}
        </Typography>
      )}
    </Box>
  );
}

function Poster({ category, catalog, showPrice }: { category: CategoryDto; catalog: CatalogResponse; showPrice: boolean }) {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const name = pick(category.name, i18n.language);
  const price = lowestPrice(catalog, category.slug);
  return (
    <Box
      component={RouterLink}
      to={`/services?category=${category.slug}`}
      sx={{
        ...linkReset,
        position: "relative",
        borderRadius: `${tokens.radius.lg}px`,
        overflow: "hidden",
        "& img": { transition: "transform 600ms ease" },
        "@media (hover: hover)": { "&:hover img": { transform: "scale(1.05)" } },
        "&:focus-visible": { outline: `2px solid ${tokens.accent[600]}`, outlineOffset: 3 },
      }}
    >
      <Picture image={categoryPhoto(category)} fallback={defaultPhotoFor([category.slug])} alt="" sizes="(min-width: 900px) 290px, 60vw" ratio="3 / 4" radius="lg" />
      <Box aria-hidden sx={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.78) 100%)" }} />
      <Box sx={{ position: "absolute", left: 0, right: 0, bottom: 0, p: { xs: 4, md: 5 }, color: tokens.neutral[0] }}>
        <Typography component="span" sx={{ display: "block", typography: "h3", color: tokens.neutral[0], lineHeight: 1.25 }}>
          {name}
        </Typography>
        {showPrice && price !== null && (
          <Box component="span" sx={{ mt: 2, display: "inline-flex", alignItems: "baseline", gap: 1, px: 2.5, py: 0.75, borderRadius: 999, bgcolor: tokens.neutral[0], color: tokens.neutral[900], typography: "body2" }}>
            {t("site.startingAt")}
            <Box component="span" sx={{ fontWeight: 700, color: tokens.accent[700] }}>
              {formatMoney(price, i18n.language)}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/** Services from the catalogue as cards with Add: picked by the admin, or a mix across categories. */
export function ServicesSection({ section }: { section: SectionOf<"services"> }) {
  const { t } = useTranslation("public");
  const catalog = useCatalog();
  const tone = useTone(section.tone);
  const text = useText();
  const data = catalog.data;
  const services = data ? chooseServices(section, data) : [];

  return (
    <SectionShell section={section}>
      <SectionHeading
        section={section}
        eyebrow={section.eyebrow}
        title={section.title}
        subtitle={section.subtitle}
        align="left"
        action={<CtaButton cta={section.cta} variant="secondary" inverse={tone.inverse} endIcon={<ArrowForwardOutlined />} />}
      />
      {catalog.isError && !data ? (
        <CatalogError retry={() => void catalog.refetch()} />
      ) : data ? (
        <Carousel label={text(section.title) || t("site.services")} columns={{ xs: 1.25, sm: 2.2, md: 3, lg: 4 }} inverse={tone.inverse}>
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} detailsTo={`/services/${service.slug}`} />
          ))}
        </Carousel>
      ) : (
        <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" } }} aria-hidden>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} variant="rounded" sx={{ height: 360 }} />
          ))}
        </Box>
      )}
    </SectionShell>
  );
}
