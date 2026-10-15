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

  // Phones: the photo whole on top, the title under it. From sm: the title on dark, the photo beside it.
  return (
    <Box
      sx={{
        overflow: "hidden",
        borderRadius: `${tokens.radius.lg}px`,
        bgcolor: tokens.neutral[900],
        display: "grid",
        gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "minmax(0, 1fr) minmax(0, 1fr)", md: "minmax(0, 7fr) minmax(0, 5fr)" },
      }}
    >
      <Box sx={{ position: "relative", order: { xs: 0, sm: 1 }, aspectRatio: { xs: "16 / 9", sm: "auto" }, minHeight: { sm: 220, md: 240 } }}>
        {photo && <Picture image={photo} fallback={category ? defaultPhotoFor([category.slug]) : null} alt="" sizes="(min-width: 900px) 480px, (min-width: 600px) 50vw, 100vw" ratio="auto" radius="lg" priority sx={{ position: "absolute", inset: 0, height: "100%", borderRadius: 0 }} />}
      </Box>
      <Box sx={{ alignSelf: "center", p: { xs: 5, md: 10 } }}>
        <Typography variant="h1" sx={{ color: tokens.neutral[0] }}>
          {title}
        </Typography>
        {description && <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.88)" }}>{description}</Typography>}
      </Box>
    </Box>
  );
}
