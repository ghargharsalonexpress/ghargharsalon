import { useState } from "react";
import {
  type CatalogGender,
  type CategoryDto,
  pick,
  type ServiceSummaryDto,
} from "@brand/shared";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import FilterListOutlined from "@mui/icons-material/FilterListOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Outlet, useSearchParams } from "react-router";
import {
  ActionBar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  InlineAlert,
  ResponsiveDialog,
  TextField,
  useUrlText,
} from "@/design-system";
import {
  cartCount,
  cartEstimatePaise,
  useCart,
} from "@/features/cart/cartStore";
import { useCatalog } from "@/features/catalog/api";
import { formatMoney } from "@/lib/format";
import { CategoryFilterSidebar } from "./CategoryFilterSidebar";
import { ServiceCard } from "./ServiceCard";
import { usePageMeta } from "./usePageMeta";

/** Services shown per category before "See all" when no category is chosen. */
const PREVIEW_COUNT = 6;

/** Cards rendered before "Show more". A category can hold 100+, and rendering them all at
 * once makes every filter tick wait about a second for the re-render. */
const PAGE_SIZE = 12;

/** Lower-case, accents removed, so "facial" finds "Facial" and "Fàcial". */
const normalise = (text: string) =>
  text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

function matches(
  service: ServiceSummaryDto,
  words: string[],
  lang: string,
): boolean {
  const haystack = normalise(
    [
      pick(service.name, lang),
      service.name.en,
      pick(service.summary, lang),
      service.summary.en,
    ].join(" "),
  );
  return words.every((word) => haystack.includes(word));
}

const cardGrid = {
  display: "grid",
  gap: 6,
  gridTemplateColumns: {
    xs: "minmax(0, 1fr)",
    sm: "repeat(2, minmax(0, 1fr))",
    lg: "repeat(3, minmax(0, 1fr))",
  },
} as const;

/**
 * Services (plan Phase 3, W1). Gender, category, sub-categories and search live in the URL,
 * so the back button, reloads and shared links all keep the view. Details open as a sheet.
 *
 * Nothing is filtered until the visitor asks: a category opens showing everything in it.
 */
export function ServicesPage() {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const catalog = useCatalog();
  const lines = useCart((state) => state.lines);

  usePageMeta(t("meta.servicesTitle"), t("meta.servicesDescription"));

  const categories = catalog.data?.categories ?? [];
  const category =
    categories.find((item) => item.slug === params.get("category")) ?? null;
  // A category link decides the gender, so "?category=men-grooming" never shows women's rows.
  const gender: CatalogGender =
    category?.gender ?? (params.get("gender") === "men" ? "men" : "women");
  // Several sub-categories can be ticked at once; a single one still reads as "?filter=waxing".
  const filterSlugs = (params.get("filter") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter((slug) => category?.filters.some((filter) => filter.slug === slug));
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
  const searchField = useUrlText(query, (value) =>
    update({ q: value || null, category: null, filter: null }),
  );

  const services = (catalog.data?.services ?? []).filter(
    (service) => service.gender === gender,
  );
  const genderCategories = categories.filter(
    (item) =>
      item.gender === gender &&
      services.some((service) => service.categorySlugs.includes(item.slug)),
  );
  const detailsTo = (slug: string) =>
    `/services/${slug}${params.size > 0 ? `?${params.toString()}` : ""}`;

  const selectCategory = (slug: string | null) =>
    update({
      category: slug,
      filter: null,
      gender: gender === "women" ? null : gender,
      q: null,
    });
  const toggleFilter = (slug: string) => {
    const next = filterSlugs.includes(slug)
      ? filterSlugs.filter((item) => item !== slug)
      : [...filterSlugs, slug];
    update({ filter: next.length > 0 ? next.join(",") : null });
  };

  const sidebarFor = (name: string) => (
    <CategoryFilterSidebar
      name={name}
      gender={gender}
      onGenderChange={(value) =>
        update({
          gender: value === "women" ? null : value,
          category: null,
          filter: null,
        })
      }
      categories={genderCategories}
      services={services}
      activeCategory={category?.slug ?? null}
      filters={filterSlugs}
      onSelectCategory={selectCategory}
      onToggleFilter={toggleFilter}
      onResetFilters={() => update({ filter: null })}
    />
  );

  const count = cartCount(lines);

  return (
    <>
      <Container
        maxWidth={false}
        sx={{
          maxWidth: tokens.container.marketing,
          pt: { xs: 6, md: 10 },
          pb: { xs: 8, md: 12 },
        }}
      >
        <Typography variant="h1">{t("services.title")}</Typography>

        <Box
          sx={{
            mt: 6,
            display: "grid",
            gap: { xs: 6, md: 10 },
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "280px minmax(0, 1fr)",
            },
            alignItems: "start",
          }}
        >
          {/* Scrolls with the page on phones (inside the sheet); its own column from md. */}
          <Box
            component="aside"
            aria-label={t("services.filters")}
            sx={{
              display: { xs: "none", md: "block" },
              position: "sticky",
              top: 88,
              maxHeight: "calc(100vh - 104px)",
              overflowY: "auto",
              pr: 2,
            }}
          >
            {sidebarFor("gender")}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                gap: 3,
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="secondary"
                startIcon={<FilterListOutlined />}
                onClick={() => setFiltersOpen(true)}
                sx={{ display: { xs: "inline-flex", md: "none" } }}
              >
                {t("services.filtersButton")}
              </Button>
              {/* The field is the grid/flex item, so the width has to go on the wrapper, not on the input. */}
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <TextField
                  label={t("services.search")}
                  type="search"
                  autoComplete="off"
                  slotProps={{ input: { enterKeyHint: "search" } }}
                  sx={{
                    "& input::-webkit-search-cancel-button": {
                      display: "none",
                    },
                  }}
                  {...searchField}
                  startAdornment={
                    <InputAdornment position="start">
                      <SearchOutlined aria-hidden />
                    </InputAdornment>
                  }
                  endAdornment={
                    searchField.value ? (
                      <InputAdornment position="end">
                        <IconButton
                          label={t("common:action.clearSearch")}
                          size="sm"
                          tooltip={false}
                          onClick={() => update({ q: null })}
                        >
                          <CloseOutlined fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : undefined
                  }
                />
              </Box>
            </Box>

            <Box sx={{ mt: { xs: 6, md: 8 } }}>
              {catalog.isError && !catalog.data ? (
                <InlineAlert
                  tone="danger"
                  title={t("services.errorTitle")}
                  action={
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => void catalog.refetch()}
                    >
                      {t("common:action.retry")}
                    </Button>
                  }
                >
                  {t("services.errorBody")}
                </InlineAlert>
              ) : !catalog.data ? (
                <ListSkeleton />
              ) : query ? (
                <SearchResults
                  services={services.filter((service) =>
                    matches(service, words, lang),
                  )}
                  query={query}
                  onClear={() => update({ q: null })}
                  detailsTo={detailsTo}
                />
              ) : category ? (
                <CategoryList
                  category={category}
                  services={services.filter(
                    (service) =>
                      service.categorySlugs.includes(category.slug) &&
                      (filterSlugs.length === 0 ||
                        service.filterSlugs.some((slug) =>
                          filterSlugs.includes(slug),
                        )),
                  )}
                  filters={filterSlugs}
                  onClearFilters={() => update({ filter: null })}
                  detailsTo={detailsTo}
                />
              ) : (
                genderCategories.map((item) => (
                  <CategoryPreview
                    key={item.slug}
                    category={item}
                    services={services.filter((service) =>
                      service.categorySlugs.includes(item.slug),
                    )}
                    detailsTo={detailsTo}
                    onSeeAll={() => {
                      selectCategory(item.slug);
                      window.scrollTo({ top: 0 });
                    }}
                  />
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Container>

      <ResponsiveDialog
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title={t("services.filters")}
        form
        actions={
          <Button onClick={() => setFiltersOpen(false)}>
            {t("services.filtersDone")}
          </Button>
        }
      >
        {sidebarFor("gender-sheet")}
      </ResponsiveDialog>

      {count > 0 && (
        <ActionBar>
          <Typography
            sx={{
              flex: 1,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {t("services.cartBar", {
              count,
              price: formatMoney(cartEstimatePaise(lines), lang),
            })}
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

/** The card grid, filled a page at a time. Remount it (via `key`) to go back to the first page. */
function ServiceGrid({ services, detailsTo }: { services: ServiceSummaryDto[]; detailsTo: (slug: string) => string }) {
  const { t } = useTranslation("public");
  const [visible, setVisible] = useState(PAGE_SIZE);

  return (
    <>
      <Box sx={cardGrid}>
        {services.slice(0, visible).map((service) => (
          <ServiceCard key={service.slug} service={service} detailsTo={detailsTo(service.slug)} />
        ))}
      </Box>
      {visible < services.length && (
        <Box sx={{ mt: 8, display: "flex", justifyContent: "center" }}>
          <Button variant="secondary" size="lg" onClick={() => setVisible((shown) => shown + PAGE_SIZE)}>
            {t("services.showMore")}
          </Button>
        </Box>
      )}
    </>
  );
}

function CategoryPreview({
  category,
  services,
  detailsTo,
  onSeeAll,
}: {
  category: CategoryDto;
  services: ServiceSummaryDto[];
  detailsTo: (slug: string) => string;
  onSeeAll: () => void;
}) {
  const { t, i18n } = useTranslation("public");
  const lang = i18n.language;
  const titleId = `category-${category.slug}`;

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      sx={{ "& + &": { mt: { xs: 12, md: 16 } } }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 4,
          flexWrap: "wrap",
          mb: 5,
        }}
      >
        <Box>
          <Typography id={titleId} variant="h2">
            {pick(category.name, lang)}
          </Typography>
          {pick(category.description, lang) && (
            <Typography sx={{ mt: 1, color: "text.secondary" }}>
              {pick(category.description, lang)}
            </Typography>
          )}
        </Box>
        {services.length > PREVIEW_COUNT && (
          <Button variant="tertiary" onClick={onSeeAll}>
            {t("services.seeAll", { count: services.length })}
          </Button>
        )}
      </Box>
      <Box sx={cardGrid}>
        {services.slice(0, PREVIEW_COUNT).map((service) => (
          <ServiceCard
            key={service.slug}
            service={service}
            detailsTo={detailsTo(service.slug)}
          />
        ))}
      </Box>
    </Box>
  );
}

function CategoryList({
  category,
  services,
  filters,
  onClearFilters,
  detailsTo,
}: {
  category: CategoryDto;
  services: ServiceSummaryDto[];
  filters: string[];
  onClearFilters: () => void;
  detailsTo: (slug: string) => string;
}) {
  const { t, i18n } = useTranslation("public");
  const lang = i18n.language;
  const chosen = category.filters.filter((filter) =>
    filters.includes(filter.slug),
  );

  return (
    <Box component="section" aria-labelledby="category-title">
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 4,
          flexWrap: "wrap",
        }}
      >
        <Typography id="category-title" variant="h2">
          {pick(category.name, lang)}
        </Typography>
        {chosen.length > 0 && (
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {chosen.map((filter) => (
              <Badge key={filter.slug} tone="accent">
                {pick(filter.name, lang)}
              </Badge>
            ))}
            <Button variant="tertiary" size="sm" onClick={onClearFilters}>
              {t("services.clearFilters")}
            </Button>
          </Box>
        )}
      </Box>
      <Typography role="status" sx={{ mt: 1, mb: 5, color: "text.secondary" }}>
        {t("services.count", { count: services.length })}
      </Typography>
      {services.length === 0 ? (
        <EmptyState
          title={t("services.emptyCategoryTitle")}
          description={t("services.emptyCategoryBody")}
        />
      ) : (
        <ServiceGrid
          key={`${category.slug}:${filters.join(",")}`}
          services={services}
          detailsTo={detailsTo}
        />
      )}
    </Box>
  );
}

function SearchResults({
  services,
  query,
  onClear,
  detailsTo,
}: {
  services: ServiceSummaryDto[];
  query: string;
  onClear: () => void;
  detailsTo: (slug: string) => string;
}) {
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
      <Typography
        id="results-title"
        variant="h2"
        aria-live="polite"
        sx={{ mb: 5 }}
      >
        {t("services.results", { count: services.length, query: query.trim() })}
      </Typography>
      <ServiceGrid key={query} services={services} detailsTo={detailsTo} />
    </Box>
  );
}

function ListSkeleton() {
  return (
    <Box aria-hidden sx={cardGrid}>
      {Array.from({ length: 6 }, (_, index) => (
        <Box key={index}>
          <Skeleton variant="rounded" sx={{ aspectRatio: "4 / 3" }} />
          <Skeleton width="70%" height={28} sx={{ mt: 2 }} />
          <Skeleton width="40%" />
          <Skeleton variant="rounded" sx={{ height: 40, mt: 2 }} />
        </Box>
      ))}
    </Box>
  );
}
