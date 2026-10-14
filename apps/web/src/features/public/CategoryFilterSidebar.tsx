import { type CatalogGender, type CategoryDto, pick, type ServiceSummaryDto } from "@brand/shared";
import AddOutlined from "@mui/icons-material/AddOutlined";
import RemoveOutlined from "@mui/icons-material/RemoveOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Badge, Button, Checkbox, SegmentedControl, VisuallyHidden } from "@/design-system";

export interface CategoryFilterSidebarProps {
  /** Radio-group name. Two instances are in the DOM at once, so they must differ. */
  name: string;
  gender: CatalogGender;
  onGenderChange: (gender: CatalogGender) => void;
  /** Categories for this gender that actually have services. */
  categories: CategoryDto[];
  /** Services for this gender, used for the counts beside each row. */
  services: ServiceSummaryDto[];
  activeCategory: string | null;
  /** Selected sub-categories inside the active category. */
  filters: string[];
  onSelectCategory: (slug: string | null) => void;
  onToggleFilter: (slug: string) => void;
  onResetFilters: () => void;
}

/** Counts per category and per sub-category. React Compiler keeps this off the hot path. */
function countServices(categories: CategoryDto[], services: ServiceSummaryDto[]) {
  const byCategory = new Map<string, number>();
  const byFilter = new Map<string, number>();
  for (const category of categories) {
    const inCategory = services.filter((service) => service.categorySlugs.includes(category.slug));
    byCategory.set(category.slug, inCategory.length);
    for (const filter of category.filters) {
      byFilter.set(`${category.slug}/${filter.slug}`, inCategory.filter((service) => service.filterSlugs.includes(filter.slug)).length);
    }
  }
  return { byCategory, byFilter };
}

/**
 * The services sidebar (plan Phase 3, W1): gender, then one row per category with its
 * sub-categories as checkboxes. Nothing is pre-selected, so the listing opens showing
 * everything a category has; ticking a box narrows it.
 *
 * Men's categories carry no sub-categories in the catalogue, so they render as a single
 * selectable row rather than an accordion that opens onto nothing.
 */
export function CategoryFilterSidebar({ name: groupName, gender, onGenderChange, categories, services, activeCategory, filters, onSelectCategory, onToggleFilter, onResetFilters }: CategoryFilterSidebarProps) {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const lang = i18n.language;
  const n = tokens.neutral;
  const a = tokens.accent;
  const counts = countServices(categories, services);

  return (
    <Box>
      <SegmentedControl
        label={t("services.for")}
        name={groupName}
        value={gender}
        fullWidth
        onChange={(value) => onGenderChange(value as CatalogGender)}
        options={[
          { value: "women", label: t("services.women") },
          { value: "men", label: t("services.men") },
        ]}
      />

      <Divider sx={{ my: 5 }} />

      <Typography variant="label" component="h2" sx={{ m: 0, mb: 3 }}>
        {t("services.categoriesTitle")}
      </Typography>

      {categories.map((category) => {
        const name = pick(category.name, lang);
        const active = activeCategory === category.slug;
        // A sub-category with nothing in it is a dead end, so it never appears.
        const available = category.filters.filter((filter) => (counts.byFilter.get(`${category.slug}/${filter.slug}`) ?? 0) > 0);
        const total = counts.byCategory.get(category.slug) ?? 0;
        const selected = available.filter((filter) => filters.includes(filter.slug));
        const only = selected.length === 1 ? selected[0] : undefined;

        const border = `1px solid ${active ? a[600] : n[200]}`;

        if (available.length < 2) {
          return (
            <Box
              key={category.slug}
              component="button"
              type="button"
              aria-pressed={active}
              onClick={() => onSelectCategory(active ? null : category.slug)}
              sx={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                mb: 2,
                px: 3,
                py: 3,
                minHeight: 48,
                font: "inherit",
                textAlign: "start",
                cursor: "pointer",
                border,
                borderRadius: `${tokens.radius.md}px`,
                backgroundColor: active ? a[50] : "transparent",
                color: active ? a[700] : n[900],
                fontWeight: active ? 700 : 500,
                "&:hover": { backgroundColor: active ? a[50] : n[50] },
                "&:focus-visible": { outline: `2px solid ${a[600]}`, outlineOffset: 2 },
              }}
            >
              <Box component="span">{name}</Box>
              <Box component="span" sx={{ color: active ? a[700] : n[600], fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
                {total}
              </Box>
            </Box>
          );
        }

        return (
          <Accordion
            key={category.slug}
            disableGutters
            elevation={0}
            square={false}
            expanded={active}
            onChange={() => onSelectCategory(active ? null : category.slug)}
            sx={{
              mb: 2,
              border,
              borderRadius: `${tokens.radius.md}px`,
              overflow: "hidden",
              backgroundColor: "transparent",
              "&::before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={active ? <RemoveOutlined fontSize="small" /> : <AddOutlined fontSize="small" />}
              sx={{
                minHeight: 48,
                px: 3,
                backgroundColor: active ? a[50] : "transparent",
                "&:hover": { backgroundColor: active ? a[50] : n[50] },
                "& .MuiAccordionSummary-content": { alignItems: "center", gap: 2, flexWrap: "wrap", my: 2.5 },
                "& .MuiAccordionSummary-expandIconWrapper": { color: active ? a[700] : n[600], transform: "none" },
                "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": { transform: "none" },
              }}
            >
              <Typography component="span" sx={{ fontWeight: active ? 700 : 500, color: active ? a[700] : n[900] }}>
                {name}
              </Typography>
              <Typography component="span" sx={{ color: active ? a[700] : n[600], fontVariantNumeric: "tabular-nums" }}>
                {total}
              </Typography>
              {only ? (
                <Box sx={{ ml: "auto" }}>
                  <Badge tone="accent">{pick(only.name, lang)}</Badge>
                </Box>
              ) : (
                selected.length > 1 && (
                  <Box sx={{ ml: "auto" }}>
                    <Badge tone="accent">{t("services.filtersCount", { count: selected.length })}</Badge>
                  </Box>
                )
              )}
            </AccordionSummary>

            <AccordionDetails sx={{ px: 3, pt: 0, pb: 3 }}>
              <Box component="fieldset" sx={{ border: 0, m: 0, p: 0, minWidth: 0 }}>
                <VisuallyHidden component="legend">{t("services.subcategoriesOf", { category: name })}</VisuallyHidden>
                {available.map((filter) => (
                  <Box key={filter.slug} sx={{ display: "flex", alignItems: "center", gap: 2, "& .MuiFormControlLabel-root": { flex: 1, mr: 0 } }}>
                    <Checkbox
                      label={pick(filter.name, lang)}
                      checked={filters.includes(filter.slug)}
                      onChange={() => onToggleFilter(filter.slug)}
                    />
                    <Typography variant="body2" component="span" aria-hidden sx={{ color: n[600], fontVariantNumeric: "tabular-nums" }}>
                      {counts.byFilter.get(`${category.slug}/${filter.slug}`)}
                    </Typography>
                  </Box>
                ))}
                {selected.length > 0 && (
                  <Button variant="tertiary" size="sm" onClick={onResetFilters} sx={{ mt: 2 }}>
                    {t("services.reset")}
                  </Button>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
