// src/pages/AboutUs.jsx
import React from "react";
import { Box, Typography, Container, Grid, Stack, useTheme } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Img from "../asset/banner.png";

const AboutUs = () => {
  const theme = useTheme();

  return (
    <Box sx={{ backgroundColor: "#fff" }}>
      {/* -------------------------------------------------- */}
      {/* SECTION 1 — HERO BANNER */}
      {/* -------------------------------------------------- */}
      <Box
        sx={{
          height: { xs: "50vh", md: "65vh" },
          width: "100%",
          backgroundImage: `url(${Img})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
        }}
      >
        <Container>
          <Typography
            variant="h3"
            fontWeight={700}
            sx={{
              maxWidth: "650px",
              color: "#fff",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            Premium Salon & Spa – Delivered Right Where You Stay
          </Typography>
        </Container>
      </Box>

      {/* -------------------------------------------------- */}
      {/* SECTION 2 — WHO WE ARE */}
      {/* -------------------------------------------------- */}
      <Container sx={{ py: { xs: 6, md: 10 } }}>
        <Grid container spacing={6} alignItems="center">
          {/* IMAGE */}
          <Grid item xs={12} md={6}>
            <Box
              component="img"
              src="/images/about-section.jpg"
              alt="Who we are"
              sx={{
                width: "100%",
                borderRadius: 3,
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}
            />
          </Grid>

          {/* TEXT */}
          <Grid item xs={12} md={6}>
            <Typography variant="h4" fontWeight={700} mb={2}>
              About Us – Who We Are
            </Typography>

            <Typography variant="body1" color="text.secondary" mb={3}>
              <strong>Niwas Salon Express (Where you Stay – Professionals in minutes)</strong>
              is a proud <strong>Made in India</strong> luxury salon-at-home brand created to redefine
              beauty and grooming services for the modern Indian household.
              <br /><br />
              We bring certified experts, premium branded products, and strict hygiene protocols
              directly to your doorstep — blending convenience with uncompromised quality.
              <br /><br />
              Every service is performed with precision, care, and a hygiene-first approach, ensuring
              a seamless, safe, and luxurious salon experience at home.
            </Typography>

            {/* WHY CHOOSE BULLETS */}
            <Stack spacing={1.2}>
              {[
                "Certified Professionals with 5+ years of expertise",
                "Premium Branded Products for superior results",
                "Hygiene-First Protocols with sealed, sanitised service kits",
                "Trusted by Thousands of Customers across India",
              ].map((point, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="center">
                  <CheckCircleOutlineIcon sx={{ color: "#000" }} />
                  <Typography variant="body1">{point}</Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* -------------------------------------------------- */}
      {/* SECTION 3 — BRAND STORY */}
      {/* -------------------------------------------------- */}
      <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: "#fafafa" }}>
        <Container maxWidth="lg">

          <Typography
            variant="h4"
            fontWeight={800}
            textAlign="center"
            mb={6}
            sx={{ color: theme.palette.text.primary }}
          >
            Our Brand Story – Niwas Salon Express
            <br />
            <span style={{ fontSize: "18px", fontWeight: 500 }}>
              (Where You Stay – Professionals in Minutes)
            </span>
          </Typography>

          <Typography
            variant="body1"
            sx={{
              maxWidth: "900px",
              mx: "auto",
              textAlign: "center",
              color: theme.palette.text.secondary,
              lineHeight: 1.8,
              fontSize: "17px",
            }}
          >
            <strong>Made in India • Made for Every Home</strong>
            <br /><br />
            Niwas Salon Express was born from a simple belief —
            every Indian deserves a premium salon experience without stepping out of their home.
            <br /><br />
            As life becomes busier, traditional salon visits no longer match the needs of modern
            individuals: professionals, parents, homemakers, students, or seniors.
            Everyone deserves beauty & self-care that is easy, safe, and accessible.
            <br /><br />
            What began as a vision soon became a mission —
            to build a luxury salon-at-home brand that blends Indian talent, tradition, and technology
            into a seamless doorstep experience.
            <br /><br />
            We invested in certified professionals, premium global products, and sealed hygiene kits
            to ensure every service reflects comfort, trust, and excellence.
            <br /><br />
            Today, we proudly serve thousands of homes across India and continue to expand with a
            commitment to innovation, improved customer experiences, and the highest service standards.
            <br /><br />
            Because at Niwas Salon Express,
            <strong>we don’t just deliver beauty services — we deliver confidence, comfort, and
            the luxury of self-care right where you stay.</strong>
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default AboutUs;
