import { type CatalogGender, type CategoryDto, pick, SITE_PHOTOS } from "@brand/shared";
import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { Picture } from "@/design-system";
import { categoryPhoto, defaultPhotoFor } from "@/features/catalog/photos";

/**
 * The top of the services page: the chosen category's photo and description, or a photo for
 * women's or men's services. Category photos are the ones set in Admin → Categories.
 */
export function ServicesBanner({ category, gender }: { category: CategoryDto | null; gender: CatalogGender }) {
  const { t, i18n } = useTranslation("public");
  const { tokens } = useTheme();
  const photo = category ? categoryPhoto(category) : gender === "men" ? SITE_PHOTOS["hero-men"] : SITE_PHOTOS["hero-facial"];
  const title = category ? pick(category.name, i18n.language) : t("services.title");
  const description = category ? pick(category.description, i18n.language) : t("meta.servicesDescription");

  return (
    <Box sx={{ position: "relative", overflow: "hidden", borderRadius: `${tokens.radius.lg}px`, minHeight: { xs: 168, md: 220 }, display: "flex", alignItems: "flex-end", bgcolor: tokens.neutral[900] }}>
      {photo && <Picture image={photo} fallback={category ? defaultPhotoFor([category.slug]) : null} alt="" sizes="(min-width: 1200px) 1136px, 100vw" ratio="auto" radius="lg" priority sx={{ position: "absolute", inset: 0, height: "100%", borderRadius: 0 }} />}
      <Box aria-hidden sx={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(20,16,12,0.85) 0%, rgba(20,16,12,0.55) 55%, rgba(20,16,12,0.15) 100%)" }} />
      <Box sx={{ position: "relative", p: { xs: 5, md: 8 }, maxWidth: 640 }}>
        <Typography variant="h1" sx={{ color: tokens.neutral[0] }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.88)" }}>
            {description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
