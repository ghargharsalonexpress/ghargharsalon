import React from "react";
import { Box, Container, Typography, Button, Stack, useTheme } from "@mui/material";
import { motion } from "framer-motion";
import Video from "../asset/main.mp4";

const HeroSection = () => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        position: "relative",
        height: { xs: "100vh", md: "90vh" },
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.palette.secondary.main, // fallback
        overflow: "hidden",
      }}
    >
      {/* Background Video */}
      <Box
        component="video"
        src={Video}
        autoPlay
        muted
        loop
        playsInline
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 0,
          filter: "brightness(0.65) contrast(1.05)", // balanced tone
        }}
      />

      {/* Soft Gradient Overlay */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `linear-gradient(
            90deg,
            ${theme.palette.secondary.main}CC 0%,
            rgba(0,0,0,0.4) 50%,
            rgba(0,0,0,0.25) 100%
          )`,
          zIndex: 1,
        }}
      />

      {/* Content */}
      <Container
        maxWidth="lg"
        sx={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          textAlign: "center",
          px: 3,
        }}
      >
        {/* Text Section */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          sx={{ maxWidth: 700 }}
        >
          <Typography
            variant="h3"
            fontWeight={800}
            mb={2}
            sx={{
              color: theme.palette.common.white,
              textShadow: "0 2px 12px rgba(0,0,0,0.3)",
              letterSpacing: "0.5px",
            }}
          >
            Experience Luxury Salon Care,
            <Box component="span" sx={{ color: theme.palette.primary.light }}>
              {" "}Right at Your Home
            </Box>
          </Typography>

          <Typography
            variant="h6"
            mb={4}
            sx={{
              color: "rgba(255,255,255,0.88)",
              maxWidth: 520,
              mx: "auto",
              textShadow: "0 2px 10px rgba(0,0,0,0.35)",
            }}
          >
            Relax and rejuvenate with our certified beauty experts —
            premium salon, spa, and grooming services delivered to your doorstep.
          </Typography>

          {/* Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            <Button
              variant="contained"
              size="large"
              sx={{
                borderRadius: "30px",
                px: 4,
                py: 1.4,
                fontWeight: 700,
                textTransform: "none",
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                  transform: "translateY(-2px)",
                  transition: "all 0.3s ease",
                },
              }}
            >
              Book Now
            </Button>

            <Button
              variant="outlined"
              size="large"
              sx={{
                borderRadius: "30px",
                px: 4,
                py: 1.4,
                fontWeight: 700,
                textTransform: "none",
                color: theme.palette.common.white,
                borderColor: "rgba(255,255,255,0.7)",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.12)",
                  borderColor: theme.palette.common.white,
                },
              }}
            >
              View Services
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
};

export default HeroSection;
