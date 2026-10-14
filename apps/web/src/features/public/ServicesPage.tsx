import { useMemo } from "react";
import { type CatalogGender, type CategoryDto, pick, type ServiceSummaryDto } from "@brand/shared";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Outlet, useSearchParams } from "react-router";
import { ActionBar, Button, ChoiceChips, EmptyState, IconButton, InlineAlert, SegmentedControl, TextField, useUrlText } from "@/design-system";
import { cartCount, cartEstimatePaise, useCart } from "@/features/cart/cartStore";
import { useCatalog } from "@/features/catalog/api";
import { formatMoney } from "@/lib/format";
import { ServiceRow } from "./ServiceRow";
import { usePageMeta } from "./usePageMeta";

/** Services shown per category before "See all" when no category is chosen. */
const PREVIEW_COUNT = 6;

/** Lower-case, accents removed, so "facial" finds "Facial" and "Fàcial". */
const normalise = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

function matches(service: ServiceSummaryDto, words: string[], lang: string): boolean {
  const haystack = normalise([pick(service.name, lang), service.name.en, pick(service.summary, lang), service.summary.en].join(" "));
  return words.every((word) => haystack.includes(word));
}

/**
 * Services (plan Phase 3, W1). Gender, category, filter and search live in the URL, so the
 * back button, reloads and shared links all keep the view. Details open as a sheet on top.
 */
export function ServicesPage() {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  const catalog = useCatalog();
  const lines = useCart((state) => state.lines);

  usePageMeta(t("meta.servicesTitle"), t("meta.servicesDescription"));

  const categories = catalog.data?.categories ?? [];
  const category = categories.find((item) => item.slug === params.get("category")) ?? null;
  // A category link decides the gender, so "?category=men-grooming" never shows women's chips.
  const gender: CatalogGender = category?.gender ?? (params.get("gender") === "men" ? "men" : "women");
  const filterSlug = category?.filters.some((filter) => filter.slug === params.get("filter")) ? params.get("filter") : null;
  const query = params.get("q") ?? "";
  const words = normalise(query.trim()).split(/\s+/).filter(Boolean);

  // Starts from the address bar, not this render's params: two quick changes (a tap, then typing)
  // must not overwrite each other before the page re-renders.
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const searchField = useUrlText(query, (value) => update({ q: value || null, category: null, filter: null }));

  const services = useMemo(() => (catalog.data?.services ?? []).filter((service) => service.gender === gender), [catalog.data, gender]);
  const genderCategories = categories.filter((item) => item.gender === gender && services.some((service) => service.categorySlugs.includes(item.slug)));
  const detailsTo = (slug: string) => `/services/${slug}${params.size > 0 ? `?${params.toString()}` : ""}`;

  const count = cartCount(lines);

  return (
    <>
      <Container maxWidth={false} sx={{ maxWidth: tokens.container.marketing, pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 12 } }}>
        <Typography variant="h1">{t("services.title")}</Typography>

        <Box sx={{ mt: 6, display: "grid", gap: 4, gridTemplateColumns: { xs: "1fr", md: "auto minmax(0, 420px)" }, justifyContent: "space-between", alignItems: "end" }}>
          <SegmentedControl
            label={t("services.for")}
            name="gender"
            value={gender}
            onChange={(value) => update({ gender: value === "women" ? null : value, category: null, filter: null })}
            options={[
              { value: "women", label: t("services.women") },
              { value: "men", label: t("services.men") },
            ]}
          />
          <TextField
            label={t("services.search")}
            type="search"
            autoComplete="off"
            slotProps={{ input: { enterKeyHint: "search" } }}
            sx={{ "& input::-webkit-search-cancel-button": { display: "none" } }}
            {...searchField}
            startAdornment={
              <InputAdornment position="start">
                <SearchOutlined aria-hidden />
              </InputAdornment>
            }
            endAdornment={
              searchField.value ? (
                <InputAdornment position="end">
                  <IconButton label={t("common:action.clearSearch")} size="sm" tooltip={false} onClick={() => update({ q: null })}>
                    <CloseOutlined fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : undefined
            }
          />
        </Box>

        {!query && genderCategories.length > 0 && (
          <Box sx={{ mt: 6, display: "grid", gap: 3 }}>
            <ChoiceChips
              label={t("services.categories")}
              scrollable
              value={category?.slug ?? null}
              onChange={(slug) => update({ category: slug, filter: null, gender: gender === "women" ? null : gender })}
              options={genderCategories.map((item) => ({ id: item.slug, label: pick(item.name, lang) }))}
            />
            {category && <FilterChips category={category} services={services} value={filterSlug} onChange={(slug) => update({ filter: slug })} />}
          </Box>
        )}

        <Box sx={{ mt: { xs: 6, md: 8 } }}>
          {catalog.isError && !catalog.data ? (
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
          ) : !catalog.data ? (
            <ListSkeleton />
          ) : query ? (
            <SearchResults services={services.filter((service) => matches(service, words, lang))} query={query} onClear={() => update({ q: null })} detailsTo={detailsTo} />
          ) : category ? (
            <CategoryList category={category} services={services.filter((service) => service.categorySlugs.includes(category.slug) && (!filterSlug || service.filterSlugs.includes(filterSlug)))} detailsTo={detailsTo} />
          ) : (
            genderCategories.map((item) => (
              <CategoryPreview
                key={item.slug}
                category={item}
                services={services.filter((service) => service.categorySlugs.includes(item.slug))}
                detailsTo={detailsTo}
                onSeeAll={() => {
                  update({ category: item.slug, filter: null });
                  window.scrollTo({ top: 0 });
                }}
              />
            ))
          )}
        </Box>
      </Container>

      {count > 0 && (
        <ActionBar>
          <Typography sx={{ flex: 1, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {t("services.cartBar", { count, price: formatMoney(cartEstimatePaise(lines), lang) })}
          </Typography>
          <Button to="/cart" size="lg">
            {t("services.viewCart")}
          </Button>
        </ActionBar>
      )}

      {/* /services/:slug renders the details sheet here, over the list. */}
      <Outlet />
    </>
  );
}

function FilterChips({ category, services, value, onChange }: { category: CategoryDto; services: ServiceSummaryDto[]; value: string | null; onChange: (slug: string | null) => void }) {
  const { t, i18n } = useTranslation("public");
  // Only filters that have something in them; an empty chip is a dead end.
  const filters = category.filters.filter((filter) => services.some((service) => service.categorySlugs.includes(category.slug) && service.filterSlugs.includes(filter.slug)));
  if (filters.length < 2) return null;
  return <ChoiceChips label={t("services.filters")} scrollable value={value} onChange={onChange} options={filters.map((filter) => ({ id: filter.slug, label: pick(filter.name, i18n.language) }))} />;
}

const listGrid = { display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(2, minmax(0, 1fr))" }, columnGap: 12 } as const;

function CategoryPreview({ category, services, detailsTo, onSeeAll }: { category: CategoryDto; services: ServiceSummaryDto[]; detailsTo: (slug: string) => string; onSeeAll: () => void }) {
  const { t, i18n } = useTranslation("public");
  const lang = i18n.language;
  const titleId = `category-${category.slug}`;

  return (
    <Box component="section" aria-labelledby={titleId} sx={{ "& + &": { mt: { xs: 12, md: 16 } } }}>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4, flexWrap: "wrap" }}>
        <Box>
          <Typography id={titleId} variant="h2">
            {pick(category.name, lang)}
          </Typography>
          {pick(category.description, lang) && <Typography sx={{ mt: 1, color: "text.secondary" }}>{pick(category.description, lang)}</Typography>}
        </Box>
        {/* Beside the heading from md; on phones it follows the preview, where the thumb already is. */}
        {services.length > PREVIEW_COUNT && (
          <Button variant="tertiary" onClick={onSeeAll} sx={{ display: { xs: "none", md: "inline-flex" } }}>
            {t("services.seeAll", { count: services.length })}
          </Button>
        )}
      </Box>
      <Box sx={{ ...listGrid, mt: 2 }}>
        {services.slice(0, PREVIEW_COUNT).map((service) => (
          <ServiceRow key={service.slug} service={service} detailsTo={detailsTo(service.slug)} />
        ))}
      </Box>
      {services.length > PREVIEW_COUNT && (
        <Button variant="secondary" fullWidth onClick={onSeeAll} sx={{ display: { xs: "flex", md: "none" }, mt: 5 }}>
          {t("services.seeAll", { count: services.length })}
        </Button>
      )}
    </Box>
  );
}

function CategoryList({ category, services, detailsTo }: { category: CategoryDto; services: ServiceSummaryDto[]; detailsTo: (slug: string) => string }) {
  const { t, i18n } = useTranslation("public");
  const lang = i18n.language;
  if (services.length === 0) {
    return <EmptyState title={t("services.emptyCategoryTitle")} description={t("services.emptyCategoryBody")} />;
  }
  return (
    <Box component="section" aria-labelledby="category-title">
      <Typography id="category-title" variant="h2">
        {pick(category.name, lang)}
      </Typography>
      <Typography role="status" sx={{ mt: 1, color: "text.secondary" }}>
        {t("services.count", { count: services.length })}
      </Typography>
      <Box sx={{ ...listGrid, mt: 2 }}>
        {services.map((service) => (
          <ServiceRow key={service.slug} service={service} detailsTo={detailsTo(service.slug)} />
        ))}
      </Box>
    </Box>
  );
}

function SearchResults({ services, query, onClear, detailsTo }: { services: ServiceSummaryDto[]; query: string; onClear: () => void; detailsTo: (slug: string) => string }) {
  const { t } = useTranslation("public");
  if (services.length === 0) {
    return (
      <Box role="status">
        <EmptyState
          title={t("services.emptyTitle", { query: query.trim() })}
          description={t("services.emptyBody")}
          action={
            <Button variant="secondary" onClick={onClear}>
              {t("services.clearSearch")}
            </Button>
          }
        />
      </Box>
    );
  }
  return (
    <Box component="section" aria-labelledby="results-title">
      <Typography id="results-title" variant="h2" aria-live="polite">
        {t("services.results", { count: services.length, query: query.trim() })}
      </Typography>
      <Box sx={{ ...listGrid, mt: 2 }}>
        {services.map((service) => (
          <ServiceRow key={service.slug} service={service} detailsTo={detailsTo(service.slug)} />
        ))}
      </Box>
    </Box>
  );
}

function ListSkeleton() {
  return (
    <Box aria-hidden sx={listGrid}>
      {Array.from({ length: 6 }, (_, index) => (
        <Box key={index} sx={{ display: "grid", gridTemplateColumns: "1fr 104px", gap: 4, py: 5 }}>
          <Box>
            <Skeleton width="60%" height={28} />
            <Skeleton width="30%" />
            <Skeleton width="90%" />
          </Box>
          <Skeleton variant="rounded" sx={{ height: 40, alignSelf: "end" }} />
        </Box>
      ))}
    </Box>
  );
}
