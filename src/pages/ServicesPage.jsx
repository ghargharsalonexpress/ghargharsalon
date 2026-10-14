import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Divider,
  Chip,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  Button,
  Drawer,
  Fab,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import FilterListIcon from "@mui/icons-material/FilterList";

import ServiceCard from "../components/ServiceCard";
import { woman } from "../store/data/woman/index";
import { men } from "../store/data/men";
import { useSearchParams } from "react-router-dom";

/* ---------------------------------------------- */
/* Parse categories param                          */
/* ---------------------------------------------- */
const parseCatsParam = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
  } catch (_) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

/* ---------------------------------------------- */
/* Gender Selector                                 */
/* ---------------------------------------------- */
const GenderSelector = ({ activeGender, setActiveGender, setMergedView, theme }) => (
  <Box sx={{ mb: 2 }}>
    <Box
      sx={{
        display: "flex",
        borderRadius: 999,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
        bgcolor: theme.palette.action.hover,
      }}
    >
      {[
        { key: "female", label: "Women" },
        { key: "male", label: "Men" },
      ].map((g, idx) => {
        const active = activeGender === g.key;
        return (
          <Box
            key={g.key}
            onClick={() => {
              setMergedView(false);
              setActiveGender(g.key);
            }}
            sx={{
              flex: 1,
              textAlign: "center",
              py: 1.1,
              px: 2.5,
              cursor: "pointer",
              fontWeight: 700,
              color: active ? theme.palette.common.white : theme.palette.text.primary,
              bgcolor: active ? theme.palette.primary.main : "transparent",
              borderRight: idx === 0 ? `1px solid ${theme.palette.divider}` : "none",
              "&:hover": {
                bgcolor: active ? theme.palette.primary.dark : theme.palette.action.selected,
              },
              transition: "all .2s ease",
            }}
          >
            {g.label}
          </Box>
        );
      })}
    </Box>
  </Box>
);

/* ---------------------------------------------- */
/* Category Accordion                             */
/* ---------------------------------------------- */
const CategoryAccordionList = ({
  categories,
  expandedCat,
  setExpandedCat,
  activeCategory,
  setActiveCategory,
  selectedFilters,
  setSelectedFilters,
  toggleFilter,
  theme,
}) => (
  <Box>
    {categories.map((cat) => {
      const isExpanded = expandedCat === cat.id;
      const isActive = activeCategory === cat.id;

      return (
        <Accordion
          key={cat.id}
          expanded={isExpanded}
          onChange={() => {
            const willExpand = !isExpanded;
            setExpandedCat(willExpand ? cat.id : "");
            setActiveCategory(cat.id);

            // AUTO SELECT FIRST FILTER → ALWAYS filters[0]
            if (cat.filters?.length > 0) {
              setSelectedFilters([cat.filters[0]]);
            } else {
              setSelectedFilters([]);
            }
          }}
          disableGutters
          elevation={0}
          sx={{
            border: `1px solid ${isActive ? theme.palette.primary.main : theme.palette.divider}`,
            borderRadius: 2,
            mb: 1.2,
            "&::before": { display: "none" },
          }}
        >
          <AccordionSummary
            expandIcon={
              isExpanded ? (
                <RemoveIcon sx={{ color: theme.palette.text.secondary }} />
              ) : (
                <AddIcon sx={{ color: theme.palette.text.secondary }} />
              )
            }
            sx={{
              px: 1.5,
              py: 1,
              bgcolor: isActive ? theme.palette.primary.light + "22" : "transparent",
            }}
          >
            <Stack direction="row" justifyContent="space-between" sx={{ width: "100%" }}>
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 700,
                  color: isActive ? theme.palette.primary.dark : theme.palette.text.primary,
                }}
              >
                {cat.name}
              </Typography>

              {isActive && selectedFilters.length > 0 && (
                <Chip
                  size="small"
                  label={selectedFilters[0]}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Stack>
          </AccordionSummary>

          <AccordionDetails sx={{ pt: 0.5, pb: 1.5 }}>
            <Stack spacing={0.5}>
              {(cat.filters || []).map((f) => (
                <FormControlLabel
                  key={f}
                  control={
                    <Checkbox
                      size="small"
                      color="primary"
                      checked={selectedFilters.includes(f)}
                      onChange={() => toggleFilter(f)}
                    />
                  }
                  label={<Typography variant="body2">{f}</Typography>}
                />
              ))}
            </Stack>

            <Button
              size="small"
              onClick={() => setSelectedFilters([cat.filters?.[0] || "All"])}
              sx={{ mt: 1, fontWeight: 600, textTransform: "none" }}
            >
              Reset
            </Button>
          </AccordionDetails>
        </Accordion>
      );
    })}
  </Box>
);

/* ---------------------------------------------- */
/* Sidebar                                        */
/* ---------------------------------------------- */
const Sidebar = (props) => (
  <Box sx={{ p: 2, width: { xs: "100%", md: 300 }, bgcolor: props.theme.palette.background.paper }}>
    <GenderSelector {...props} />
    <Divider sx={{ my: 2 }} />
    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
      Categories
    </Typography>
    <CategoryAccordionList {...props} />
  </Box>
);

/* ---------------------------------------------- */
/* Card Grid Components                           */
/* ---------------------------------------------- */
const CardGrid = ({ items, activeGender }) => (
  <Box
    sx={{
      display: "grid",
      gap: 3,
      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
    }}
  >
    {items.map((item) => (
      <ServiceCard key={item.id} data={item} noModalImage={activeGender === "male"} />
    ))}
  </Box>
);

/* ---------------------------------------------- */
/* Empty State                                    */
/* ---------------------------------------------- */
const EmptyState = () => (
  <Typography textAlign="center" mt={6} color="text.secondary">
    No services found for the selected filters.
  </Typography>
);

/* ---------------------------------------------- */
/* Main Component                                 */
/* ---------------------------------------------- */
const ServicesPage = () => {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const [searchParams] = useSearchParams();

  const catsRaw = searchParams.get("cats") || "";
  const initialCats = parseCatsParam(catsRaw);

  const [mergedView, setMergedView] = useState(initialCats.length > 0);
  const [catsFilter, setCatsFilter] = useState(initialCats);
  const [activeGender, setActiveGender] = useState(mergedView ? "" : "female");

  const genderData = mergedView
    ? { categories: [...woman.categories, ...men.categories] }
    : activeGender === "female"
    ? woman
    : men;

  const categories = genderData.categories || [];
  const [activeCategory, setActiveCategory] = useState("");
  const [expandedCat, setExpandedCat] = useState("");
  const [selectedFilters, setSelectedFilters] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---------------------------------------------- */
  /* DEFAULT CATEGORY + FILTER SELECTION            */
  /* ---------------------------------------------- */
  useEffect(() => {
    const baseCats = mergedView
      ? [...woman.categories, ...men.categories]
      : activeGender === "female"
      ? woman.categories
      : men.categories;

    if (!baseCats.length) return;

    const firstCat = baseCats[0];
    setActiveCategory(firstCat.id);
    setExpandedCat(firstCat.id);

    // ALWAYS SELECT FIRST FILTER (filters[0] = "All")
    if (firstCat.filters?.length > 0) {
      setSelectedFilters([firstCat.filters[0]]);
    } else {
      setSelectedFilters([]);
    }
  }, [mergedView, activeGender]);

  /* ---------------------------------------------- */
  /* Toggle filter                                  */
  /* ---------------------------------------------- */
  const toggleFilter = (key) => {
    setSelectedFilters([key]); // Always use single-filter selection since first filter = All
  };

  /* ---------------------------------------------- */
  /* Filter packages                                */
  /* ---------------------------------------------- */
  const filteredPackages = useMemo(() => {
    let pkgs = [];

    if (mergedView && catsFilter.length > 0) {
      const allCats = [...woman.categories, ...men.categories];
      const allPkgs = allCats.flatMap((c) => c.packages || []);

      pkgs = allPkgs.filter((pkg) =>
        (pkg.belongs_to || []).some((id) => catsFilter.includes(id))
      );
    } else {
      const currentCategory = categories.find((c) => c.id === activeCategory);
      pkgs = currentCategory?.packages || [];

      if (selectedFilters.length > 0 && selectedFilters[0] !== "All") {
        pkgs = pkgs.filter((pkg) => pkg.withFilter?.includes(selectedFilters[0]));
      }
    }

    const seen = new Set();
    return pkgs.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [mergedView, catsFilter, categories, activeCategory, selectedFilters]);

  /* ---------------------------------------------- */
  /* LAZY LOAD LOGIC                                */
  /* ---------------------------------------------- */
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    setVisibleCount(12);
  }, [filteredPackages]);

  const visibleItems = filteredPackages.slice(0, visibleCount);

  /* ---------------------------------------------- */
  /* RENDER                                         */
  /* ---------------------------------------------- */
  const sidebarContent = (
    <Sidebar
      theme={theme}
      activeGender={activeGender}
      setActiveGender={setActiveGender}
      setMergedView={setMergedView}
      categories={categories}
      expandedCat={expandedCat}
      setExpandedCat={setExpandedCat}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      selectedFilters={selectedFilters}
      setSelectedFilters={setSelectedFilters}
      toggleFilter={toggleFilter}
    />
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: theme.palette.background.default }}>
      {!isMdDown && (
        <Box
          sx={{
            width: 300,
            flexShrink: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper,
            position: "sticky",
            top: 72,
            height: "calc(100vh - 72px)",
            overflowY: "auto",
          }}
        >
          {sidebarContent}
        </Box>
      )}

      <Box sx={{ flex: 1, px: { xs: 2, md: 3, lg: 4 }, py: 3 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h5" fontWeight={800}>
            {categories.find((c) => c.id === activeCategory)?.name || "Services"}
          </Typography>

          <Chip label={selectedFilters[0] || "All"} size="small" variant="outlined" />
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {visibleItems.length > 0 && (
          <CardGrid items={visibleItems} activeGender={activeGender} />
        )}

        {visibleItems.length < filteredPackages.length && (
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Button
              variant="contained"
              onClick={() => setVisibleCount((prev) => prev + 12)}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Load More
            </Button>
          </Box>
        )}

        {visibleItems.length === 0 && <EmptyState />}
      </Box>

      {isMdDown && (
        <>
          <Fab
            color="primary"
            onClick={() => setDrawerOpen(true)}
            sx={{
              position: "fixed",
              bottom: 88,
              right: 20,
              zIndex: 20,
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            }}
          >
            <FilterListIcon />
          </Fab>

          <Drawer
            anchor="left"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{
              sx: { width: "88vw", maxWidth: 360, borderRight: `1px solid ${theme.palette.divider}` },
            }}
          >
            {sidebarContent}
          </Drawer>
        </>
      )}
    </Box>
  );
};

export default ServicesPage;
