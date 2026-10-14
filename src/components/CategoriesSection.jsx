// src/components/ModernServicesMarquee.jsx
import { Box, Container, Typography, Divider, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import maleGrooming from "../asset/maleGrooming.jpg";
import spa from "../asset/spa.jpg";
import mehndi from "../asset/mehndi.jpg";
import hair from "../asset/hair.jpg";
import preBridal from "../asset/pre-bridal.png";
// HOMEPAGE CATEGORIES
export const categories = [
  { title: "Salon at Home", slug: "salonathome", img: "https://images.pexels.com/photos/3992870/pexels-photo-3992870.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { title: "Spa at Home", slug: "spaathome", img: spa },
  { title: "Hydra & Laser", slug: "hydralaser", img: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { title: "Male Grooming", slug: "malegrooming", img: maleGrooming },
  { title: "Hair Styling", slug: "hairstyling", img: hair },
  { title: "Makeup at Home", slug: "makeupathome", img: "https://images.pexels.com/photos/931167/pexels-photo-931167.jpeg?auto=compress&cs=tinysrgb&w=800" },
  { title: "Pre-Bridal", slug: "prebridal", img: preBridal },
  { title: "Mehendi at Home", slug: "mehendiathome", img: mehndi },
];

// CATEGORY → REAL SERVICE CATEGORY IDs (Women + Men)
export const categoryMap = {
  salonathome: ["facials", "waxing", "mani_pedi", "hairstyling", "skincare_scrubs"],
  spaathome: ["stress_relief", "pain_relief", "spa_for_women", "skincare_scrubs"],
  hydralaser: ["facials"],
  malegrooming: ["monthly_necessity", "face_grooming", "skincare_scrubs"],
  hairstyling: ["hairstyling", "hairstyling_men"],
  makeupathome: ["makeup_and_styling", "shaadi_packages"],
  prebridal: ["shaadi_packages", "makeup_and_styling", "facials"],
  mehendiathome: [],
};

export default function ModernServicesMarquee() {
  const theme = useTheme();
  const navigate = useNavigate();

  // CLICK HANDLER → Send user to services with multiple categories
  const handleCategoryClick = (cat) => {
    const mappedCats = categoryMap[cat.slug] || [];

    // Go to services page
    navigate(`/services?cats=${encodeURIComponent(JSON.stringify(mappedCats))}`);
  };

  return (
    <>
      <Divider
        sx={{
          width: 80,
          height: 3,
          mx: "auto",
          borderRadius: 2,
          backgroundColor: theme.palette.primary.main,
        }}
      />

      <Box sx={{ py: { xs: 8, md: 10 }, overflow: "hidden", backgroundColor: theme.palette.background.paper }}>
        <Container maxWidth="lg">
          <Typography variant="h4" textAlign="center" fontWeight={700} mb={6}>
            Services We Offer
          </Typography>

          {/* Full-width marquee */}
          <Box
            sx={{
              width: "100vw",
              position: "relative",
              left: "50%",
              right: "50%",
              marginLeft: "-50vw",
              marginRight: "-50vw",
              overflow: "hidden",
            }}
          >
            <motion.div
              style={{ display: "flex", gap: 30 }}
              animate={{ x: ["0%", "-50%"] }}
              transition={{ repeat: Infinity, ease: "linear", duration: 35 }}
            >
              {[...categories, ...categories].map((cat, i) => (
                <Box
                  key={i}
                  onClick={() => handleCategoryClick(cat)}
                  sx={{
                    flex: "0 0 auto",
                    width: 240,
                    height: 300,
                    borderRadius: 4,
                    overflow: "hidden",
                    position: "relative",
                    cursor: "pointer",
                    transition: "0.4s",
                    "&:hover": { transform: "scale(1.05)" },
                  }}
                >
                  <Box
                    component="img"
                    src={cat.img}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      filter: "brightness(0.85)",
                    }}
                  />

                  {/* Label */}
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      height: "40%",
                      width: "100%",
                      background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.6))",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "flex-end",
                      pb: 2,
                    }}
                  >
                    <Typography sx={{ color: "#fff", fontWeight: 600 }}>
                      {cat.title}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </motion.div>
          </Box>
        </Container>
      </Box>
    </>
  );
}
