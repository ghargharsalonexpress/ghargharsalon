// src/components/ServicesSection.jsx
import React from "react";
import { Box, Typography, Stack } from "@mui/material";

const services = [
  {
    title: "Female Salon at Home",
    description:
      "We provide a range of beauty services at the comfort of your home. From waxing, facials, clean-ups and mani-pedi to body polishing and even hair spa, you name it we have it.",
    image: "/images/salon.jpg",
    bgColor: "#fde7eb",
  },
  {
    title: "Female Spa at Home",
    description:
      "Whether you want to de-stress yourself or get a pain-relieving body massage we have everything in the bucket for you. With this we also cater the needs of elderly, new moms, kids & period pain.",
    image: "/images/spa.jpg",
    bgColor: "#ecf7ec",
  },
  {
    title: "Female Hydra & Laser Treatments",
    description:
      "As our skin matures, it needs more to maintain its health and glow. Our Hydra Facials at Home are perfect if you want instant results with a healthy glow while our at-home Laser Treatments are great for hair reduction, pigmentation correction, and skin rejuvenation.",
    image: "/images/hydra.jpg",
    bgColor: "#f2f0fb",
  },
];

const ServicesSection = () => {
  return (
    <>
      <Divider
        sx={{
          width: 80,
          height: 3,
          mx: "auto",
          borderRadius: 2,
          backgroundColor: theme.palette.primary.main,
        }} />
      <Box sx={{ py: 8, px: { xs: 2, md: 8 }, textAlign: "center", }}>
        <Typography variant="h4" fontWeight={700} mb={6}>
          Services we offer
        </Typography>

        {/* Horizontal flex layout */}
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="center"
          alignItems="flex-start"
          spacing={{ xs: 6, md: 6 }}
        >
          {services.map((service, i) => (
            <Box key={i} sx={{ maxWidth: 320, mx: "auto" }}>
              {/* Image Container */}
              <Box
                sx={{
                  backgroundColor: service.bgColor,
                  borderRadius: "30px",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  mb: 2,
                  height: 250,
                }}
              >
                <Box
                  component="img"
                  src={service.image}
                  alt={service.title}
                  sx={{
                    width: "80%",
                    borderRadius: "25px",
                    objectFit: "cover",
                  }} />
              </Box>

              {/* Title + Description */}
              <Typography variant="h6" fontWeight={700} mb={1}>
                {service.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.6 }}
              >
                {service.description}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </>
  );
};

export default ServicesSection;
